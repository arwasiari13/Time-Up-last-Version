/**
 * محرّك المزامنة بين SQLite المحلية و Firestore.
 *
 * المبدأ: القاعدة المحلية هي المصدر الذي تقرأ منه الشاشات دائماً،
 * لذلك يعمل التطبيق بالكامل بدون إنترنت. عند توفّر الاتصال:
 *   1) نرفع كل السجلات المعلَّمة dirty
 *   2) ننزّل السجلات من السحابة وندمجها
 *
 * حسم التعارض: التعديل المحلي غير المرفوع له الأولوية،
 * وإلا فالنسخة السحابية هي الأحدث.
 */
import NetInfo from '@react-native-community/netinfo';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { auth, db as firestore } from '../firebase';
import {
  deleteLocalByRemoteId,
  getDirtySubscribers,
  getKnownRemoteIds,
  hardDeleteSubscriber,
  markSubscriberSynced,
  upsertFromRemote,
} from './db';
import {
  deleteLocalOfferByRemoteId,
  getDirtyOffers,
  getKnownOfferRemoteIds,
  hardDeleteOffer,
  markOfferSynced,
  upsertOfferFromRemote,
} from './offersDb';

let syncing = false;
let pendingSync = false;
let unsubscribeNetInfo = null;
const listeners = new Set();

/** يسمح للشاشات بمعرفة متى انتهت مزامنة لتعيد التحميل */
export const onSyncComplete = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notifyComplete = (changed) => {
  listeners.forEach((listener) => {
    try {
      listener(changed);
    } catch (_e) {
      // لا نُسقط المزامنة بسبب مستمع فاشل
    }
  });
};

const currentUid = () => auth.currentUser?.uid || null;

const subscribersRef = (uid) => collection(firestore, 'users', uid, 'subscribers');
const offersRef = (uid) => collection(firestore, 'users', uid, 'offers');

/** تحويل صف محلي إلى مستند سحابي */
const toRemoteDoc = (row) => ({
  first_name: row.first_name ?? '',
  last_name: row.last_name ?? '',
  phone: row.phone ?? '',
  address: row.address ?? '',
  start_date: row.start_date ?? '',
  end_date: row.end_date ?? '',
  price: row.price ?? '',
  offer: row.offer ?? '',
  color: row.color ?? '',
  status: row.status ?? '',
  created_at: row.created_at ?? new Date().toISOString(),
  updated_at: row.updated_at ?? new Date().toISOString(),
});

/* ------------------------- رفع التغييرات ------------------------- */

const pushChanges = async (uid) => {
  const rows = await new Promise((resolve) => getDirtySubscribers(resolve));
  if (rows.length === 0) return 0;

  let pushed = 0;

  for (const row of rows) {
    try {
      // 1) سجل محذوف
      if (row.deleted === 1) {
        if (row.remote_id) {
          // eslint-disable-next-line no-await-in-loop
          await deleteDoc(doc(firestore, 'users', uid, 'subscribers', row.remote_id));
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => hardDeleteSubscriber(row.id, resolve));
        pushed += 1;
        continue;
      }

      // 2) سجل جديد لم يُرفع بعد
      if (!row.remote_id) {
        // eslint-disable-next-line no-await-in-loop
        const created = await addDoc(subscribersRef(uid), toRemoteDoc(row));
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => markSubscriberSynced(row.id, created.id, uid, resolve));
        pushed += 1;
        continue;
      }

      // 3) سجل معدّل
      // eslint-disable-next-line no-await-in-loop
      await setDoc(
        doc(firestore, 'users', uid, 'subscribers', row.remote_id),
        toRemoteDoc(row)
      );
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => markSubscriberSynced(row.id, row.remote_id, uid, resolve));
      pushed += 1;
    } catch (error) {
      // نتجاهل هذا السجل ونكمل — يبقى dirty ليُعاد في المرة القادمة
      console.log('⚠️ Push failed for row', row.id, error?.message || error);
    }
  }

  return pushed;
};

/* ------------------------ تنزيل التغييرات ------------------------ */

const pullChanges = async (uid) => {
  const snapshot = await getDocs(subscribersRef(uid));
  const remoteIds = [];
  let applied = 0;

  for (const document of snapshot.docs) {
    const data = document.data();
    remoteIds.push(document.id);

    // eslint-disable-next-line no-await-in-loop
    const didApply = await new Promise((resolve) =>
      upsertFromRemote({ ...data, remote_id: document.id }, uid, resolve)
    );
    if (didApply) applied += 1;
  }

  // ما اختفى من السحابة (حُذف من جهاز آخر) نحذفه محلياً
  const knownIds = await new Promise((resolve) => getKnownRemoteIds(resolve));
  const remoteSet = new Set(remoteIds);

  for (const knownId of knownIds) {
    if (!remoteSet.has(knownId)) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => deleteLocalByRemoteId(knownId, resolve));
      applied += 1;
    }
  }

  return applied;
};

