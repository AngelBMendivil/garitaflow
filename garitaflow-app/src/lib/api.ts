import { Platform } from 'react-native';
import { Storage } from './storage';

// ⚠️ Change this to your Railway API URL after deploy
const BASE_URL = __DEV__
  ? 'https://api.garitaflow.com'
  : 'https://api.garitaflow.com';

const TIMEOUT_MS = 15000;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Bitácora best-effort: registra fallos de red en el backend. No lanza ni bloquea.
async function reportFailure(path: string, method: string, err: any) {
  try {
    const token = await Storage.getToken().catch(() => null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${BASE_URL}/logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        level: 'error',
        event: 'request_failed',
        message: err?.message ? String(err.message) : String(err),
        context: { method, path },
        platform: Platform.OS,
      }),
    });
  } catch {
    // si la bitácora falla, se ignora
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = await Storage.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const method = (options.method || 'GET').toUpperCase();

  let lastErr: any;
  // 1 reintento ante fallo de red / timeout (no ante error del servidor).
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body.error || `HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (e instanceof ApiError) throw e; // el servidor respondió: no reintentar
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 700));
        continue;
      }
    }
  }
  // Falló por red/timeout tras el reintento → registra (evitando bucle con /logs) y propaga.
  if (path !== '/logs') reportFailure(path, method, lastErr);
  throw lastErr;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }, false),

  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false),

  google: (google_id: string, email: string, name: string, avatar_url?: string) =>
    request<{ token: string; user: any }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ google_id, email, name, avatar_url }),
    }, false),

  me: () => request<any>('/auth/me'),

  // Borra la cuenta y todos los datos del usuario (requisito de Google Play).
  deleteAccount: () => request<{ ok: boolean }>('/auth/me', { method: 'DELETE' }),
};

// ─── Profile ─────────────────────────────────────────────────────────────────

export const profileApi = {
  get: () => request<any>('/profile'),
  update: (data: {
    selected_city?: string;
    selected_garita?: string;
    avatar_key?: string;
    name?: string;
    has_sentri?: boolean;
    vehicle_key?: string;
    vehicle_color?: string;
  }) => request('/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  stats: (city?: string) =>
    request<any[]>(`/profile/stats${city ? `?city=${city}` : ''}`),
};

// ─── Flow Index ───────────────────────────────────────────────────────────────

export const flowIndexApi = {
  get: (portId: string, lane?: string, mode?: string) => {
    const params = new URLSearchParams();
    if (lane) params.set('lane', lane);
    if (mode) params.set('mode', mode);
    const qs = params.toString();
    return request<any>(`/flow-index/${portId}${qs ? `?${qs}` : ''}`);
  },
  list: (city?: string) =>
    request<any[]>(`/flow-index${city ? `?city=${city}` : ''}`),
  history: (portId: string, hours = 2, lane?: string, mode?: string) => {
    const params = new URLSearchParams({ hours: String(hours) });
    if (lane) params.set('lane', lane);
    if (mode) params.set('mode', mode);
    return request<any[]>(`/flow-index/${portId}/history?${params.toString()}`);
  },
  // Garita más rápida de una ciudad (comunidad + CBP + estimación)
  recommend: (city?: string, mode = 'VEHICULAR') => {
    const params = new URLSearchParams({ mode });
    if (city) params.set('city', city);
    return request<any>(`/flow-index/recommend?${params.toString()}`);
  },
  // Espera típica por hora del día (histórico + tendencia hoy + mejor/peor/ahora)
  hourly: (portId: string | number, lane = 'GENERAL', mode = 'VEHICULAR') =>
    request<any>(`/flow-index/${portId}/hourly?lane=${lane}&mode=${mode}`),
};

// ─── Ports ───────────────────────────────────────────────────────────────────

export const portsApi = {
  list: (city?: string) =>
    request<any[]>(`/ports${city ? `?city=${city}` : ''}`),
  laneTypes: (portId: string) =>
    request<any[]>(`/ports/${portId}/lane-types`),
};

// ─── Crossings ────────────────────────────────────────────────────────────────

export const crossingsApi = {
  start: (port_id: string, lane_type: string, mode?: string) =>
    request<any>('/crossings/start', {
      method: 'POST',
      body: JSON.stringify({ port_id, lane_type, mode: mode || 'VEHICULAR' }),
    }),

  end: (crossingId: string) =>
    request<any>(`/crossings/${crossingId}/end`, { method: 'POST' }),

  active: () => request<any | null>('/crossings/active'),

  history: (limit = 20, offset = 0) =>
    request<any[]>(`/crossings/history?limit=${limit}&offset=${offset}`),
};

// ─── Flow Events ─────────────────────────────────────────────────────────────

export const flowEventsApi = {
  list: (portId: string, minutes = 60) =>
    request<any[]>(`/flow-events/${portId}?minutes=${minutes}`),

  create: (data: {
    port_id: string;
    crossing_id?: string;
    event_type: string;
    lane_type?: string;
    description?: string;
    lat?: number;
    lng?: number;
    accuracy?: number;
  }) =>
    request<any>('/flow-events', { method: 'POST', body: JSON.stringify(data) }),

  confirm: (eventId: string) =>
    request<any>(`/flow-events/${eventId}/confirm`, { method: 'POST' }),
};

// ─── Push Tokens ─────────────────────────────────────────────────────────────

export const pushApi = {
  register: (token: string, platform: 'ios' | 'android' | 'web') =>
    request('/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    }),
  unregister: (token: string) =>
    request(`/push-tokens/${encodeURIComponent(token)}`, { method: 'DELETE' }),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────

export const alertsApi = {
  list: () => request<any[]>('/alerts'),
  upsert: (portId: string, data: any) =>
    request(`/alerts/${portId}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (portId: string) =>
    request(`/alerts/${portId}`, { method: 'DELETE' }),
};

// ─── Gamificación ─────────────────────────────────────────────────────────────

export const gamificationApi = {
  badges: () => request<any[]>('/gamification/badges'),
  me: () => request<any>('/gamification/me'),
  // Polígonos activos de una garita (para el detector "¿estás en la línea?")
  geofences: (portId: string | number) =>
    request<any[]>(`/gamification/geofences?portId=${portId}`),
};

// ─── Cruces recurrentes (alarma) ───────────────────────────────────────────────

export const recurringApi = {
  list: () => request<any[]>('/recurring'),
  create: (data: {
    port_id: number | string;
    lane_type?: string;
    mode?: string;
    days_of_week: number[];
    target_time: string; // 'HH:MM'
    lead_minutes?: number;
    sensitivity?: 'low' | 'medium' | 'high';
  }) => request<any>('/recurring', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/recurring/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<any>(`/recurring/${id}`, { method: 'DELETE' }),
};

export { ApiError };
