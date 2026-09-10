/**
 * العروض المتاحة الخاصة بكل مستخدم — محلية أولاً (SQLite).
 *
 * تُقرأ وتُكتب على الهاتف مباشرة حتى تعمل بدون إنترنت،
 * ويتكفّل syncEngine برفعها إلى users/{uid}/offers ومزامنتها.
 */
import { getDB } from './db';

const currentUserId = () => {
  try {
    // eslint-disable-next-line global-require
    const { auth } = require('../firebase');
    return auth?.currentUser?.uid || null;
  } catch (_e) {
    return null;
  }
};

const nowIso = () => new Date().toISOString();

const requestSync = () => {
  try {
    // eslint-disable-next-line global-require
    require('./syncEngine').scheduleSync();
  } catch (_e) {
    // المزامنة اختيارية — الكتابة المحلية نجحت
  }
};

/** قراءة عروض المستخدم الحالي (بدون المحذوفة) */
export const getUserOffers = (callback) => {
  const userId = currentUserId();
  getDB().transaction((tx) => {
    tx.executeSql(
      `SELECT * FROM offers
       WHERE deleted = 0 AND (user_id = ? OR user_id IS NULL)
       ORDER BY name;`,
      [userId],
      (_, { rows }) => callback(rows._array),
      (_, error) => {
        console.log('Error fetching offers', error);
        callback([], String(error?.message || error));
        return false;
      }
    );
  });
};

/** إضافة عرض جديد — يرفض التكرار (غير حسّاس لحالة الأحرف) */
export const addUserOffer = (name, color, callback) => {
  const cleanName = String(name || '').trim();
  if (!cleanName) {
    callback?.(null, 'EMPTY_NAME');
    return;
  }

  const userId = currentUserId();

  getDB().transaction((tx) => {
    tx.executeSql(
      `SELECT id FROM offers
       WHERE deleted = 0 AND LOWER(name) = LOWER(?) AND (user_id = ? OR user_id IS NULL)
       LIMIT 1;`,
      [cleanName, userId],
      (_, { rows }) => {
        if (rows._array.length > 0) {
          callback?.(null, 'DUPLICATE');
          return;
        }

        const timestamp = nowIso();
        tx.executeSql(
          `INSERT INTO offers (name, color, created_at, user_id, updated_at, dirty, deleted)
           VALUES (?, ?, ?, ?, ?, 1, 0);`,
          [cleanName, color || '', timestamp, userId, timestamp],
          (_2, { insertId }) => {
            requestSync();
            callback?.(insertId, null);
          },
          (_2, error) => {
            console.log('Error adding offer', error);
            callback?.(null, String(error?.message || error));
            return false;
          }
        );
      },
      (_, error) => {
        console.log('Error checking offer', error);
        callback?.(null, String(error?.message || error));
        return false;
      }
    );
  });
};

/** حذف عرض — حذف ناعم حتى يُحذف من السحابة أيضاً */
export const deleteUserOffer = (id, callback) => {
  getDB().transaction((tx) => {
    tx.executeSql(
      `UPDATE offers SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ?;`,
      [nowIso(), id],
      () => {
        requestSync();
        callback?.(true);
      },
      (_, error) => {
        console.log('Error deleting offer', error);
        callback?.(false);
        return false;
      }
    );
  });
};

/* ------------------------------------------------------------------ */
/* دوال المزامنة — يستعملها syncEngine فقط                              */
/* ------------------------------------------------------------------ */

export const getDirtyOffers = (callback) => {
  const userId = currentUserId();
  getDB().transaction((tx) => {
    tx.executeSql(
      `SELECT * FROM offers WHERE dirty = 1 AND (user_id = ? OR user_id IS NULL);`,
      [userId],
      (_, { rows }) => callback(rows._array),
      (_, error) => {
        console.log('Error reading dirty offers', error);
        callback([]);
        return false;
      }
    );
  });
};

export const markOfferSynced = (localId, remoteId, userId, callback) => {
  getDB().transaction((tx) => {
    tx.executeSql(
      `UPDATE offers SET dirty = 0, remote_id = ?, user_id = ? WHERE id = ?;`,
      [remoteId, userId, localId],
      () => callback?.(true),
      (_, error) => {
        console.log('Error marking offer synced', error);
        callback?.(false);
        return false;
      }
    );
  });
};