/* -------------------------- مزامنة العروض ------------------------- */

const toRemoteOffer = (row) => ({
  name: row.name ?? '',
  color: row.color ?? '',
  created_at: row.created_at ?? new Date().toISOString(),
  updated_at: row.updated_at ?? new Date().toISOString(),
});

const pushOffers = async (uid) => {
  const rows = await new Promise((resolve) => getDirtyOffers(resolve));
  if (rows.length === 0) return 0;

  let pushed = 0;

  for (const row of rows) {
    try {
      if (row.deleted === 1) {
        if (row.remote_id) {
          // eslint-disable-next-line no-await-in-loop
          await deleteDoc(doc(firestore, 'users', uid, 'offers', row.remote_id));
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => hardDeleteOffer(row.id, resolve));
        pushed += 1;
        continue;
      }

      if (!row.remote_id) {
        // eslint-disable-next-line no-await-in-loop
        const created = await addDoc(offersRef(uid), toRemoteOffer(row));
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => markOfferSynced(row.id, created.id, uid, resolve));
        pushed += 1;
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await setDoc(doc(firestore, 'users', uid, 'offers', row.remote_id), toRemoteOffer(row));
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => markOfferSynced(row.id, row.remote_id, uid, resolve));
      pushed += 1;
    } catch (error) {
      console.log('⚠️ Offer push failed for row', row.id, error?.message || error);
    }
  }

  return pushed;
};

const pullOffers = async (uid) => {
  const snapshot = await getDocs(offersRef(uid));
  const remoteIds = [];
  let applied = 0;

  for (const document of snapshot.docs) {
    remoteIds.push(document.id);
    // eslint-disable-next-line no-await-in-loop
    const didApply = await new Promise((resolve) =>
      upsertOfferFromRemote({ ...document.data(), remote_id: document.id }, uid, resolve)
    );
    if (didApply) applied += 1;
  }

  const knownIds = await new Promise((resolve) => getKnownOfferRemoteIds(resolve));
  const remoteSet = new Set(remoteIds);

  for (const knownId of knownIds) {
    if (!remoteSet.has(knownId)) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => deleteLocalOfferByRemoteId(knownId, resolve));
      applied += 1;
    }
  }

  return applied;
};

/* --------------------------- المزامنة --------------------------- */

/** هل يوجد اتصال فعلي بالإنترنت؟ */
export const isOnline = async () => {
  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch (_e) {
    return false;
  }
};

/**
 * تشغيل مزامنة كاملة. آمنة للاستدعاء المتكرر:
 * إذا كانت مزامنة جارية، نجدول واحدة بعدها بدل تشغيل اثنتين معاً.
 */
export const syncNow = async () => {
  const uid = currentUid();
  if (!uid) return { ok: false, reason: 'NOT_SIGNED_IN' };

  if (syncing) {
    pendingSync = true;
    return { ok: false, reason: 'ALREADY_RUNNING' };
  }

  if (!(await isOnline())) {
    return { ok: false, reason: 'OFFLINE' };
  }

  syncing = true;
  try {
    const pushed = (await pushChanges(uid)) + (await pushOffers(uid));
    const pulled = (await pullChanges(uid)) + (await pullOffers(uid));

    console.log(`🔄 Sync done — pushed ${pushed}, pulled ${pulled}`);
    notifyComplete(pushed + pulled > 0);
    return { ok: true, pushed, pulled };
  } catch (error) {
    console.log('❌ Sync failed:', error?.message || error);
    return { ok: false, reason: 'ERROR', error };
  } finally {
    syncing = false;
    if (pendingSync) {
      pendingSync = false;
      syncNow();
    }
  }
};

/** مزامنة مؤجّلة قليلاً — تُستدعى بعد كل كتابة محلية */
let scheduleTimer = null;
export const scheduleSync = () => {
  if (scheduleTimer) clearTimeout(scheduleTimer);
  scheduleTimer = setTimeout(() => {
    scheduleTimer = null;
    syncNow();
  }, 1200);
};

/** يبدأ المراقبة: مزامنة فور عودة الإنترنت */
export const startAutoSync = () => {
  if (unsubscribeNetInfo) return unsubscribeNetInfo;

  let wasOnline = true;

  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    // نزامن عند الانتقال من "غير متصل" إلى "متصل" فقط
    if (online && !wasOnline) {
      console.log('📶 Back online — syncing');
      syncNow();
    }
    wasOnline = online;
  });

  return unsubscribeNetInfo;
};

export const stopAutoSync = () => {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
};
