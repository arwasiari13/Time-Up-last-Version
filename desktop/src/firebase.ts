import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';

// نفس مشروع Firebase المستعمل في تطبيق الهاتف ولوحة الإدارة
export const firebaseConfig = {
  apiKey: 'AIzaSyDnHp0Gy2e60deAjOOtZF1NRWhz_AAN304',
  authDomain: 'time-up-12d2a.firebaseapp.com',
  projectId: 'time-up-12d2a',
  storageBucket: 'time-up-12d2a.firebasestorage.app',
  messagingSenderId: '764058533164',
  appId: '1:764058533164:web:909a7146022e57086ac089',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
/**
 * ذاكرة محلية دائمة: التطبيق يفتح فوراً ببيانات محفوظة،
 * ويعمل بدون إنترنت، والتعديلات تُرفع عند عودة الاتصال.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
});

/** اسم المستخدم يُحوَّل إلى بريد وهمي لأن Firebase Auth يتطلب بريداً */
export const USERNAME_DOMAIN = 'timeup.app';
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
