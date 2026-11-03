/**
 * إشعارات ويندوز لاشتراكات على وشك الانتهاء.
 * نفس أيام التذكير في تطبيق الهاتف: 3 و2 ويوم واحد ويوم الانتهاء.
 * نسجّل ما أُرسل حتى لا يتكرر نفس الإشعار في نفس اليوم.
 */
import { t } from './i18n';
import { daysLeftOf, SubscriberWithDays } from './subscribers';

export const REMINDER_DAYS = [3, 2, 1, 0];

const STORAGE_KEY = 'timeup-notified';

type SentLog = Record<string, string>;

const readLog = (): SentLog => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeLog = (log: SentLog) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // التخزين اختياري
  }
};

const todayKey = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

export const notifyExpiring = (rows: SubscriberWithDays[]) => {
  const api = window.desktop;
  if (!api?.notify || rows.length === 0) return;

  const log = readLog();
  const today = todayKey();
  let changed = false;

  rows.forEach((row) => {
    // نحسب الأيام من جديد حتى يعمل الفحص ولو بقي التطبيق مفتوحاً أياماً
    const daysLeft = daysLeftOf(row.end_date);
    if (!REMINDER_DAYS.includes(daysLeft)) return;

    const key = `${row.id}:${daysLeft}`;
    if (log[key] === today) return;

    const name = `${row.first_name} ${row.last_name}`.trim() || t('notify.someone');
    const offer = row.offer || t('common.subscription');

    api.notify({
      id: row.id,
      title: daysLeft === 0 ? t('notify.endsTodayTitle') : t('notify.endingSoonTitle'),
      body:
        daysLeft === 0
          ? t('notify.endsTodayBody', { name, offer })
          : daysLeft === 1
          ? t('notify.endsInOne', { name, offer })
          : t('notify.endsInDays', { name, offer, days: daysLeft }),
    });

    log[key] = today;
    changed = true;
  });

  if (changed) {
    // ننظّف سجلات الأيام السابقة حتى لا يكبر التخزين
    const cleaned: SentLog = {};
    Object.entries(log).forEach(([key, value]) => {
      if (value === today) cleaned[key] = value;
    });
    writeLog(cleaned);
  }
};
