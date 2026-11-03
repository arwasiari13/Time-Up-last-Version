import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import logoDark from '../assets/logo.png';
import logoLight from '../assets/logo-light.png';
import { auth, usernameToEmail } from '../firebase';
import { t } from '../lib/i18n';

export default function Login() {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !code.trim()) {
      setError(t('login.needBoth'));
      return;
    }
    setError('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, usernameToEmail(username), code.trim());
    } catch (err: any) {
      const code = err?.code;
      setError(
        code === 'auth/invalid-credential' || code === 'auth/user-not-found'
          ? t('login.wrong')
          : code === 'auth/network-request-failed'
          ? t('login.noInternet')
          : code === 'auth/too-many-requests'
          ? t('login.tooMany')
          : err?.message || t('login.failed')
      );
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <img className="logo logo-dark" src={logoDark} alt="TIME UP" />
        <img className="logo logo-light" src={logoLight} alt="TIME UP" />

        <div className="field">
          <label>{t('login.username')}</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            autoFocus
            autoComplete="username"
          />
        </div>

        <div className="field">
          <label>{t('login.code')}</label>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button className="primary-btn" disabled={busy}>
          {busy ? t('login.signingIn') : t('login.signIn')}
        </button>

        {error && <p className="error-text">{error}</p>}
        <p className="login-foot">{t('login.sameAccount')}</p>
        <p className="login-foot" style={{ marginTop: 6 }}>
          {t('login.madeIn')}
        </p>
      </form>
    </div>
  );
}
