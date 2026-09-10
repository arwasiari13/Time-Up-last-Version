// Database connection and utility functions for SQLite (Expo)
// تأخير استيراد الوحدة الأصلية إلى وقت التشغيل لتجنّب محاولة تحميل
// الـ native module أثناء تحليل المسارات (Expo Router / Metro)

import { Platform } from 'react-native';

let dbInstance = null;

const createModernSQLiteAdapter = (nativeDb) => {
	const createTx = () => ({
		executeSql: (sql, params = [], success = () => {}, error = () => {}) => {
			try {
				const sqlText = String(sql || '').trim();
				if (/^SELECT\b/i.test(sqlText)) {
					const rowsArray = nativeDb.getAllSync(sqlText, params);
					success(null, { rows: { _array: rowsArray } });
					return true;
				}

				const runResult = nativeDb.runSync(sqlText, params);
				success(null, {
					insertId: runResult?.lastInsertRowId,
					rowsAffected: runResult?.changes ?? 0,
				});
				return true;
			} catch (err) {
				try { error(null, err); } catch (_e) {}
				return false;
			}
		},
	});

	return {
		transaction: (cb) => {
			const tx = createTx();
			cb(tx);
		},
	};
};

export const getDB = () => {
	if (!dbInstance) {
		// Check if we're on web platform first to avoid WASM loading issues
		if (Platform.OS === 'web') {
			// Use localStorage fallback for web
			dbInstance = createWebFallbackDB();
		} else {
			// نستخدم require هنا بدلاً من import علوي لتجنّب مشاكل أثناء التحزيم
			let sqlite = null;
			try {
				sqlite = require('expo-sqlite');
			} catch (_e) {
				sqlite = null;
			}

			if (!sqlite) {
				throw new Error('expo-sqlite is not available on native platform');
			}

			// expo-sqlite v16+ (Expo SDK 54): modern API
			if (typeof sqlite.openDatabaseSync === 'function') {
				const nativeDb = sqlite.openDatabaseSync('timeup.db');
				dbInstance = createModernSQLiteAdapter(nativeDb);
			} else if (typeof sqlite.openDatabase === 'function') {
				// Backward compatibility (legacy API)
				dbInstance = sqlite.openDatabase('timeup.db');
			} else {
				throw new Error('No compatible SQLite openDatabase API found on native platform');
			}
		}
	}
	return dbInstance;
};