export const hardDeleteOffer = (localId, callback) => {
  getDB().transaction((tx) => {
    tx.executeSql(
      `DELETE FROM offers WHERE id = ?;`,
      [localId],
      () => callback?.(true),
      (_, error) => {
        console.log('Error hard deleting offer', error);
        callback?.(false);
        return false;
      }
    );
  });
};

export const upsertOfferFromRemote = (remote, userId, callback) => {
  getDB().transaction((tx) => {
    tx.executeSql(
      `SELECT id, dirty FROM offers WHERE remote_id = ? LIMIT 1;`,
      [remote.remote_id],
      (_, { rows }) => {
        const existing = rows._array[0];

        if (!existing) {
          // قد يكون نفس العرض أُضيف محلياً قبل المزامنة — نربطه بدل تكراره
          tx.executeSql(
            `SELECT id FROM offers
             WHERE remote_id IS NULL AND deleted = 0 AND LOWER(name) = LOWER(?)
               AND (user_id = ? OR user_id IS NULL)
             LIMIT 1;`,
            [remote.name, userId],
            (_2, matched) => {
              // النتيجة داخل rows._array — كان هنا matched._array فتفشل كل العروض القادمة من السحابة
              const localMatch = matched.rows._array[0];
              if (localMatch) {
                tx.executeSql(
                  `UPDATE offers SET remote_id = ?, user_id = ?, dirty = 0 WHERE id = ?;`,
                  [remote.remote_id, userId, localMatch.id],
                  () => callback?.(true),
                  () => { callback?.(false); return false; }
                );
                return;
              }

              tx.executeSql(
                `INSERT INTO offers (name, color, created_at, user_id, remote_id, updated_at, dirty, deleted)
                 VALUES (?, ?, ?, ?, ?, ?, 0, 0);`,
                [
                  remote.name,
                  remote.color || '',
                  remote.created_at || nowIso(),
                  userId,
                  remote.remote_id,
                  remote.updated_at || nowIso(),
                ],
                () => callback?.(true),
                (_3, error) => {
                  console.log('Error inserting remote offer', error);
                  callback?.(false);
                  return false;
                }
              );
            },
            () => { callback?.(false); return false; }
          );
          return;
        }

        // تعديل محلي لم يُرفع بعد له الأولوية
        if (existing.dirty === 1) {
          callback?.(false);
          return;
        }

        tx.executeSql(
          `UPDATE offers SET name = ?, color = ?, user_id = ?, updated_at = ?, dirty = 0, deleted = 0
           WHERE id = ?;`,
          [remote.name, remote.color || '', userId, remote.updated_at || nowIso(), existing.id],
          () => callback?.(true),
          (_2, error) => {
            console.log('Error updating offer from remote', error);
            callback?.(false);
            return false;
          }
        );
      },
      (_, error) => {
        console.log('Error checking remote offer', error);
        callback?.(false);
        return false;
      }
    );
  });
};

export const getKnownOfferRemoteIds = (callback) => {
  const userId = currentUserId();
  getDB().transaction((tx) => {
    tx.executeSql(
      `SELECT remote_id FROM offers
       WHERE remote_id IS NOT NULL AND dirty = 0 AND (user_id = ? OR user_id IS NULL);`,
      [userId],
      (_, { rows }) => callback(rows._array.map((r) => r.remote_id)),
      (_, error) => {
        console.log('Error reading offer remote ids', error);
        callback([]);
        return false;
      }
    );
  });
};

export const deleteLocalOfferByRemoteId = (remoteId, callback) => {
  getDB().transaction((tx) => {
    tx.executeSql(
      `DELETE FROM offers WHERE remote_id = ? AND dirty = 0;`,
      [remoteId],
      () => callback?.(true),
      (_, error) => {
        console.log('Error deleting local offer', error);
        callback?.(false);
        return false;
      }
    );
  });
};

export const clearLocalOffers = (callback) => {
  getDB().transaction((tx) => {
    tx.executeSql(
      `DELETE FROM offers;`,
      [],
      () => callback?.(true),
      (_, error) => {
        console.log('Error clearing offers', error);
        callback?.(false);
        return false;
      }
    );
  });
};
