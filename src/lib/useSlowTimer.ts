import { useEffect, useState } from 'react';

export function useSlowTimer(active: boolean, threshold = 10000): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 500);
    return () => clearInterval(id);
  }, [active, threshold]);

  return elapsed;
}

export function useHasExceeded(active: boolean, threshold = 10000): boolean {
  const elapsed = useSlowTimer(active, threshold);
  return elapsed >= threshold;
}
