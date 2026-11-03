import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyLangToDocument } from './lib/i18n';
import { applyTheme, getTheme } from './lib/theme';
import './styles.css';

// المظهر المحفوظ يُطبَّق قبل الرسم حتى لا تومض الألوان
applyTheme(getTheme());
applyLangToDocument();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
