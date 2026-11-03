import { useEffect, useState } from 'react';
import { onToast } from '../lib/toast';

export default function Toast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = onToast((next) => {
      setMessage(next);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 2600);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  if (!message) return null;
  return <div className="toast">{message}</div>;
}
