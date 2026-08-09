import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList, FlowEvent } from '../../lib/types';
import { Colors } from '../../lib/colors';
import { useAuth } from '../../context/AuthContext';
import { useCrossing } from '../../hooks/useCrossing';
import { useFlowIndex } from '../../hooks/useFlowIndex';
import { useNotifications } from '../../hooks/useNotifications';
import { flowEventsApi, portsApi, profileApi, alertsApi, flowIndexApi, crossingsApi } from '../../lib/api';
import FlowIndexCard from '../../components/FlowIndexCard';
import Logo from '../../components/Logo';
import { useLineDetector } from '../../hooks/useLineDetector';

// Banco de avatares (mismo del onboarding)
const AVATARS = [
  '😎', '🤠', '👩‍💻', '👨‍🍳', '🧑‍🎤', '👩‍🚀',
  '🦸', '🧙‍♂️', '🕵️', '👩‍⚕️', '👨‍🏫', '🧑‍🌾',
  '🐺', '🦊', '🐸', '🤖', '👾', '🦄',
  '🌵', '🍕', '🚗', '🛸', '⚡', '🎸',
  '🩰', '🐄', '🐶', '🥒', '🌭', '🐧', '🧀', '🦙', '🦫', '🦥',
];

function saludoPorHora(h: number): string {
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type Props = { navigation: Nav };

type Lane = { mode: string; lane_type: string };
type Port = { id: number | string; code: string; name: string; city: string; lanes: Lane[] };

// PedWest es una garita aparte en la base, pero para el usuario es
// una forma más de cruzar a pie por San Ysidro. Se presenta como carril.
const PEDWEST_CODE = 'PED_WEST';
const PEDWEST_HOST = 'SAN_YSIDRO';
const PEDWEST_OPEN_HOUR = 6;
const PEDWEST_CLOSE_HOUR = 14;

const CITY_LABEL: Record<string, string> = {
  tijuana: 'Tijuana',
  mexicali: 'Mexicali',
  nogales: 'Nogales',
  juarez: 'Cd. Juárez',
  laredo: 'Nuevo Laredo',
};

const LANE_LABEL: Record<string, string> = {
  GENERAL: 'General',
  READY: 'Ready Lane',
  SENTRI: 'SENTRI',
  PEDWEST: 'PedWest',
};

const EVENT_LABELS: Record<string, string> = {
  slow_movement: '🐢 Avance lento',
  fast_movement: '🚀 Flujo rápido',
  lane_open:     '✅ Carril abierto',
  lane_closed:   '🚫 Carril cerrado',
  incident:      '🚨 Incidente',
  other:         '💬 Otro',
};

// Estilo por tipo de reporte (chip de la tarjeta de comunidad)
const EVENT_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  fast_movement: { label: 'Flujo rápido',  icon: '🚀', color: '#2FBF71', bg: 'rgba(0,131,79,0.16)' },
  slow_movement: { label: 'Flujo lento',   icon: '🐢', color: '#FF6B7D', bg: 'rgba(224,0,37,0.16)' },
  lane_open:     { label: 'Carril abierto', icon: '✅', color: '#2FBF71', bg: 'rgba(0,131,79,0.16)' },
  lane_closed:   { label: 'Carril cerrado', icon: '⚠️', color: '#F5B44A', bg: 'rgba(245,158,11,0.16)' },
  incident:      { label: 'Incidente',      icon: '🚨', color: '#FF6B7D', bg: 'rgba(224,0,37,0.16)' },
  other:         { label: 'Otro',           icon: '💬', color: '#5C93FF', bg: 'rgba(11,94,255,0.14)' },
};

// Colores de fondo del avatar según el nombre (variedad como en Waze)
const AV_BG = ['#1D3B8B', '#7A5A2E', '#7A3B52', '#2E6B4F', '#463B7A', '#2B5B6B'];

function hace(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.floor(mins / 60);
  return `hace ${h} h`;
}

