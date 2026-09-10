/**
 * طبقة بيانات المشتركين على Firestore.
 *
 * تحافظ على نفس أسماء الدوال ونفس التوقيعات المستعملة سابقاً مع SQLite،
 * حتى لا تحتاج الشاشات لتغييرات تُذكر.
 *
 * مكان البيانات: users/{uid}/subscribers/{id}
 * كل مستخدم يرى مشتركيه فقط — هذا ما تفرضه قواعد الأمان أيضاً.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const currentUid = () => auth.currentUser?.uid || null;

const subscribersRef = () => {
  const uid = currentUid();
  if (!uid) throw new Error('NOT_SIGNED_IN');
  return collection(db, 'users', uid, 'subscribers');
};

/** حساب الحالة من تاريخ الانتهاء */
const calculateStatus = (startDateStr, endDateStr) => {
  const plainDateMatch = String(endDateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const end = plainDateMatch
    ? new Date(
        Number(plainDateMatch[1]),
        Number(plainDateMatch[2]) - 1,
        Number(plainDateMatch[3]),
        12,
        0,
        0,
        0
      )
    : new Date(endDateStr);
  const today = new Date();
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return 'Expired';
  if (daysLeft <= 7) return 'Expiring';
  return 'Active';
};

/** لا يوجد إنشاء جداول في Firestore — نبقيها للتوافق مع الشاشات */
export const initDatabase = () => Promise.resolve(true);

export const getAllSubscribers = async (callback) => {
  try {
    if (!currentUid()) {
      callback([]);
      return;
    }
    const snapshot = await getDocs(query(subscribersRef(), orderBy('created_at', 'desc')));
    const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(rows);
  } catch (error) {
    console.log('Error fetching subscribers', error);
    callback([]);
  }
};

export const addSubscriber = async (
  firstName,
  lastName,
  phone,
  address,
  startDate,
  endDate,
  price,
  offer,
  color,
  callback
) => {
  try {
    const created = await addDoc(subscribersRef(), {
      first_name: firstName,
      last_name: lastName,
      phone,
      address,
      start_date: startDate,
      end_date: endDate,
      price,
      offer: offer || '',
      color: color || '',
      status: calculateStatus(startDate, endDate),
      created_at: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
    callback?.(created.id);
  } catch (error) {
    console.log('Error adding subscriber', error);
    callback?.(null);
  }
};

export const updateSubscriber = async (
  id,
  firstName,
  lastName,
  phone,
  address,
  startDate,
  endDate,
  price,
  offer,
  color,
  callback
) => {
  try {
    const uid = currentUid();
    if (!uid) throw new Error('NOT_SIGNED_IN');
    await updateDoc(doc(db, 'users', uid, 'subscribers', String(id)), {
      first_name: firstName,
      last_name: lastName,
      phone,
      address,
      start_date: startDate,
      end_date: endDate,
      price,
      offer: offer || '',
      color: color || '',
      status: calculateStatus(startDate, endDate),
    });
    callback?.(true);
  } catch (error) {
    console.log('Error updating', error);
    callback?.(false);
  }
};

export const deleteSubscriber = async (id, callback) => {
  try {
    const uid = currentUid();
    if (!uid) throw new Error('NOT_SIGNED_IN');
    await deleteDoc(doc(db, 'users', uid, 'subscribers', String(id)));
    callback?.(true);
  } catch (error) {
    console.log('Error deleting', error);
    callback?.(false);
  }
};
