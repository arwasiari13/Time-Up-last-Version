import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { getAllSubscribers, initDatabase } from '../src/database/db';
import { startAutoSync, stopAutoSync, syncNow } from '../src/database/syncEngine';
import { loadLocale } from '../src/i18n';
import {
    checkAndScheduleNotifications,
    requestNotificationPermissions
} from '../src/services/notificationService';
import './../global.css';

// Lazy load expo-notifications to avoid Expo Go SDK 53+ crash
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.log('⚠️ expo-notifications not available in _layout');
}

const Loading = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

/**
 * بوابة الحماية: تعرض صفحة تسجيل الدخول أولاً،
 * ولا تسمح بالوصول للتطبيق إلا بعد تسجيل الدخول.
 */
function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const onLoginPage = segments[0] === 'login';

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !onLoginPage) {
      router.replace('/login');
    } else if (isAuthenticated && onLoginPage) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, onLoginPage, router]);

  // بعد تسجيل الدخول: مزامنة أولى + مراقبة عودة الإنترنت
  useEffect(() => {
    if (!isAuthenticated) {
      stopAutoSync();
      return;
    }

    syncNow();
    startAutoSync();

    return () => stopAutoSync();
  }, [isAuthenticated]);

  // الإشعارات تُجدول بعد تسجيل الدخول اعتماداً على البيانات المحلية
  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) return;
      getAllSubscribers((subscribers: any[]) => {
        checkAndScheduleNotifications(subscribers);
      });
    })();
  }, [isAuthenticated]);

  // تجنّب ظهور لمحة من لوحة التحكم قبل إعادة التوجيه
  if (isLoading || (!isAuthenticated && !onLoginPage)) {
    return <Loading />;
  }

  return <Slot />;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // تهيئة قاعدة البيانات
      await initDatabase();
      await loadLocale();

      setReady(true);
    })();
  }, []);

  // الاستماع للإشعارات المستلمة عندما يكون التطبيق مفتوحاً
  useEffect(() => {
    if (!Notifications) return;

    let notificationListener: any;
    let responseListener: any;

    try {
      notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
        console.log('📬 Notification received:', notification);
      });

      responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        console.log('👆 Notification tapped:', response);
        // يمكنك هنا التنقل لصفحة معينة عند الضغط على الإشعار
      });
    } catch (e) {
      console.log('⚠️ Failed to add notification listeners:', e);
    }

    return () => {
      try {
        notificationListener?.remove();
        responseListener?.remove();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Loading />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
