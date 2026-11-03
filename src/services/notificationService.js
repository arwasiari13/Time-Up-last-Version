// خدمة الإشعارات المحلية للتنبيه عن انتهاء الاشتراكات
// ملاحظة: نستخدم الإشعارات المحلية فقط
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import I18n from '../i18n';

// Lazy load expo-notifications to avoid crashing in Expo Go SDK 53+
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.log('⚠️ expo-notifications not available:', e.message);
}

const SUBSCRIPTIONS_CHANNEL_ID = 'subscriptions';

// إعداد كيفية عرض الإشعارات عندما يكون التطبيق مفتوحاً
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log('⚠️ Failed to set notification handler:', e.message);
  }
}

const parseDateStringAsLocalDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const plainDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (plainDateMatch) {
      const [, year, month, day] = plainDateMatch;
      const localDate = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const setNotificationHour = (date, hour = 9) => {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(hour, 0, 0, 0);
  return normalizedDate;
};

const getDaysLeftFromDate = (endDateValue) => {
  const endDate = parseDateStringAsLocalDate(endDateValue);
  if (!endDate) {
    return null;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const endDateStart = new Date(endDate);
  endDateStart.setHours(0, 0, 0, 0);

  return Math.round((endDateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
};

const ensureAndroidNotificationChannel = async () => {
  if (!Notifications || Platform.OS !== 'android') {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync(SUBSCRIPTIONS_CHANNEL_ID, {
      name: I18n.t('notifChannel'),
      importance: Notifications.AndroidImportance?.HIGH || 4,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: 'default',
    });
  } catch (e) {
    console.log('⚠️ Failed to create notification channel:', e.message);
  }
};

const buildNotificationTrigger = (date) => {
  if (!Notifications) return null;

  if (Platform.OS === 'android') {
    return {
      type: Notifications.SchedulableTriggerInputTypes?.DATE || 'date',
      date,
      channelId: SUBSCRIPTIONS_CHANNEL_ID,
    };
  }

  return date;
};

// دالة مساعدة لتنسيق التاريخ
const formatDate = (date) => {
  const locale = { ar: 'ar-DZ', fr: 'fr-FR' }[I18n.locale] || 'en-GB';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const sendImmediateStatusNotification = async (subscriberId, subscriberName, endDate, type) => {
  if (!Notifications) return null;

  const endDateTime = parseDateStringAsLocalDate(endDate);
  if (!endDateTime) return null;

  const contentByType = {
    expiring_soon: {
      title: I18n.t('notifEndingTitle'),
      body: I18n.t('notifEndingSoonBody', { name: subscriberName, date: formatDate(endDateTime) }),
    },
    expired: {
      title: I18n.t('notifEndedTitle'),
      body: I18n.t('notifEndedBody', { name: subscriberName }),
    },
  };

  const selected = contentByType[type];
  if (!selected) return null;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: selected.title,
        body: selected.body,
        data: { subscriberId, type },
        sound: true,
      },
      trigger: null,
    });
    return true;
  } catch (e) {
    console.log('⚠️ Failed to send immediate notification:', e.message);
    return null;
  }
};

// طلب إذن الإشعارات (للإشعارات المحلية فقط)
export const requestNotificationPermissions = async () => {
  if (!Notifications) {
    console.log('⚠️ Notifications module not available');
    return false;
  }

  if (Platform.OS === 'web') {
    console.log('⚠️ Notifications not supported on web');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Permission not granted for notifications');
      return false;
    }

    await ensureAndroidNotificationChannel();

    console.log('✅ Local notification permissions granted');
    return true;
  } catch (error) {
    console.log('⚠️ Error requesting permissions:', error);
    return false;
  }
};

// ساعة إرسال الإشعارات (9 صباحاً)
const NOTIFICATION_HOUR = 9;

// عدد الأيام قبل الانتهاء التي نُرسل فيها تنبيهاً
// 0 = يوم الانتهاء نفسه
export const REMINDER_DAYS = [3, 2, 1, 0];

