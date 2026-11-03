export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'timeup-theme';

export const APP_VERSION = '1.0.0';

export const getTheme = (): Theme => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

export const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
};

export const setTheme = (theme: Theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // التخزين اختياري
  }
  applyTheme(theme);
};
