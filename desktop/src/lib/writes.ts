/**
 * الكتابة إلى Firestore بنفس الصيغة التي يستعملها تطبيق الهاتف.
 *
 * مهم: لا ننتظر تأكيد الخادم. Firestore يحفظ محلياً فوراً (حتى بدون إنترنت)
 * ثم يرفع التغيير عند عودة الاتصال، فالوعد لا ينتهي إلا بعد وصول الخادم.
 * لذلك نطلق الكتابة ونكمل، ونسجّل أي خطأ في السجل.
 */
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { daysLeftOf } from './subscribers';

export interface SubscriberInput {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  start_date: string;
  end_date: string;
  price: string;
  offer: string;
  color: string;
}

/** نفس حساب الحالة في تطبيق الهاتف */
const statusText = (endDate: string) => {
  const daysLeft = daysLeftOf(endDate);
  if (daysLeft < 0) return 'Expired';
  if (daysLeft <= 7) return 'Expiring';
  return 'Active';
};

const nowIso = () => new Date().toISOString();

const subscribersRef = (uid: string) => collection(db, 'users', uid, 'subscribers');
const offersRef = (uid: string) => collection(db, 'users', uid, 'offers');

/** يُطلق العملية ويسجّل الخطأ إن حدث — الحفظ المحلي يكون قد تمّ */
const fireAndForget = (label: string, promise: Promise<unknown>) => {
  promise.catch((error) => console.log(`[write] ${label} failed:`, error?.message || error));
};

export const createSubscriber = (uid: string, input: SubscriberInput) => {
  const created = nowIso();
  fireAndForget(
    'create subscriber',
    addDoc(subscribersRef(uid), {
      ...input,
      status: statusText(input.end_date),
      created_at: created,
      updated_at: created,
    })
  );
};

export const saveSubscriber = (uid: string, id: string, input: SubscriberInput) => {
  fireAndForget(
    'update subscriber',
    updateDoc(doc(db, 'users', uid, 'subscribers', id), {
      ...input,
      status: statusText(input.end_date),
      updated_at: nowIso(),
    })
  );
};

/** حذف اشتراك واحد أو كل اشتراكات الشخص */
export const removeSubscribers = (uid: string, ids: string[]) => {
  ids.forEach((id) => {
    fireAndForget('delete subscriber', deleteDoc(doc(db, 'users', uid, 'subscribers', id)));
  });
};

export const createOffer = (uid: string, name: string, color: string) => {
  const created = nowIso();
  fireAndForget(
    'create offer',
    addDoc(offersRef(uid), {
      name: name.trim(),
      color,
      created_at: created,
      updated_at: created,
    })
  );
};

export const removeOffer = (uid: string, id: string) => {
  fireAndForget('delete offer', deleteDoc(doc(db, 'users', uid, 'offers', id)));
};

/** ملاحظة مجهولة — نفس مجموعة feedback التي يقرأها المشرف من لوحة الإدارة */
export const sendFeedback = (message: string, rating: number, appVersion: string) => {
  fireAndForget(
    'send feedback',
    addDoc(collection(db, 'feedback'), {
      message: message.trim(),
      rating: rating || null,
      platform: 'desktop',
      appVersion,
      read: false,
      // نفس نوع التاريخ المستعمل في الهاتف حتى يظهر صحيحاً في لوحة الإدارة
      createdAt: serverTimestamp(),
    })
  );
};
