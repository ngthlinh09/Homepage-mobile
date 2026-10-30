import { useEffect, useState } from 'react';

/** State that survives sheet closes, re-renders and reloads within the session (FR-6: retain input). */
export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) as T : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }, [key, value]);
  return [value, setValue] as const;
}
