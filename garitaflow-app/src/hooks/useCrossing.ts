import { useState, useEffect, useCallback, useRef } from 'react';
import { crossingsApi } from '../lib/api';
import { Crossing } from '../lib/types';

export function useCrossing() {
  const [activeCrossing, setActiveCrossing] = useState<Crossing | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkActive = useCallback(async () => {
    try {
      const c = await crossingsApi.active();
      setActiveCrossing(c);
      if (c) {
        const elapsed = Math.floor(
          (Date.now() - new Date(c.started_at).getTime()) / 1000
        );
        setElapsedSeconds(elapsed);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    checkActive();
  }, [checkActive]);

  // Tick timer when crossing is active
  useEffect(() => {
    if (!activeCrossing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCrossing?.id]);

  const startCrossing = useCallback(async (portId: string, laneType: string, mode?: string) => {
    setLoading(true);
    try {
      const c = await crossingsApi.start(portId, laneType, mode);
      setActiveCrossing(c);
      setElapsedSeconds(0);
      return c;
    } finally {
      setLoading(false);
    }
  }, []);

  const endCrossing = useCallback(async () => {
    if (!activeCrossing) return null;
    setLoading(true);
    try {
      const result = await crossingsApi.end(activeCrossing.id);
      setActiveCrossing(null);
      setElapsedSeconds(0);
      return result;
    } finally {
      setLoading(false);
    }
  }, [activeCrossing]);

  /** Format elapsed time as MM:SS */
  const formattedTime = (() => {
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  return {
    activeCrossing,
    loading,
    elapsedSeconds,
    formattedTime,
    startCrossing,
    endCrossing,
    checkActive,
  };
}
