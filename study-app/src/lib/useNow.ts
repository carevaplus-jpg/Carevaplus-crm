import { useEffect, useState } from 'react';

/** A render-safe "now" that ticks every `intervalMs` (keeps components pure for the React Compiler). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
