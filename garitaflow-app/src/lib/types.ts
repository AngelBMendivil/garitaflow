// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  selected_city?: string;
  selected_garita?: string;
  avatar_key?: string;
  has_sentri?: boolean;
  vehicle_key?: string;
  vehicle_color?: string;
  total_xp: number;
  level: number;
  total_crossings: number;
}

// ─── Ports ───────────────────────────────────────────────────────────────────

export interface Port {
  id: string;
  name: string;
  city: string;
  cbp_port_code?: string;
}

export interface LaneType {
  id: string;
  name: string;
  label: string;
}

// ─── Flow Index ──────────────────────────────────────────────────────────────

export interface FlowComponents {
  a_time: number;
  b_trend: number;
  c_volatility: number;
  d_freshness: number;
  e_reporters: number;
}

export interface FlowIndex {
  score: number;
  components: FlowComponents;
  computed_at: string;
  from_cache: boolean;
}

export interface PortWithFlow extends Port {
  score?: number;
  computed_at?: string;
  components?: FlowComponents;
}

// ─── Crossings ───────────────────────────────────────────────────────────────

export interface Crossing {
  id: string;
  port_id: string;
  port_name?: string;
  lane_type: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  events_reported?: number;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type EventType =
  | 'incident'
  | 'lane_closed'
  | 'dog_unit'
  | 'x_ray'
  | 'slow_movement'
  | 'fast_movement'
  | 'document_check'
  | 'officer_change'
  | 'lane_open'
  | 'vehicle_inspection'
  | 'other';

export interface FlowEvent {
  id: string;
  event_type: EventType;
  lane_type?: string;
  description?: string;
  created_at: string;
  reporter_name: string;
  reporter_avatar?: string;
  confirmations: number;
  crossing_seconds?: number | null;
  xp?: number;
  geo_validation_status?: 'VALIDATED_IN_LINE' | 'NEAR_BORDER' | 'OUTSIDE_VALID_AREA';
  eligible_for_gamification?: boolean;
}

// ─── Gamificación ──────────────────────────────────────────────────────────────

export interface BadgeDef {
  category: 'crossings' | 'community';
  level: number;
  name: string;
  threshold: number;
  special: boolean;
}

export interface BadgeProgress {
  category: 'crossings' | 'community';
  value: number;
  current: BadgeDef | null;
  next: BadgeDef | null;
  toNext: number;
}

export interface UserBadges {
  crossings: BadgeProgress;
  community: BadgeProgress;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export type AlertType = 'flow_drop' | 'congestion' | 'incident' | 'lane_closed' | 'fast_movement';
export type AlertFrequency = 'immediate' | 'hourly' | 'daily';

export interface UserAlert {
  id: string;
  port_id: string;
  port_name: string;
  city: string;
  enabled: boolean;
  alert_types: AlertType[];
  frequency: AlertFrequency;
  quiet_start?: string;
  quiet_end?: string;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Personalization: undefined;
  NotificationPermission: undefined;
  LocationPermission: undefined;
  MainTabs: undefined;
  ActiveCrossing: {
    crossingId: string;
    portName: string;
    portId?: string;
    laneLabel?: string;
    startedAt?: string;
  };
  Report: { crossingId: string; portId: string };
  ReportSent: { eventType: string; xpEarned: number };
  AlertSettings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  MyCrossings: undefined;
  Profile: undefined;
};
