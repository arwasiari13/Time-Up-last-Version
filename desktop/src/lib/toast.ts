/** رسالة قصيرة أسفل الشاشة (تم الحفظ، تم الحذف...) */
const EVENT = 'timeup-toast';

export const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
};

export const onToast = (callback: (message: string) => void) => {
  const handler = (event: Event) => callback((event as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
};
