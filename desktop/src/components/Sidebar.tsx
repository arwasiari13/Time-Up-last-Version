import type { Page } from '../App';
import { t } from '../lib/i18n';
import logoDark from '../assets/logo.png';
import logoLight from '../assets/logo-light.png';

interface Props {
  page: Page;
  username: string;
  /** البيانات معروضة من الذاكرة المحلية (بدون إنترنت) */
  offline?: boolean;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
}

const PAGES: { key: Page; labelKey: string }[] = [
  { key: 'dashboard', labelKey: 'nav.dashboard' },
  { key: 'subscribers', labelKey: 'nav.subscribers' },
  { key: 'offers', labelKey: 'nav.offers' },
  { key: 'settings', labelKey: 'nav.settings' },
];

export default function Sidebar({ page, username, offline, onNavigate, onSignOut }: Props) {
  return (
    <aside className="sidebar">
      <img className="logo logo-dark" src={logoDark} alt="TIME UP" />
      <img className="logo logo-light" src={logoLight} alt="TIME UP" />

      {PAGES.map((item) => (
        <button
          key={item.key}
          className={page === item.key ? 'nav-item active' : 'nav-item'}
          onClick={() => onNavigate(item.key)}
        >
          <span className="dot" />
          {t(item.labelKey)}
        </button>
      ))}

      <div className="sidebar-footer">
        <div className="sidebar-user">{username}</div>
        <div className="sidebar-sub">{offline ? t('nav.offline') : t('nav.signedIn')}</div>
        <button className="chip" onClick={onSignOut}>
          {t('nav.signOut')}
        </button>
      </div>
    </aside>
  );
}