/** نص التنبيه حسب عدد الأيام المتبقية */
const reminderContent = (daysBefore, subscriberName, endDateTime) => {
  if (daysBefore === 0) {
    return {
      title: I18n.t('notifEndedTitle'),
      body: I18n.t('notifEndedTodayBody', { name: subscriberName }),
    };
  }

  const dayWord =
    daysBefore === 1
      ? I18n.t('notifTomorrow')
      : daysBefore === 2
      ? I18n.t('notifIn2Days')
      : I18n.t('notifInDays', { count: daysBefore });

  return {
    title: I18n.t('notifEndingTitle'),
    body: I18n.t('notifEndsInBody', { name: subscriberName, when: dayWord, date: formatDate(endDateTime) }),
  };
};

/**
 * جدولة تنبيه قبل انتهاء الاشتراك بعدد أيام محدّد.
 * إذا كان الموعد قد مضى، لا نجدول شيئاً.
 */
export const scheduleReminderNotification = async (
  subscriberId,
  subscriberName,
  endDate,
  daysBefore
) => {
  if (!Notifications) return null;

  try {
    const endDateTime = parseDateStringAsLocalDate(endDate);
    if (!endDateTime) {
      console.log(`⚠️ Invalid end date for ${subscriberName}:`, endDate);
      return null;
    }

    const reminderDate = new Date(endDateTime);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    const reminderAtHour = setNotificationHour(reminderDate, NOTIFICATION_HOUR);

    // لا نجدول موعداً في الماضي
    if (reminderAtHour <= new Date()) {
      console.log(`⏭️ ${daysBefore}-day reminder already passed for ${subscriberName}`);
      return null;
    }

    await ensureAndroidNotificationChannel();

    const { title, body } = reminderContent(daysBefore, subscriberName, endDateTime);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { subscriberId, type: daysBefore === 0 ? 'expired' : `reminder_${daysBefore}d` },
        sound: true,
      },
      trigger: buildNotificationTrigger(reminderAtHour),
    });

    console.log(`📅 Scheduled ${daysBefore}-day reminder for ${subscriberName}: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.log(`❌ Error scheduling ${daysBefore}-day reminder:`, error);
    return null;
  }
};

const NOTIFICATION_REGISTRY_KEY = 'ishtiraki_subscriber_notifications';

const readNotificationRegistry = async () => {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.log('⚠️ Error reading notification registry', error);
    return {};
  }
};

const writeNotificationRegistry = async (registry) => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_REGISTRY_KEY, JSON.stringify(registry));
  } catch (error) {
    console.log('⚠️ Error writing notification registry', error);
  }
};

const getSubscriberNotificationIds = async (subscriberId) => {
  const registry = await readNotificationRegistry();
  return registry?.[String(subscriberId)] || null;
};

const saveSubscriberNotificationIds = async (subscriberId, notificationIds) => {
  const registry = await readNotificationRegistry();
  registry[String(subscriberId)] = notificationIds;
  await writeNotificationRegistry(registry);
};

const removeSubscriberNotificationIds = async (subscriberId) => {
  const registry = await readNotificationRegistry();
  if (registry?.[String(subscriberId)]) {
    delete registry[String(subscriberId)];
    await writeNotificationRegistry(registry);
  }
};

const clearNotificationRegistry = async () => {
  try {
    await AsyncStorage.removeItem(NOTIFICATION_REGISTRY_KEY);
  } catch (error) {
    console.log('⚠️ Error clearing notification registry', error);
  }
};

// إلغاء إشعارات مشترك معين (عند الحذف أو التعديل)
export const cancelSubscriberNotifications = async (notificationIds) => {
  if (!Notifications) return;

  try {
    // نلغي كل المعرّفات المحفوظة أياً كانت أسماؤها، حتى تُلغى أيضاً
    // الإشعارات القديمة (weekBeforeId / expiryId) من الإصدار السابق.
    const ids = Object.values(notificationIds || {}).filter(
      (value) => typeof value === 'string' && value.length > 0
    );

    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    console.log(`✅ Cancelled ${ids.length} subscriber notifications`);
  } catch (error) {
    console.log('❌ Error cancelling notifications:', error);
  }
};

export const cancelSubscriberNotificationsById = async (subscriberId) => {
  const notificationIds = await getSubscriberNotificationIds(subscriberId);
  if (!notificationIds) {
    return;
  }
  await cancelSubscriberNotifications(notificationIds);
  await removeSubscriberNotificationIds(subscriberId);
};

// إلغاء جميع الإشعارات المجدولة
export const cancelAllNotifications = async () => {
  if (!Notifications) {
    await clearNotificationRegistry();
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await clearNotificationRegistry();
    console.log('✅ All notifications cancelled');
  } catch (error) {
    console.log('❌ Error cancelling all notifications:', error);
  }
};

// الحصول على جميع الإشعارات المجدولة
export const getAllScheduledNotifications = async () => {
  if (!Notifications) return [];

  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📋 ${notifications.length} notifications scheduled`);
    return notifications;
  } catch (error) {
    console.log('❌ Error getting scheduled notifications:', error);
    return [];
  }
};