const createWebFallbackDB = () => {
	// Fallback for web: provide a very small in-memory/localStorage backed shim
	const STORAGE_KEY = 'timeup_db_v1';

	const load = () => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw) : { tables: {}, meta: {} };
		} catch (_e) {
			return { tables: {}, meta: {} };
		}
	};
	
	const save = (state) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (_e) {
			// ignore quota errors
		}
	};

	const state = load();

	const shimTx = {
		executeSql: (sql, params = [], success = () => {}, error = () => {}) => {
			try {
				const s = sql.trim();

				// CREATE TABLE IF NOT EXISTS name (...)
				const createMatch = s.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([`"]?)([a-zA-Z0-9_]+)\1/i);
				if (createMatch) {
					const table = createMatch[2];
					if (!state.tables[table]) {
						state.tables[table] = [];
						state.meta[table] = { autoIncrement: 1 };
						save(state);
					}
					success(null, {});
					return true;
				}

				// INSERT INTO table (col,...) VALUES (?,...)
				const insertMatch = s.match(/INSERT\s+INTO\s+([`"]?)([a-zA-Z0-9_]+)\1\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
				if (insertMatch) {
					const table = insertMatch[2];
					const cols = insertMatch[3].split(',').map(c => c.trim().replace(/[`"]/g, ''));
					const row = {};
					cols.forEach((c, i) => {
						row[c] = params[i];
					});
					if (!state.tables[table]) {
						state.tables[table] = [];
						state.meta[table] = { autoIncrement: 1 };
					}
					const id = state.meta[table].autoIncrement++;
					row.id = id;
					state.tables[table].push(row);
					save(state);
					success(null, { insertId: id });
					return true;
				}

				// SELECT * FROM table ORDER BY col DESC/ASC
				const selectMatch = s.match(/SELECT\s+\*\s+FROM\s+([`"]?)([a-zA-Z0-9_]+)\1(?:\s+ORDER\s+BY\s+([a-zA-Z0-9_]+)\s*(DESC|ASC)?)?/i);
				if (selectMatch) {
					const table = selectMatch[2];
					const orderBy = selectMatch[3];
					const dir = (selectMatch[4] || 'ASC').toUpperCase();
					const rows = (state.tables[table] || []).slice();
					if (orderBy) {
						rows.sort((a, b) => {
							if (a[orderBy] < b[orderBy]) return dir === 'DESC' ? 1 : -1;
							if (a[orderBy] > b[orderBy]) return dir === 'DESC' ? -1 : 1;
							return 0;
						});
					}
					success(null, { rows: { _array: rows } });
					return true;
				}

				// UPDATE table SET ... WHERE id=?
				const updateMatch = s.match(/UPDATE\s+([`"]?)([a-zA-Z0-9_]+)\1\s+SET\s+(.+)\s+WHERE\s+id\s*=\s*\?/i);
				if (updateMatch) {
					const table = updateMatch[2];
					const setClause = updateMatch[3];
					// parse set clause like col1=?, col2=?
					const assignments = setClause.split(',').map(p => p.trim());
					const rows = state.tables[table] || [];
					const id = params[params.length - 1];
					const row = rows.find(r => r.id === Number(id));
					if (row) {
						assignments.forEach((a, i) => {
							const col = a.split('=')[0].trim();
							row[col] = params[i];
						});
						save(state);
						success(null, {});
						return true;
					}
					success(null, {});
					return true;
				}

				// DELETE FROM table WHERE id=?
				const deleteMatch = s.match(/DELETE\s+FROM\s+([`"]?)([a-zA-Z0-9_]+)\1\s+WHERE\s+id\s*=\s*\?/i);
				if (deleteMatch) {
					const table = deleteMatch[2];
					const id = params[0];
					const rows = state.tables[table] || [];
					const idx = rows.findIndex(r => r.id === Number(id));
					if (idx >= 0) {
						rows.splice(idx, 1);
						save(state);
					}
					success(null, {});
					return true;
				}

				// Fallback: no-op success
				success(null, {});
				return true;
			} catch (err) {
				try { error(null, err); } catch (_e) {}
				return false;
			}
		}
	};

	return {
		transaction: (cb) => {
			try {
				cb(shimTx);
			} catch (_e) {
				// ignore
			}
		}
	};
};

/**
 * يضيف الأعمدة الجديدة للجداول القديمة.
 * إذا كان العمود موجوداً مسبقاً يفشل ALTER TABLE — وهذا متوقّع ونتجاهله.
 */
const migrateAddColumns = (done) => {
	// الأعمدة الجديدة + أعمدة المزامنة
	const columns = [
		{ name: 'offer', type: 'TEXT' },
		{ name: 'color', type: 'TEXT' },
		// معرّف المستند في Firestore (فارغ = لم يُرفع بعد)
		{ name: 'remote_id', type: 'TEXT' },
		// صاحب السجل، حتى لا تختلط بيانات حسابين على نفس الهاتف
		{ name: 'user_id', type: 'TEXT' },
		// آخر تعديل محلي — يُستعمل لحسم التعارض
		{ name: 'updated_at', type: 'TEXT' },
		// 1 = يحتاج رفعاً إلى السحابة
		{ name: 'dirty', type: 'INTEGER DEFAULT 1' },
		// 1 = محذوف محلياً وينتظر الحذف من السحابة (tombstone)
		{ name: 'deleted', type: 'INTEGER DEFAULT 0' },
	];
	let remaining = columns.length;

	const finish = () => {
		remaining -= 1;
		if (remaining <= 0) done();
	};

	columns.forEach((column) => {
		try {
			getDB().transaction(tx => {
				tx.executeSql(
					`ALTER TABLE subscribers ADD COLUMN ${column.name} ${column.type};`,
					[],
					() => finish(),
					() => {
						// العمود موجود مسبقاً — لا مشكلة
						finish();
						return false;
					}
				);
			});
		} catch (_e) {
			finish();
		}
	});
};

// إنشاء الجدول إذا لم يكن موجوداً (يتم في بداية التطبيق)
export const initDatabase = () => {
	return new Promise((resolve, reject) => {
		try {
			getDB().transaction(tx => {
				tx.executeSql(
					`CREATE TABLE IF NOT EXISTS subscribers (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						first_name TEXT,
						last_name TEXT,
						phone TEXT,
						address TEXT,
						start_date TEXT,
						end_date TEXT,
						price TEXT,
						offer TEXT,
						color TEXT,
						status TEXT,
						created_at TEXT
					);`,
					[],
					() => {
						// جدول العروض المتاحة — محلي أيضاً حتى يعمل بدون إنترنت
						getDB().transaction(tx2 => {
							tx2.executeSql(
								`CREATE TABLE IF NOT EXISTS offers (
									id INTEGER PRIMARY KEY AUTOINCREMENT,
									name TEXT,
									color TEXT,
									created_at TEXT,
									user_id TEXT,
									remote_id TEXT,
									updated_at TEXT,
									dirty INTEGER DEFAULT 1,
									deleted INTEGER DEFAULT 0
								);`,
								[],
								() => {
									// ترحيل قواعد البيانات القديمة: إضافة الأعمدة الجديدة إن لم تكن موجودة.
									// ALTER TABLE يفشل إذا كان العمود موجوداً، ولذلك نتجاهل الخطأ.
									migrateAddColumns(() => {
										console.log('✅ Database initialized - Tables ready');
										resolve(true);
									});
								},
								(_, error) => {
									console.log('❌ Error creating offers table', error);
									// لا نُفشل التهيئة كلها بسبب جدول العروض
									migrateAddColumns(() => resolve(true));
									return false;
								}
							);
						});
					},
					(_, error) => {
						console.log('❌ Error creating table', error);
						reject(error);
						return false;
					}
				);
			});
		} catch (error) {
			console.log('❌ Database initialization error:', error);
			reject(error);
		}
	});
};

/**
 * المستخدم الحالي — كل السجلات مرتبطة به حتى لا تختلط بيانات
 * حسابين على نفس الهاتف.
 */
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

/** يطلب مزامنة بعد أي كتابة محلية (require كسول لتفادي الاستيراد الدائري) */
const requestSync = () => {
	try {
		// eslint-disable-next-line global-require
		require('./syncEngine').scheduleSync();
	} catch (_e) {
		// المزامنة اختيارية — الكتابة المحلية نجحت على أي حال
	}
};

// دالة إضافة مشترك جديد — تُكتب محلياً أولاً وتُعلَّم للرفع
export const addSubscriber = (firstName, lastName, phone, address, startDate, endDate, price, offer, color, callback) => {
	const status = calculateStatus(startDate, endDate);
	const createdAt = nowIso();
	const userId = currentUserId();

	getDB().transaction(tx => {
		tx.executeSql(
			`INSERT INTO subscribers (first_name, last_name, phone, address, start_date, end_date, price, offer, color, status, created_at, user_id, updated_at, dirty, deleted)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0);`,
			[firstName, lastName, phone, address, startDate, endDate, price, offer || '', color || '', status, createdAt, userId, createdAt],
			(_, { insertId }) => { requestSync(); callback?.(insertId); },
			(_, error) => {
				console.log('Error adding subscriber', error);
				callback?.(null);
			}
		);
	});
};

// قراءة مشتركي المستخدم الحالي (بدون المحذوفين)
export const getAllSubscribers = (callback) => {
	const userId = currentUserId();
	getDB().transaction(tx => {
		tx.executeSql(
			`SELECT * FROM subscribers
			 WHERE deleted = 0 AND (user_id = ? OR user_id IS NULL)
			 ORDER BY created_at DESC;`,
			[userId],
			(_, { rows }) => callback(rows._array),
			(_, error) => {
				console.log('Error fetching subscribers', error);
				callback([]);
			}
		);
	});
};

// تحديث مشترك — يُعلَّم للرفع
export const updateSubscriber = (id, firstName, lastName, phone, address, startDate, endDate, price, offer, color, callback) => {
	const status = calculateStatus(startDate, endDate);
	getDB().transaction(tx => {
		tx.executeSql(
			`UPDATE subscribers
			 SET first_name=?, last_name=?, phone=?, address=?, start_date=?, end_date=?, price=?, offer=?, color=?, status=?, updated_at=?, dirty=1
			 WHERE id=?;`,
			[firstName, lastName, phone, address, startDate, endDate, price, offer || '', color || '', status, nowIso(), id],
			() => { requestSync(); callback?.(true); },
			(_, error) => {
				console.log('Error updating', error);
				callback?.(false);
			}
		);
	});
};

/**
 * حذف مشترك — حذف "ناعم".
 * نبقي السجل معلّماً كمحذوف حتى تُنفَّذ عملية الحذف في السحابة أيضاً،
 * وإلا سيعيدها التزامن القادم.
 */
export const deleteSubscriber = (id, callback) => {
	getDB().transaction(tx => {
		tx.executeSql(
			`UPDATE subscribers SET deleted=1, dirty=1, updated_at=? WHERE id=?;`,
			[nowIso(), id],
			() => { requestSync(); callback?.(true); },
			(_, error) => {
				console.log('Error deleting', error);
				callback?.(false);
			}
		);
	});
};

/* ------------------------------------------------------------------ */
/* دوال المزامنة — يستعملها syncEngine فقط                              */
/* ------------------------------------------------------------------ */

/** السجلات التي تنتظر الرفع */
export const getDirtySubscribers = (callback) => {
	const userId = currentUserId();
	getDB().transaction(tx => {
		tx.executeSql(
			`SELECT * FROM subscribers WHERE dirty = 1 AND (user_id = ? OR user_id IS NULL);`,
			[userId],
			(_, { rows }) => callback(rows._array),
			(_, error) => {
				console.log('Error reading dirty rows', error);
				callback([]);
			}
		);
	});
};

/** بعد نجاح الرفع: نحفظ معرّف السحابة ونزيل علامة dirty */
export const markSubscriberSynced = (localId, remoteId, userId, callback) => {
	getDB().transaction(tx => {
		tx.executeSql(
			`UPDATE subscribers SET dirty=0, remote_id=?, user_id=? WHERE id=?;`,
			[remoteId, userId, localId],
			() => callback?.(true),
			(_, error) => {
				console.log('Error marking synced', error);
				callback?.(false);
			}
		);
	});
};

/** حذف نهائي — بعد أن يُحذف السجل من السحابة فعلاً */
export const hardDeleteSubscriber = (localId, callback) => {
	getDB().transaction(tx => {
		tx.executeSql(
			`DELETE FROM subscribers WHERE id=?;`,
			[localId],
			() => callback?.(true),
			(_, error) => {
				console.log('Error hard deleting', error);
				callback?.(false);
			}
		);
	});
};

/** إدراج أو تحديث سجل قادم من السحابة */
export const upsertFromRemote = (remote, userId, callback) => {
	getDB().transaction(tx => {
		tx.executeSql(
			`SELECT id, updated_at, dirty FROM subscribers WHERE remote_id = ? LIMIT 1;`,
			[remote.remote_id],
			(_, { rows }) => {
				const existing = rows._array[0];

				if (!existing) {
					tx.executeSql(
						`INSERT INTO subscribers (first_name, last_name, phone, address, start_date, end_date, price, offer, color, status, created_at, user_id, remote_id, updated_at, dirty, deleted)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0);`,
						[
							remote.first_name, remote.last_name, remote.phone, remote.address,
							remote.start_date, remote.end_date, remote.price, remote.offer || '',
							remote.color || '', remote.status, remote.created_at, userId,
							remote.remote_id, remote.updated_at,
						],
						() => callback?.(true),
						(_, error) => { console.log('Error inserting remote row', error); callback?.(false); }
					);
					return;
				}

				// السجل المحلي المعدّل ولم يُرفع بعد له الأولوية
				if (existing.dirty === 1) {
					callback?.(false);
					return;
				}

				tx.executeSql(
					`UPDATE subscribers
					 SET first_name=?, last_name=?, phone=?, address=?, start_date=?, end_date=?, price=?, offer=?, color=?, status=?, updated_at=?, user_id=?, dirty=0, deleted=0
					 WHERE id=?;`,
					[
						remote.first_name, remote.last_name, remote.phone, remote.address,
						remote.start_date, remote.end_date, remote.price, remote.offer || '',
						remote.color || '', remote.status, remote.updated_at, userId, existing.id,
					],
					() => callback?.(true),
					(_, error) => { console.log('Error updating from remote', error); callback?.(false); }
				);
			},
			(_, error) => { console.log('Error checking remote row', error); callback?.(false); }
		);
	});
};

/** معرّفات السحابة الموجودة محلياً — لاكتشاف ما حُذف من جهاز آخر */
export const getKnownRemoteIds = (callback) => {
	const userId = currentUserId();
	getDB().transaction(tx => {
		tx.executeSql(
			`SELECT remote_id FROM subscribers WHERE remote_id IS NOT NULL AND dirty = 0 AND (user_id = ? OR user_id IS NULL);`,
			[userId],
			(_, { rows }) => callback(rows._array.map((r) => r.remote_id)),
			(_, error) => { console.log('Error reading remote ids', error); callback([]); }
		);
	});
};

/** حذف السجلات التي اختفت من السحابة */
export const deleteLocalByRemoteId = (remoteId, callback) => {
	getDB().transaction(tx => {
		tx.executeSql(
			`DELETE FROM subscribers WHERE remote_id = ? AND dirty = 0;`,
			[remoteId],
			() => callback?.(true),
			(_, error) => { console.log('Error deleting local row', error); callback?.(false); }
		);
	});
};

/** مسح بيانات مستخدم عند تسجيل الخروج */
export const clearLocalData = (callback) => {
	getDB().transaction(tx => {
		tx.executeSql(
			`DELETE FROM subscribers;`,
			[],
			() => callback?.(true),
			(_, error) => { console.log('Error clearing local data', error); callback?.(false); }
		);
	});
};

/**
 * عند تسجيل الخروج لا نمسح البيانات: كل سجل مربوط بصاحبه (user_id)،
 * فلا يراه مستخدم آخر، ويجده صاحبه عند عودته حتى بدون إنترنت،
 * ولا تضيع التعديلات التي لم تُرفع بعد.
 * السجلات القديمة بدون صاحب تُنسب للمستخدم الحالي قبل خروجه.
 */
export const claimOrphanRows = (userId, callback) => {
	if (!userId) {
		callback?.(false);
		return;
	}
	getDB().transaction(tx => {
		tx.executeSql(
			`UPDATE subscribers SET user_id = ? WHERE user_id IS NULL;`,
			[userId],
			() => {
				tx.executeSql(
					`UPDATE offers SET user_id = ? WHERE user_id IS NULL;`,
					[userId],
					() => callback?.(true),
					(_, error) => { console.log('Error claiming offers', error); callback?.(false); return false; }
				);
			},
			(_, error) => { console.log('Error claiming subscribers', error); callback?.(false); return false; }
		);
	});
};

// دالة لحساب الـ status و daysLeft (مثال)
const calculateStatus = (startDateStr, endDateStr) => {
	const plainDateMatch = String(endDateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
	const end = plainDateMatch
		? new Date(Number(plainDateMatch[1]), Number(plainDateMatch[2]) - 1, Number(plainDateMatch[3]), 12, 0, 0, 0)
		: new Date(endDateStr);
  const today = new Date();
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
	if (daysLeft < 0) return 'Expired';
  if (daysLeft <= 7) return 'Expiring';
  return 'Active';
};
