import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// نفس إعدادات مشروع Firebase المستعملة في لوحة الإدارة
export const firebaseConfig = {
  apiKey: 'AIzaSyDnHp0Gy2e60deAjOOtZF1NRWhz_AAN304',
  authDomain: 'time-up-12d2a.firebaseapp.com',
  projectId: 'time-up-12d2a',
  storageBucket: 'time-up-12d2a.firebasestorage.app',
  messagingSenderId: '764058533164',
  appId: '1:764058533164:web:909a7146022e57086ac089',
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * حفظ الجلسة على الهاتف (مثل إنستغرام): المستخدم يسجّل الدخول مرة واحدة.
 *
 * getAuth() في نسخة React Native تستعمل ذاكرة مؤقتة فقط (inMemoryPersistence)،
 * فتضيع الجلسة عند إغلاق التطبيق. لذلك نستعمل initializeAuth مع
 * getReactNativePersistence(AsyncStorage) الموجودة في بناء React Native
 * (غير موجودة في تعريفات الويب، لذلك نصل إليها عبر FirebaseAuth.*).
 */
let authInstance;
try {
  if (typeof FirebaseAuth.getReactNativePersistence === 'function') {
    authInstance = FirebaseAuth.initializeAuth(app, {
      persistence: FirebaseAuth.getReactNativePersistence(AsyncStorage),
    });
  } else {
    authInstance = FirebaseAuth.getAuth(app);
  }
} catch (_error) {
  // initializeAuth تفشل لو استُدعيت مرتين (إعادة التحميل السريع) — نستعمل الموجودة
  authInstance = FirebaseAuth.getAuth(app);
}

export const auth = authInstance;

/**
 * Firestore: نفعّل الكشف التلقائي عن long polling لأن الاتصال المتدفّق
 * (streaming) لا يعمل بشكل موثوق داخل React Native / Expo Go.
 */
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch (error) {
  // initializeFirestore تفشل لو استُدعيت مرتين — نستعمل النسخة الموجودة
  const { getFirestore } = require('firebase/firestore');
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

/** اسم المستخدم يُحوَّل إلى بريد وهمي لأن Firebase Auth يتطلب بريداً */
export const USERNAME_DOMAIN = 'timeup.app';
export const usernameToEmail = (username) =>
  `${String(username || '').trim().toLowerCase()}@${USERNAME_DOMAIN}`;
