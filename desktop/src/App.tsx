import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import { auth } from './firebase';
import { notifyExpiring } from './lib/notify';
import { t } from './lib/i18n';
import { StatusKey } from './lib/subscribers';
import { useSavedOffers, useSubscribers } from './lib/useData';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Offers from './pages/Offers';
import Settings from './pages/Settings';
import Subscribers from './pages/Subscribers';

export type Page = 'dashboard' | 'subscribers' | 'offers' | 'settings';
export type StatusFilter = 'all' | StatusKey;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next);
        setChecking(false);
      }),
    []
  );

  if (checking) return <div className="center-screen">{t('common.loading')}</div>;
  if (!user) return <Login />;
  return <Shell user={user} />;
}

/** كل الصفحات تشترك في نفس القراءة الحيّة من Firestore */
function Shell({ user }: { user: User }) {
  const [page, setPage] = useState<Page>('dashboard');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [focusId, setFocusId] = useState<string | null>(null);

  const { rows, error, fromCache } = useSubscribers(user.uid);
  const savedOffers = useSavedOffers(user.uid);
  const username = (user.email || '').split('@')[0];

  // إشعارات ويندوز للاشتراكات التي تنتهي قريباً — عند كل تحديث وكل نصف ساعة
  useEffect(() => {
    if (!rows) return;
    notifyExpiring(rows);
    const timer = setInterval(() => notifyExpiring(rows), 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [rows]);

  // الضغط على إشعار ويندوز يفتح ذلك المشترك
  useEffect(() => {
    const unsubscribe = window.desktop?.onOpenSubscriber((id) => {
      setFilter('all');
      setPage('subscribers');
      setFocusId(id);
    });
    return unsubscribe;
  }, []);

  const openSubscribers = (next: StatusFilter) => {
    setFilter(next);
    setPage('subscribers');
  };

  return (
    <div className="app">
      <Sidebar
        page={page}
        username={username}
        offline={fromCache}
        onNavigate={(next) => {
          if (next === 'subscribers') setFilter('all');
          setPage(next);
        }}
        onSignOut={() => signOut(auth)}
      />
      <main className="main">
        {page === 'dashboard' && (
          <Dashboard
            uid={user.uid}
            savedOffers={savedOffers}
            rows={rows}
            error={error}
            username={username}
            onOpenSubscribers={openSubscribers}
          />
        )}

        {page === 'subscribers' && (
          // key يعيد بناء الصفحة حتى يُطبَّق الفلتر القادم من لوحة التحكم
          <Subscribers
            key={filter}
            uid={user.uid}
            rows={rows}
            error={error}
            savedOffers={savedOffers}
            initialFilter={filter}
            focusId={focusId}
            onFocusHandled={() => setFocusId(null)}
          />
        )}

        {page === 'offers' && <Offers uid={user.uid} rows={rows} savedOffers={savedOffers} />}

        {page === 'settings' && (
          <Settings
            username={username}
            email={user.email || '—'}
            onSignOut={() => signOut(auth)}
          />
        )}
      </main>

      <Toast />
    </div>
  );
}
