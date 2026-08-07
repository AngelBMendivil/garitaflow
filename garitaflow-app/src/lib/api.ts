import { Storage } from './storage';

// ⚠️ Change this to your Railway API URL after deploy
// For local dev: 'https://api.garitaflow.com'
// For production: 'https://api.garitaflow.com'
const BASE_URL = __DEV__
  ? 'https://api.garitaflow.com'
  : 'https://api.garitaflow.com';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
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

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
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
};

// ─── Profile ─────────────────────────────────────────────────────────────────

export const profileApi = {
  get: () => request<any>('/profile'),
  update: (data: {
    selected_city?: string;
    selected_garita?: string;
    avatar_key?: string;
    name?: string;
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
};

export { ApiError };