// جدولة كل الإشعارات لمشترك جديد
export const scheduleSubscriberNotifications = async (
  subscriberId,
  firstName,
  lastName,
  endDate,
  options = { emitImmediateNotification: true }
) => {
  const subscriberName = `${firstName} ${lastName}`;

  await cancelSubscriberNotificationsById(subscriberId);

  const daysLeft = getDaysLeftFromDate(endDate);
  if (daysLeft === null) return { reminderIds: [] };

  if (daysLeft < 0) {
    if (options.emitImmediateNotification) {
      await sendImmediateStatusNotification(subscriberId, subscriberName, endDate, 'expired');
    }
    return { reminderIds: [] };
  }

  if (daysLeft <= REMINDER_DAYS[0] && options.emitImmediateNotification) {
    await sendImmediateStatusNotification(subscriberId, subscriberName, endDate, 'expiring_soon');
  }

  // تنبيه قبل 3 أيام وقبل يوم واحد
  const scheduledIds = {};
  const reminderIds = [];

  for (const daysBefore of REMINDER_DAYS) {
    // eslint-disable-next-line no-await-in-loop
    const id = await scheduleReminderNotification(
      subscriberId,
      subscriberName,
      endDate,
      daysBefore
    );
    if (id) {
      scheduledIds[`reminder${daysBefore}dId`] = id;
      reminderIds.push(id);
    }
  }

  if (reminderIds.length > 0) {
    await saveSubscriberNotificationIds(subscriberId, scheduledIds);
  } else {
    await removeSubscriberNotificationIds(subscriberId);
  }

  return { reminderIds };
};

// أقصى عدد أيام مقدماً نجدول لها — يُعاد الجدولة عند كل فتح للتطبيق
const SCHEDULING_WINDOW_DAYS = 30;

// فحص المشتركين وإعادة جدولة الإشعارات (يُستخدم عند فتح التطبيق)
export const checkAndScheduleNotifications = async (subscribers) => {
  console.log('🔄 Checking and scheduling notifications for all subscribers...');

  // إلغاء الإشعارات القديمة أولاً
  await cancelAllNotifications();

  let scheduledCount = 0;

  for (const subscriber of subscribers) {
    const daysLeft = getDaysLeftFromDate(subscriber.end_date);
    if (daysLeft === null) {
      console.log('⚠️ Invalid subscriber end date:', subscriber?.id, subscriber?.end_date);
      continue;
    }

    // نجدول فقط للمشتركين القريبين من الانتهاء.
    // iOS يسمح بـ64 إشعاراً معلّقاً فقط، لذلك لا نجدول لكل المشتركين.
    if (daysLeft >= 0 && daysLeft <= SCHEDULING_WINDOW_DAYS) {
      await scheduleSubscriberNotifications(
        subscriber.id,
        subscriber.first_name,
        subscriber.last_name,
        subscriber.end_date,
        { emitImmediateNotification: false }
      );
      scheduledCount++;
    }
  }

  console.log(`✅ Scheduled notifications for ${scheduledCount} active subscribers`);
};

// إرسال إشعار فوري للاختبار
export const sendTestNotification = async () => {
  if (!Notifications) {
    console.log('❌ Notifications module not available');
    return false;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('❌ Cannot send test notification without permissions');
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: I18n.t('notifTestTitle'),
        body: I18n.t('notifTestBody'),
        sound: true,
      },
      trigger: null,
    });
    console.log('✅ Test notification sent');
    return true;
  } catch (error) {
    console.log('❌ Error sending test notification:', error);
    return false;
  }
};
