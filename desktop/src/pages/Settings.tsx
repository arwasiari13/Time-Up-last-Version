import { useState } from 'react';
import { getLang, Lang, LANGUAGES, setLang, t } from '../lib/i18n';
import { APP_VERSION, getTheme, setTheme, Theme } from '../lib/theme';
import { showToast } from '../lib/toast';
import { sendFeedback } from '../lib/writes';

interface Props {
  username: string;
  email: string;
  onSignOut: () => void;
}

export default function Settings({ username, email, onSignOut }: Props) {
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const lang = getLang();

  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const chooseTheme = (next: Theme) => {
    setTheme(next);
    setThemeState(next);
  };

  const submitFeedback = () => {
    const text = message.trim();
    if (!text) {
      setError(t('settings.writeFirst'));
      return;
    }
    setError('');
    // تُحفظ محلياً وتُرفع عند توفر الإنترنت
    sendFeedback(text, rating, `desktop ${APP_VERSION}`);
    setMessage('');
    setRating(0);
    setSent(true);
    showToast(t('toast.feedbackSent'));
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('settings.title')}</h1>
          <p className="page-sub">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="settings-column">
        <section className="panel">
          <h2>{t('settings.account')}</h2>
          <p className="panel-sub">{t('settings.accountSub')}</p>

          <div className="setting-row">
            <div>
              <div className="setting-label">{username}</div>
              <div className="setting-hint">{email}</div>
            </div>
            <button className="chip danger" onClick={onSignOut}>
              {t('nav.signOut')}
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>{t('settings.appearance')}</h2>
          <p className="panel-sub">{t('settings.appearanceSub')}</p>

          <div className="setting-row">
            <div>
              <div className="setting-label">{t('settings.theme')}</div>
              <div className="setting-hint">{t('settings.themeHint')}</div>
            </div>
            <div className="segmented">
              <button className={theme === 'dark' ? 'on' : ''} onClick={() => chooseTheme('dark')}>
                {t('settings.dark')}
              </button>
              <button className={theme === 'light' ? 'on' : ''} onClick={() => chooseTheme('light')}>
                {t('settings.light')}
              </button>
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">{t('settings.language')}</div>
              <div className="setting-hint">{t('settings.languageHint')}</div>
            </div>
            <div className="segmented">
              {LANGUAGES.map((item) => (
                <button
                  key={item.key}
                  className={lang === item.key ? 'on' : ''}
                  // تغيير اللغة يعيد تحميل النافذة لتُترجم كل الصفحات
                  onClick={() => item.key !== lang && setLang(item.key as Lang)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>{t('settings.feedback')}</h2>
          <p className="panel-sub">{t('settings.feedbackSub')}</p>

          <div className="stars">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                className={value <= rating ? 'star-btn on' : 'star-btn'}
                // الضغط على نفس النجمة مرة أخرى يلغي التقييم
                onClick={() => setRating(rating === value ? 0 : value)}
              >
                {value <= rating ? '★' : '☆'}
              </button>
            ))}
          </div>

          <textarea
            className="feedback-area"
            placeholder={t('settings.feedbackPlaceholder')}
            maxLength={1000}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setSent(false);
            }}
          />

          <p className="note">{t('settings.anonymous')}</p>

          {error && (
            <p className="error-text" style={{ textAlign: 'start' }}>
              {error}
            </p>
          )}
          {sent && <p className="ok-text">{t('settings.thanks')}</p>}

          <div className="form-actions">
            <button
              className="primary-btn"
              style={{ width: 'auto', padding: '11px 24px' }}
              onClick={submitFeedback}
            >
              {t('settings.send')}
            </button>
          </div>
        </section>
      </div>

      <p className="settings-foot">{t('settings.foot', { version: APP_VERSION })}</p>
    </>
  );
}