// Hora actual en Tijuana, independiente del reloj del dispositivo.
// OJO: en React Native (Hermes) `new Date(localeString)` no parsea el formato
// y devolvía NaN → el saludo caía siempre en "Buenas noches". Se lee la hora directo.
function tijuanaHour(): number {
  try {
    const s = new Date().toLocaleString('en-US', {
      timeZone: 'America/Tijuana',
      hour: '2-digit',
      hour12: false,
    });
    const h = parseInt(s, 10);
    if (!Number.isNaN(h)) return h % 24;
  } catch {
    // fallback abajo
  }
  return new Date().getHours();
}

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { activeCrossing, formattedTime, startCrossing, checkActive } = useCrossing();

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const { requestPermission, registerForPush, showLocal } = useNotifications();

  // Registra el push token al abrir (silencioso: si ya hay permiso, obtiene y
  // guarda el token; si no, no molesta). Necesario para que lleguen las alarmas.
  useEffect(() => { registerForPush(); }, [registerForPush]);

  // Refresca el cruce activo cada vez que Inicio recupera el foco (p. ej. al
  // volver de terminar un cruce), para que el banner/estado no queden pegados.
  useFocusEffect(
    useCallback(() => {
      checkActive();
    }, [checkActive])
  );

  const firstName = (user?.name || '').trim().split(' ')[0] || '';

  const handleConfirm = async (eventId: string) => {
    if (confirming) return;
    setConfirming(eventId);
    try {
      const res: any = await flowEventsApi.confirm(eventId);
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? { ...ev, confirmations: res?.total_confirmations ?? ev.confirmations + 1 }
            : ev
        )
      );
    } catch {
      // p. ej. es tu propio reporte o ya lo confirmaste
    } finally {
      setConfirming(null);
    }
  };

  const changeAvatar = async (emoji: string) => {
    if (savingAvatar) return;
    setSavingAvatar(true);
    updateUser({ avatar_key: emoji }); // optimista
    try {
      await profileApi.update({ avatar_key: emoji });
    } catch {
      // se mantiene el cambio local aunque falle la red
    } finally {
      setSavingAvatar(false);
      setAvatarPickerOpen(false);
    }
  };

  const city = user?.selected_city || 'tijuana';

  const [ports, setPorts] = useState<Port[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(true);
  const [portCode, setPortCode] = useState<string | null>(null);
  const [mode, setMode] = useState('VEHICULAR');
  const [lane, setLane] = useState('GENERAL');
  const [now, setNow] = useState(() => tijuanaHour());

  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);

  const locked = !!activeCrossing;

  // Revisa la hora cada minuto para cerrar PedWest en vivo.
  useEffect(() => {
    const t = setInterval(() => setNow(tijuanaHour()), 60_000);
    return () => clearInterval(t);
  }, []);

  const pedwestOpen = now >= PEDWEST_OPEN_HOUR && now < PEDWEST_CLOSE_HOUR;

  useEffect(() => {
    setLoadingPorts(true);
    portsApi.list(city)
      .then((ps: any[]) => {
        const list = (ps || []).filter((p) => (p.lanes || []).length > 0);
        setPorts(list);
        const visible = list.filter((p) => p.code !== PEDWEST_CODE);
        if (visible.length > 0) setPortCode((prev) => prev ?? visible[0].code);
      })
      .catch(() => setPorts([]))
      .finally(() => setLoadingPorts(false));
  }, [city]);

  // PedWest no se muestra como garita: vive dentro de San Ysidro.
  const visiblePorts = useMemo(
    () => ports.filter((p) => p.code !== PEDWEST_CODE),
    [ports]
  );

  const port = useMemo(
    () => visiblePorts.find((p) => p.code === portCode) ?? null,
    [visiblePorts, portCode]
  );

  const pedwestPort = useMemo(
    () => ports.find((p) => p.code === PEDWEST_CODE) ?? null,
    [ports]
  );

  const modes = useMemo(() => {
    if (!port) return [];
    return Array.from(new Set(port.lanes.map((l) => l.mode)));
  }, [port]);

  // A los carriles peatonales de San Ysidro se les suma PedWest.
  const lanes = useMemo(() => {
    if (!port) return [];
    const own = Array.from(
      new Set(port.lanes.filter((l) => l.mode === mode).map((l) => l.lane_type))
    );
    const showsPedwest =
      port.code === PEDWEST_HOST && mode === 'PEDESTRIAN' && !!pedwestPort;
    return showsPedwest ? [...own, 'PEDWEST'] : own;
  }, [port, mode, pedwestPort]);

  useEffect(() => {
    if (modes.length > 0 && !modes.includes(mode)) setMode(modes[0]);
  }, [modes, mode]);

  useEffect(() => {
    if (lanes.length > 0 && !lanes.includes(lane)) setLane(lanes[0]);
  }, [lanes, lane]);

  // Al elegir PedWest se consulta su propia garita, no la de San Ysidro.
  const isPedwest = lane === 'PEDWEST';
  const targetPortId = isPedwest && pedwestPort
    ? String(pedwestPort.id)
    : port ? String(port.id) : null;
  const targetLane = isPedwest ? 'GENERAL' : lane;

  const { data: flowData, loading: flowLoading } = useFlowIndex(
    targetPortId,
    targetLane,
    mode
  );

  // Detector en vivo "¿Estás en la línea?" (GPS del usuario vs geocerca de la garita)
  const lineStatus = useLineDetector(targetPortId);

  // Recomendación: la garita más rápida de la ciudad (comunidad + CBP + estimación)
  const [reco, setReco] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    flowIndexApi
      .recommend(city, mode)
      .then((r) => { if (alive) setReco(r); })
      .catch(() => { if (alive) setReco(null); });
    return () => { alive = false; };
  }, [city, mode]);

  // Al cambiar de garita se limpian los comentarios para no mostrar los de la
  // garita anterior mientras cargan los nuevos (bug: se quedaban pegados).
  useEffect(() => { setEvents([]); }, [targetPortId]);

  const loadEvents = useCallback(async () => {
    const pid = activeCrossing?.port_id ? String(activeCrossing.port_id) : targetPortId;
    if (!pid) return;
    try {
      const e = await flowEventsApi.list(pid, 60);
      setEvents(e);
    } catch {
      setEvents([]);
    }
  }, [targetPortId, activeCrossing?.port_id]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Estado de avisos (alerta) para la garita seleccionada
  useEffect(() => {
    if (!targetPortId) return;
    let alive = true;
    alertsApi.list()
      .then((list: any[]) => {
        if (!alive) return;
        const a = (list || []).find((x) => String(x.port_id) === String(targetPortId));
        setNotifEnabled(!!(a && a.enabled));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [targetPortId]);

  const onRefresh = async () => {
    setRefreshing(true);
    setNow(tijuanaHour());
    await loadEvents();
    setRefreshing(false);
  };

  const laneBlocked = isPedwest && !pedwestOpen;

  // Comunidad: reportes del carril seleccionado; si no hay, cae a toda la garita.
  const reportsPortLabel = isPedwest ? 'PedWest' : (port?.name ?? '');
  const laneReports = events.filter(
    (e) => (e.lane_type ?? '').toUpperCase() === (targetLane ?? '').toUpperCase()
  );
  const shownReports = (laneReports.length > 0 ? laneReports : events).slice(0, 5);

  const toggleNotif = async () => {
    if (!targetPortId || notifLoading) return;
    setNotifLoading(true);
    try {
      if (!notifEnabled) {
        const ok = await requestPermission();
        if (!ok) {
          Alert.alert(
            'Permiso de notificaciones',
            'Actívalas desde los ajustes del sistema para recibir avisos de tu garita.'
          );
          return;
        }
        await registerForPush(); // best-effort (el push remoto no aplica en Expo Go)
        await alertsApi.upsert(targetPortId, {
          enabled: true,
          alert_types: ['congestion', 'lane_closed', 'incident', 'flow_drop', 'fast_movement'],
          frequency: 'immediate',
        });
        setNotifEnabled(true);
        showLocal('🔔 Avisos activados', `Te avisaremos si ${reportsPortLabel} cambia.`);
      } else {
        await alertsApi.upsert(targetPortId, { enabled: false });
        setNotifEnabled(false);
      }
    } catch (e: any) {
      Alert.alert('No se pudo actualizar', e?.message || 'Error');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleStartCrossing = async () => {
    if (!targetPortId || loadingStart || laneBlocked) return;
    // Candado por geolocalización: bloquea SOLO si sabemos que estás fuera de la línea.
    if (lineStatus === 'OUTSIDE') {
      Alert.alert(
        'No estás en la línea',
        'Solo puedes iniciar el cruce cuando estás físicamente en la fila de esta garita.'
      );
      return;
    }
    const laneLabel = LANE_LABEL[lane] || lane;
    const portDisplay = `${isPedwest ? 'PedWest' : port?.name} · ${laneLabel}`;
    setLoadingStart(true);
    try {
      const c = await startCrossing(targetPortId, targetLane, mode);
      navigation.navigate('ActiveCrossing', {
        crossingId: c.id,
        portName: portDisplay,
        portId: targetPortId,
        laneLabel,
        startedAt: c.started_at,
      });
    } catch (err: any) {
      // 409 = ya hay un cruce en curso. En vez de un mensaje sin salida,
      // ofrecemos reanudarlo o terminarlo (queda desatorado).
      if (err?.status === 409) {
        await offerResumeOrFinish();
      } else {
        Alert.alert('No se pudo iniciar el cruce', err?.message || 'Error desconocido');
      }
    } finally {
      setLoadingStart(false);
    }
  };

  // Recupera el cruce en curso (aunque su garita quedara huérfana) y deja al
  // usuario reanudarlo o terminarlo para poder iniciar uno nuevo.
  const offerResumeOrFinish = async () => {
    let active: any = null;
    try { active = await crossingsApi.active(); } catch { /* ignore */ }
    await checkActive();

    const resume = () => {
      if (!active) return;
      navigation.navigate('ActiveCrossing', {
        crossingId: active.id,
        portName: active.port_name
          ? `${active.port_name}${active.lane_type ? ` · ${LANE_LABEL[active.lane_type] || active.lane_type}` : ''}`
          : 'Cruce en curso',
        portId: active.port_id ? String(active.port_id) : undefined,
        laneLabel: active.lane_type ? (LANE_LABEL[active.lane_type] || active.lane_type) : undefined,
        startedAt: active.started_at,
      });
    };

    const finish = async () => {
      try {
        if (active?.id) await crossingsApi.end(active.id);
      } catch { /* ignore */ }
      await checkActive();
    };

    Alert.alert(
      'Ya tienes un cruce en curso',
      'Puedes reanudarlo o terminarlo para iniciar uno nuevo.',
      [
        { text: 'Terminarlo', style: 'destructive', onPress: finish },
        { text: 'Reanudar', onPress: resume },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  if (loadingPorts) {
    return (
      <View style={[styles.safe, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoBar}>
          <Logo variant="dark" size={30} />
        </View>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingHi} numberOfLines={1}>
              {saludoPorHora(now)}{firstName ? `, ${firstName}` : ''} 👋
            </Text>
            <Text style={styles.greetingSub}>Garita · {CITY_LABEL[city] || city}</Text>
          </View>
          <TouchableOpacity
            style={styles.userBadge}
            onPress={() => setAvatarPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.avatar}>{user?.avatar_key || '😎'}</Text>
          </TouchableOpacity>
        </View>

        {activeCrossing && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() =>
              navigation.navigate('ActiveCrossing', {
                crossingId: activeCrossing.id,
                portName: activeCrossing.port_name
                  ? `${activeCrossing.port_name}${activeCrossing.lane_type ? ` · ${LANE_LABEL[activeCrossing.lane_type] || activeCrossing.lane_type}` : ''}`
                  : 'Cruce en curso',
                portId: activeCrossing.port_id ? String(activeCrossing.port_id) : undefined,
                laneLabel: activeCrossing.lane_type ? (LANE_LABEL[activeCrossing.lane_type] || activeCrossing.lane_type) : undefined,
                startedAt: activeCrossing.started_at,
              })
            }
          >
            <View>
              <Text style={styles.activeBannerText}>⏱️ Cruce activo: {formattedTime}</Text>
              <Text style={styles.activeBannerSub}>🔒 Garita bloqueada • Toca para ver</Text>
            </View>
          </TouchableOpacity>
        )}

        {reco?.recommended && (() => {
          const rec = reco.recommended;
          const isCurrent = port && String(rec.port_id) === String(port.id);
          const curOpt = (reco.options || []).find(
            (o: any) => port && String(o.port_id) === String(port.id)
          );
          const savings = curOpt ? Number(curOpt.effective_wait) - Number(rec.effective_wait) : null;
          const laneTxt = rec.lane ? ` · ${LANE_LABEL[rec.lane] || rec.lane}` : '';
          return (
            <TouchableOpacity
              style={styles.hero}
              activeOpacity={locked ? 1 : 0.85}
              onPress={() => { if (!locked && rec.code) setPortCode(rec.code); }}
            >
              <Text style={styles.heroKicker}>👥 La comunidad recomienda</Text>
              <Text style={styles.heroGarita}>
                {isCurrent ? `${rec.name}${laneTxt} es la más rápida` : `Cruza por ${rec.name}${laneTxt}`}
              </Text>
              <View style={styles.heroBigRow}>
                <Text style={styles.heroBig}>~{rec.effective_wait}</Text>
                <Text style={styles.heroBigUnit}>min</Text>
              </View>
              {!isCurrent && savings != null && savings > 0 && (
                <Text style={styles.heroDelta}>
                  {savings} min más rápido que {port?.name}
                </Text>
              )}
              {!isCurrent && (
                <View style={styles.heroBtn}>
                  <Text style={styles.heroBtnTxt}>Cambiar a {rec.name} ›</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })()}

        {visiblePorts.length === 0 ? (
          <View style={styles.section}>
            <Text style={styles.empty}>
              No hay garitas disponibles para {CITY_LABEL[city] || city}.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.selectorBlock}>
              <Text style={styles.selectorLabel}>
                Garita · {CITY_LABEL[city] || city}{locked ? '  🔒' : ''}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {visiblePorts.map((p) => (
                  <TouchableOpacity
                    key={p.code}
                    style={[
                      styles.tab,
                      portCode === p.code && styles.tabActive,
                      locked && styles.tabLocked,
                    ]}
                    onPress={() => { if (!locked) setPortCode(p.code); }}
                    activeOpacity={locked ? 1 : 0.75}
                  >
                    <Text style={[styles.tabText, portCode === p.code && styles.tabTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {modes.length > 1 && (
              <View style={styles.selectorBlock}>
                <Text style={styles.selectorLabel}>Tipo de cruce</Text>
                <View style={styles.typeRow}>
                  {modes.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.typeChip,
                        mode === m && styles.typeChipActive,
                        locked && styles.tabLocked,
                      ]}
                      onPress={() => { if (!locked) setMode(m); }}
                      activeOpacity={locked ? 1 : 0.75}
                    >
                      <Text style={[styles.typeChipText, mode === m && styles.typeChipTextActive]}>
                        {m === 'VEHICULAR' ? '🚗 Vehicular' : '🚶 Peatonal'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {lanes.length > 1 && (
              <View style={styles.selectorBlock}>
                <Text style={styles.selectorLabel}>Carril</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {lanes.map((l) => {
                    const closed = l === 'PEDWEST' && !pedwestOpen;
                    return (
                      <TouchableOpacity
                        key={l}
                        style={[
                          styles.tab,
                          lane === l && styles.tabActive,
                          (locked || closed) && styles.tabLocked,
                        ]}
                        onPress={() => { if (!locked) setLane(l); }}
                        activeOpacity={locked ? 1 : 0.75}
                      >
                        <Text style={[styles.tabText, lane === l && styles.tabTextActive]}>
                          {LANE_LABEL[l] || l}{closed ? ' · cerrado' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {laneBlocked && (
              <View style={styles.section}>
                <View style={styles.closedBox}>
                  <Text style={styles.closedTitle}>PedWest está cerrado</Text>
                  <Text style={styles.closedText}>
                    Horario de operación: 6:00 a.m. a 2:00 p.m.{'\n'}
                    Fuente: CBP.gov · sujeto a cambios sin previo aviso.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <FlowIndexCard
                data={flowData}
                loading={flowLoading}
                portName={`${isPedwest ? 'PedWest' : port?.name ?? ''} · ${mode === 'PEDESTRIAN' ? 'Peatonal' : 'Vehicular'}`}
              />
            </View>

            {/* Detector en vivo "¿Estás en la línea?" (GPS vs geocerca) */}
            <View style={styles.section}>
              <View
                style={[
                  styles.lineBox,
                  lineStatus === 'IN_LINE'
                    ? styles.lineIn
                    : lineStatus === 'OUTSIDE'
                    ? styles.lineOut
                    : styles.lineUnknown,
                ]}
              >
                <Text style={styles.lineDot}>
                  {lineStatus === 'IN_LINE' ? '🟢' : lineStatus === 'OUTSIDE' ? '⚪' : '📍'}
                </Text>
                <Text style={styles.lineText}>
                  {lineStatus === 'IN_LINE'
                    ? 'Estás en la línea de esta garita'
                    : lineStatus === 'OUTSIDE'
                    ? 'No estás en la línea de esta garita'
                    : 'Detectando tu ubicación…'}
                </Text>
              </View>
            </View>

            {/* Iniciar cruce — debajo de la pastilla de estimación */}
            {!activeCrossing && targetPortId && !laneBlocked && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.ctaBtn, (loadingStart || lineStatus === 'OUTSIDE') && styles.ctaBtnDisabled]}
                  onPress={handleStartCrossing}
                  disabled={loadingStart || lineStatus === 'OUTSIDE'}
                  activeOpacity={0.85}
                >
                  {loadingStart ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Text style={styles.ctaBtnText}>▶  Iniciar cruce por orden</Text>
                      <Text style={styles.ctaBtnSub}>
                        {lineStatus === 'OUTSIDE'
                          ? 'Disponible cuando estés en la línea'
                          : `${isPedwest ? 'PedWest' : port?.name} · ${LANE_LABEL[lane] || lane}`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={styles.section}>
          <View style={styles.commHeader}>
            <Text style={styles.sectionTitle}>Comunidad (última hora)</Text>
            {shownReports.length > 0 && (
              <Text style={styles.commCount}>
                {shownReports.length} reporte{shownReports.length === 1 ? '' : 's'}
              </Text>
            )}
          </View>

          {shownReports.length === 0 ? (
            <Text style={styles.empty}>Sin reportes recientes. ¡Sé el primero!</Text>
          ) : (
            shownReports.map((e) => {
              const meta = EVENT_META[e.event_type] ?? EVENT_META.other;
              const crossMin = e.crossing_seconds ? Math.round(e.crossing_seconds / 60) : null;
              const laneTxt = e.lane_type ? (LANE_LABEL[e.lane_type] || e.lane_type) : '';
              const avBg = AV_BG[(e.reporter_name?.charCodeAt(0) ?? 0) % AV_BG.length];
              return (
                <View key={e.id} style={styles.evtCard}>
                  <View style={[styles.evtAvatar, { backgroundColor: avBg }]}>
                    <Text style={styles.evtAvatarTxt}>{e.reporter_avatar || '🙂'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.evtTopRow}>
                      <Text style={styles.evtName} numberOfLines={1}>{e.reporter_name}</Text>
                      <Text style={styles.evtWhere} numberOfLines={1}>
                        {reportsPortLabel}{laneTxt ? ` · ${laneTxt}` : ''}
                      </Text>
                    </View>
                    <View style={styles.evtChipRow}>
                      <View style={[styles.evtChip, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.evtChipTxt, { color: meta.color }]}>
                          {meta.icon} {meta.label}
                        </Text>
                      </View>
                      {crossMin != null && (
                        <Text style={styles.evtCrossed}>Cruzó en {crossMin} min</Text>
                      )}
                      {e.geo_validation_status === 'VALIDATED_IN_LINE' && (
                        <Text style={styles.evtValidated}>✓ Ubicación validada</Text>
                      )}
                    </View>
                    <Text style={styles.evtFoot}>{hace(e.created_at)} · +{e.xp ?? 20} XP</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.evtConfirm}
                    onPress={() => handleConfirm(e.id)}
                    disabled={confirming === e.id}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.evtConfirmTxt}>👍 {e.confirmations}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {targetPortId && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.notifCard}
              onPress={toggleNotif}
              disabled={notifLoading}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>
                  🔔 Avisos de {reportsPortLabel}
                  {targetLane ? ` · ${LANE_LABEL[targetLane] || targetLane}` : ''}
                </Text>
                <Text style={styles.notifSub}>
                  {notifEnabled
                    ? 'Activados — te avisamos si esta garita cambia'
                    : 'Recibe un aviso si se satura, cierra un carril o fluye rápido'}
                </Text>
              </View>
              {notifLoading ? (
                <ActivityIndicator color={Colors.green} />
              ) : (
                <View style={[styles.switch, notifEnabled && styles.switchOn]}>
                  <View style={[styles.knob, notifEnabled && styles.knobOn]} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Selector de avatar */}
      <Modal
        visible={avatarPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAvatarPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Elige tu avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.map((emoji) => {
                const active = (user?.avatar_key || '😎') === emoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.avatarCell, active && styles.avatarCellActive]}
                    onPress={() => changeAvatar(emoji)}
                    disabled={savingAvatar}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.avatarCellEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.modalClose} onPress={() => setAvatarPickerOpen(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  userBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.darkTile,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  avatar: { fontSize: 22 },
  greetingHi: { color: Colors.darkText, fontSize: 20, fontWeight: '800' },
  greetingSub: { color: Colors.darkTextSecondary, fontSize: 13, marginTop: 2 },
  logoBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2 },
  recoBanner: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: '#0F2A4A', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(92,147,255,0.4)',
  },
  recoText: { color: '#DDE9FF', fontSize: 13.5, fontWeight: '700' },
  recoHint: { color: Colors.commBlue, fontSize: 11, marginTop: 3, fontWeight: '600' },
  hero: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: Colors.darkTileBlue, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: 'rgba(110,168,255,0.4)',
  },
  heroKicker: {
    color: Colors.commBlue, fontSize: 11, fontWeight: '800',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  heroGarita: { color: Colors.darkText, fontSize: 19, fontWeight: '800', marginTop: 4 },
  heroBigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  heroBig: { color: Colors.commBlue, fontSize: 32, fontWeight: '800' },
  heroBigUnit: { color: Colors.commBlue, fontSize: 14, fontWeight: '700' },
  heroDelta: { color: '#BCD0F5', fontSize: 12.5, marginTop: 2 },
  heroBtn: {
    marginTop: 12, backgroundColor: Colors.primary, borderRadius: 11,
    paddingVertical: 11, alignItems: 'center',
  },
  heroBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  lineBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1,
  },
  lineIn: { backgroundColor: 'rgba(47,191,113,0.12)', borderColor: 'rgba(47,191,113,0.45)' },
  lineOut: { backgroundColor: Colors.darkTile, borderColor: Colors.darkBorder },
  lineUnknown: { backgroundColor: Colors.darkTile, borderColor: Colors.darkBorder },
  lineDot: { fontSize: 14 },
  lineText: { color: Colors.darkText, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  activeBanner: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: Colors.darkSurface,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  activeBannerText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  activeBannerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  selectorBlock: { paddingHorizontal: 20, marginTop: 16 },
  selectorLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.darkTextMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    marginRight: 8, backgroundColor: Colors.darkTile,
    borderWidth: 1.5, borderColor: Colors.darkBorder,
  },
  tabActive: { backgroundColor: '#1C2E6E', borderColor: '#2E4088' },
  tabLocked: { opacity: 0.5 },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.darkTextSecondary },
  tabTextActive: { color: Colors.white },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.darkTile, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.darkBorder,
  },
  typeChipActive: { backgroundColor: Colors.blueFlow, borderColor: Colors.blueFlow },
  typeChipText: { fontSize: 14, fontWeight: '600', color: Colors.darkTextSecondary },
  typeChipTextActive: { color: Colors.white },
  closedBox: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.35)',
  },
  closedTitle: { fontSize: 15, fontWeight: '700', color: '#F5C97A', marginBottom: 6 },
  closedText: { fontSize: 13, color: '#E4B770', lineHeight: 19 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: Colors.darkTextSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  eventCard: {
    backgroundColor: Colors.darkSurface, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  eventBorder: { width: 4, alignSelf: 'stretch' },
  eventContent: { flex: 1, padding: 12 },
  eventType: { fontSize: 14, fontWeight: '700', color: Colors.darkText },
  eventMeta: { fontSize: 12, color: Colors.darkTextSecondary, marginTop: 2 },
  eventTime: { fontSize: 12, color: Colors.darkTextMuted, paddingRight: 12 },
  empty: { color: Colors.darkTextMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },

  // Comunidad (tarjeta nueva)
  commHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  commCount: { fontSize: 12, fontWeight: '700', color: Colors.darkTextMuted },
  evtCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.darkSurface, borderRadius: 14, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.darkBorder,
  },
  evtAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  evtAvatarTxt: { fontSize: 20 },
  evtTopRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  evtName: { fontSize: 14, fontWeight: '800', color: Colors.darkText },
  evtWhere: { fontSize: 12, color: Colors.darkTextMuted, flexShrink: 1 },
  evtChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  evtChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  evtChipTxt: { fontSize: 12, fontWeight: '700' },
  evtCrossed: { fontSize: 13, fontWeight: '700', color: Colors.commBlue },
  evtValidated: { fontSize: 12, fontWeight: '700', color: Colors.confGreen },
  evtFoot: { fontSize: 12, color: Colors.darkTextMuted, marginTop: 6 },
  evtConfirm: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.darkTile, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  evtConfirmTxt: { fontSize: 13, fontWeight: '700', color: Colors.darkTextSecondary },

  // Avisos (toggle de notificaciones)
  notifCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.darkSurface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  notifTitle: { fontSize: 15, fontWeight: '700', color: Colors.darkText },
  notifSub: { fontSize: 12, color: Colors.darkTextSecondary, marginTop: 3 },
  switch: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: Colors.darkTile, borderWidth: 1, borderColor: Colors.darkBorder,
    padding: 3, justifyContent: 'center',
  },
  switchOn: { backgroundColor: Colors.green, borderColor: Colors.green },
  knob: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#9AA6C8',
  },
  knobOn: { backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },
  ctaBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaBtnText: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  ctaBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },

  // Modal selector de avatar
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.darkSurface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  avatarCell: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.darkTile,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarCellActive: {
    borderColor: Colors.green,
    backgroundColor: 'rgba(0,131,79,0.18)',
  },
  avatarCellEmoji: { fontSize: 24 },
  modalClose: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.darkTile,
    alignItems: 'center',
  },
  modalCloseText: { color: Colors.darkTextSecondary, fontSize: 15, fontWeight: '700' },
});
