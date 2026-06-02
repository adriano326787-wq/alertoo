import { useEffect, useState } from 'react';

/**
 * useTick — returns a counter that increments every `intervalMs` milliseconds.
 * Components that call this hook re-render automatically on each tick.
 * Use it alongside `timeAgo` / `timeLeft` so displayed times stay fresh.
 *
 * Default interval: 60 000ms (1 minute) — matches the granularity of timeAgo/timeLeft.
 */
export function useTick(intervalMs = 60_000): number {
  // #33 — guard against non-positive intervals (would spin forever at 0)
  const safeInterval = intervalMs > 0 ? intervalMs : 60_000;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), safeInterval);
    return () => clearInterval(id);
  }, [safeInterval]);
  return tick;
}
