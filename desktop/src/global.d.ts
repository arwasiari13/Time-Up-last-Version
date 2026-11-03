export {};

declare global {
  interface Window {
    desktop?: {
      platform: string;
      versions: { electron: string; chrome: string };
      notify: (payload: { id?: string; title: string; body: string }) => void;
      onOpenSubscriber: (callback: (id: string | null) => void) => () => void;
    };
  }
}
