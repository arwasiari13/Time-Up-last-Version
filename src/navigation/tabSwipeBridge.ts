type Listener = (index: number | null) => void;

let pendingTabIndex: number | null = null;
const listeners = new Set<Listener>();

export const setPendingTabIndex = (index: number | null) => {
  pendingTabIndex = index;
  listeners.forEach((listener) => listener(pendingTabIndex));
};

export const subscribePendingTabIndex = (listener: Listener) => {
  listeners.add(listener);
  listener(pendingTabIndex);

  return () => {
    listeners.delete(listener);
  };
};
