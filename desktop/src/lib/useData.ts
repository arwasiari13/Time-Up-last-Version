import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { daysLeftOf, Subscriber, SubscriberWithDays } from './subscribers';

export interface SavedOffer {
  id: string;
  name: string;
  color: string;
}

/** اشتراكات المستخدم — قراءة حيّة واحدة تشترك فيها كل الصفحات */
export const useSubscribers = (uid: string) => {
  const [rows, setRows] = useState<SubscriberWithDays[] | null>(null);
  const [error, setError] = useState('');
  // true = البيانات من الذاكرة المحلية (بدون إنترنت أو قبل وصول التحديث)
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    setRows(null);
    return onSnapshot(
      collection(db, 'users', uid, 'subscribers'),
      (snap) => {
        setError('');
        setFromCache(snap.metadata.fromCache);
        const list = snap.docs.map((document) => {
          const data = document.data() as Omit<Subscriber, 'id'>;
          return { ...data, id: document.id, daysLeft: daysLeftOf(data.end_date) };
        });
        // الأحدث أولاً
        list.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        setRows(list);
      },
      (err) => {
        setError(err.message);
        setRows([]);
      }
    );
  }, [uid]);

  return { rows, error, fromCache, loading: rows === null };
};

/** العروض المحفوظة (من إعدادات التطبيق) — تُستعمل في أزرار الفلترة */
export const useSavedOffers = (uid: string) => {
  const [offers, setOffers] = useState<SavedOffer[]>([]);

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'users', uid, 'offers'),
        (snap) => {
          setOffers(
            snap.docs.map((document) => {
              const data = document.data() as any;
              return { id: document.id, name: data.name || '', color: data.color || '' };
            })
          );
        },
        () => setOffers([])
      ),
    [uid]
  );

  return offers;
};
