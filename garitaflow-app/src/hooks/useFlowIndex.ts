import { useState, useEffect, useCallback, useRef } from 'react';
import { flowIndexApi } from '../lib/api';
import { FlowIndex } from '../lib/types';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function useFlowIndex(
  portId: string | null,
  lane?: string,
  mode?: string,
) {
  const [data, setData] = useState<FlowIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    if (!portId) return;
    try {
      setError(null);
      const result = await flowIndexApi.get(portId, lane, mode);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error loading flow index');
    }
  }, [portId, lane, mode]);

  useEffect(() => {
    if (!portId) return;
    setLoading(true);
    fetch().finally(() => setLoading(false));
    timerRef.current = setInterval(fetch, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [portId, lane, mode, fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useFlowHistory(
  portId: string | null,
  hours = 2,
  lane?: string,
  mode?: string,
) {
  const [history, setHistory] = useState<{ score: number; computed_at: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!portId) return;
    setLoading(true);
    flowIndexApi.history(portId, hours, lane, mode)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [portId, hours, lane, mode]);

  return { history, loading };
}