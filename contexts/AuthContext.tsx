import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { claimOrphanRows } from '../src/database/db';
import { cancelAllNotifications } from '../src/services/notificationService';
import { syncNow } from '../src/database/syncEngine';
import { auth, db, usernameToEmail } from '../src/firebase';

export interface AuthUser {
  uid: string;
  username: string;
  fullName: string;
  phone?: string;
  wilaya?: string;
}

export interface AuthContextProps {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** true بينما يتم التحقق من الجلسة المحفوظة عند فتح التطبيق */
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

/** نسخة محلية من ملف المستخدم، حتى يبقى مسجّلاً عند فتح التطبيق بدون إنترنت */
const PROFILE_CACHE_KEY = 'auth_profile_cache';

const saveCachedProfile = async (profile: AuthUser) => {
  try {
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch (_e) {
    // التخزين المؤقت اختياري
  }
};

const readCachedProfile = async (uid: string): Promise<AuthUser | null> => {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as AuthUser;
    // لا نستعمل نسخة تخص حساباً آخر
    return cached?.uid === uid ? cached : null;
  } catch (_e) {
    return null;
  }
};

const clearCachedProfile = async () => {
  try {
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
  } catch (_e) {
    // لا شيء
  }
};

/** يرفض بعد مدة، حتى لا تبقى شاشة التحميل عالقة بدون إنترنت */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

/** نتيجة قراءة الملف: "موقوف" تختلف عن "تعذّر الوصول للشبكة" */
type ProfileResult = { status: 'ok'; profile: AuthUser } | { status: 'blocked' };

/** يحوّل أخطاء Firebase إلى رموز نتعامل معها في شاشة الدخول */
const toAuthError = (code?: string) => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'INVALID_CREDENTIALS';
    case 'auth/too-many-requests':
      return 'TOO_MANY_ATTEMPTS';
    case 'auth/network-request-failed':
      return 'NETWORK';
    case 'auth/user-disabled':
      return 'DISABLED';
    default:
      return 'UNKNOWN';
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * يقرأ ملف المستخدم من Firestore.
   * - 'blocked': الحساب معطّل أو محذوف من لوحة الإدارة → يجب إخراجه
   * - يرمي خطأ: مشكلة شبكة → لا نخرجه، نستعمل النسخة المحفوظة
   */
  const loadProfile = async (firebaseUser: FirebaseUser): Promise<ProfileResult> => {
    const snapshot = await withTimeout(getDoc(doc(db, 'users', firebaseUser.uid)), 8000);
    if (!snapshot.exists()) return { status: 'blocked' };

    const data = snapshot.data() as any;
    if (data.active === false) return { status: 'blocked' };

    return {
      status: 'ok',
      profile: {
        uid: firebaseUser.uid,
        username: data.username || '',
        fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        phone: data.phone,
        wilaya: data.wilaya,
      },
    };
  };

  // استعادة الجلسة المحفوظة عند بدء التطبيق — بدون طلب كلمة المرور مجدداً
  useEffect(
    () =>
      onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (!firebaseUser) {
            setUser(null);
            return;
          }

          // نعرض التطبيق فوراً من النسخة المحفوظة إن وُجدت
          const cached = await readCachedProfile(firebaseUser.uid);
          if (cached) {
            setUser(cached);
            setIsLoading(false);
          }

          try {
            const result = await loadProfile(firebaseUser);
            if (result.status === 'blocked') {
              // موقوف من لوحة الإدارة — هنا فقط نُخرجه
              await clearCachedProfile();
              await firebaseSignOut(auth);
              setUser(null);
              return;
            }
            setUser(result.profile);
            await saveCachedProfile(result.profile);
          } catch (networkError) {
            // لا إنترنت: يبقى مسجّلاً بالنسخة المحفوظة
            console.log('Profile refresh skipped (offline?):', networkError);
            if (!cached) {
              // لا توجد نسخة محفوظة — نُبقيه مسجّلاً ببيانات أساسية
              const username = (firebaseUser.email || '').split('@')[0];
              setUser({ uid: firebaseUser.uid, username, fullName: username });
            }
          }
        } finally {
          setIsLoading(false);
        }
      }),
    []
  );

  const signIn = async (username: string, password: string) => {
    if (!username.trim() || !password.trim()) {
      throw new Error('EMPTY_FIELDS');
    }

    let credential;
    try {
      credential = await signInWithEmailAndPassword(
        auth,
        usernameToEmail(username),
        password.trim()
      );
    } catch (error: any) {
      throw new Error(toAuthError(error?.code));
    }

    // التحقق من ملف المستخدم — الحساب قد يكون معطّلاً من لوحة الإدارة
    let result: ProfileResult;
    try {
      result = await loadProfile(credential.user);
    } catch (_e) {
      await firebaseSignOut(auth);
      throw new Error('NETWORK');
    }

    if (result.status === 'blocked') {
      await firebaseSignOut(auth);
      throw new Error('DISABLED');
    }

    await saveCachedProfile(result.profile);
    setUser(result.profile);
  };

  const signOut = async () => {
    // نحاول رفع ما لم يُرفع قبل الخروج، حتى لا تضيع تعديلات محلية
    try {
      await syncNow();
    } catch (_e) {
      // لا نمنع الخروج بسبب فشل المزامنة
    }

    // لا نمسح البيانات المحلية: كل سجل (مشترك أو عرض) مربوط بصاحبه، فلا يراه حساب آخر،
    // ويجده صاحبه عند عودته حتى بدون إنترنت، ولا تضيع التعديلات التي لم تُرفع بعد.
    const uid = auth.currentUser?.uid;
    await new Promise((resolve) => claimOrphanRows(uid, resolve));

    // تذكيرات هذا الحساب لا يجب أن تصل لحساب آخر على نفس الهاتف
    try {
      await cancelAllNotifications();
    } catch (_e) {
      // الإشعارات اختيارية
    }

    await clearCachedProfile();

    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: user !== null, isLoading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
