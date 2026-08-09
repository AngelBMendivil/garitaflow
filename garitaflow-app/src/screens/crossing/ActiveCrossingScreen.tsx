import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../lib/types';
import { Colors } from '../../lib/colors';
import { useCrossing } from '../../hooks/useCrossing';
import { flowEventsApi } from '../../lib/api';
import ShareCrossingButton from '../../components/ShareCrossingButton';
import { useLineDetector } from '../../hooks/useLineDetector';
import Logo from '../../components/Logo';
import Confetti from '../../components/Confetti';

// Formatea un ISO a hora local 12h (ej. "8:10 a.m."). Robusto en Hermes.
function fmtTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? 'a.m.' : 'p.m.';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ActiveCrossing'>;
  route: RouteProp<RootStackParamList, 'ActiveCrossing'>;
};

const QUICK_EVENTS = [
  { type: 'slow_movement', emoji: '🐢', label: 'Lento' },
  { type: 'fast_movement', emoji: '🚀', label: 'Rápido' },
  { type: 'lane_open',     emoji: '✅', label: 'Abierto' },
  { type: 'lane_closed',   emoji: '🚫', label: 'Cerrado' },
];

const EVENT_LABEL: Record<string, string> = {
  slow_movement: 'Flujo lento',
  fast_movement: 'Flujo rápido',
  lane_open: 'Carril abierto',
  lane_closed: 'Carril cerrado',
  incident: 'Incidente',
  other: 'Reporte',
};

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  return `hace ${Math.floor(mins / 60)} h`;
};

export default function ActiveCrossingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { crossingId, portName, laneLabel, portId: routePortId } = route.params;
  const { activeCrossing, formattedTime, endCrossing, loading } = useCrossing();
  const lineStatus = useLineDetector(activeCrossing?.port_id ?? null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentType, setSentType] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState<{
    minutes: number;
    startedAt?: string;
    endedAt?: string;
  } | null>(null);

  const loadEvents = useCallback(() => {
    if (!activeCrossing?.port_id) return;
    flowEventsApi
      .list(activeCrossing.port_id, 60)
      .then((e) => setRecentEvents(e.slice(0, 4)))
      .catch(() => setRecentEvents([]));
  }, [activeCrossing?.port_id]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleEnd = () => {
    if (Platform.OS === 'web') {
      setConfirmEnd(true);
    } else {
      const { Alert } = require('react-native');
      Alert.alert('Terminar cruce', '¿Terminaste de cruzar?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, terminé', onPress: doEndCrossing },
      ]);
    }
  };

  const doEndCrossing = async () => {
    setConfirmEnd(false);
    const result: any = await endCrossing();
    if (result) {
      const secs = Number(result.duration_seconds) || 0;
      setFinished({
        minutes: Math.max(1, Math.round(secs / 60)),
        startedAt: result.started_at,
        endedAt: result.ended_at,
      });
    }
  };

  // El reporte rápido ahora sí envía el tipo, sin pasar por otra pantalla.
  const handleQuickEvent = async (type: string) => {
    const pid = String(activeCrossing?.port_id || routePortId || '');
    if (!pid || sending) return;
    if (lineStatus === 'OUTSIDE') {
      setFeedback('Solo puedes reportar cuando estás en la línea de esta garita.');
      return;
    }
    setSending(type);
    setFeedback(null);
    try {
      await flowEventsApi.create({
        port_id: pid,
        crossing_id: crossingId,
        event_type: type,
        lane_type: activeCrossing?.lane_type,
      });
      setSentType(type);
      setFeedback(`${EVENT_LABEL[type]} reportado · +20 XP`);
      loadEvents();
      setTimeout(() => setSentType(null), 2500);
    } catch (err: any) {
      setFeedback(err?.message || 'No se pudo enviar el reporte');
    } finally {
      setSending(null);
    }
  };

  if (finished) {
    return (
      <View style={styles.safe}>
        <ScrollView
          contentContainerStyle={[
            styles.finishWrap,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Logo variant="light" size={30} />

          <Text style={styles.finishEmoji}>🎉</Text>
          <Text style={styles.finishTitle}>¡Cruzaste!</Text>
          <Text style={styles.finishBig}>{finished.minutes} min</Text>

          {/* Dónde cruzaste: garita + carril */}
          <View style={styles.finishWhereRow}>
            <Text style={styles.finishWhere}>{portName}</Text>
            {laneLabel && !portName.includes(laneLabel) ? (
              <Text style={styles.finishLane}>{laneLabel}</Text>
            ) : null}
          </View>

          {/* Horas de inicio y fin */}
          <View style={styles.timesCard}>
            <View style={styles.timeCell}>
              <Text style={styles.timeLabel}>Inicio</Text>
              <Text style={styles.timeValue}>{fmtTime(finished.startedAt)}</Text>
            </View>
            <Text style={styles.timeArrow}>→</Text>
            <View style={styles.timeCell}>
              <Text style={styles.timeLabel}>Fin</Text>
              <Text style={styles.timeValue}>{fmtTime(finished.endedAt)}</Text>
            </View>
          </View>

          <Text style={styles.finishNote}>
            Tu tiempo se sumó al promedio de la comunidad para esta garita.
          </Text>

          <View style={styles.finishActions}>
            <ShareCrossingButton
              moment="finish"
              portName={portName}
              minutes={finished.minutes}
              fullWidth
            />
            <TouchableOpacity
              style={styles.finishDone}
              onPress={() => navigation.replace('MainTabs' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.finishDoneTxt}>Listo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        {/* Confeti encima de todo (no bloquea toques) */}
        <Confetti />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.portLabel} numberOfLines={1}>{portName}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Tiempo de cruce</Text>
          <Text style={styles.timer}>{formattedTime}</Text>
          <View style={styles.pulseIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.pulseText}>En progreso</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>¿Cómo va la fila? (+20 XP)</Text>
        <Text style={styles.sectionHint}>
          Tu reporte ayuda a quienes vienen atrás.
        </Text>

        <View style={styles.quickEvents}>
          {QUICK_EVENTS.map((e) => (
            <TouchableOpacity
              key={e.type}
              style={[
                styles.quickEvent,
                sentType === e.type && styles.quickEventSent,
                lineStatus === 'OUTSIDE' && styles.quickEventLocked,
              ]}
              onPress={() => handleQuickEvent(e.type)}
              disabled={!!sending || lineStatus === 'OUTSIDE'}
              activeOpacity={0.75}
            >
              {sending === e.type ? (
                <ActivityIndicator color={Colors.navyGarita} />
              ) : (
                <>
                  <Text style={styles.quickEmoji}>{sentType === e.type ? '✔️' : e.emoji}</Text>
                  <Text style={styles.quickLabel}>{e.label}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.quickEvent, lineStatus === 'OUTSIDE' && styles.quickEventLocked]}
            onPress={() => {
              if (lineStatus === 'OUTSIDE') {
                setFeedback('Solo puedes reportar cuando estás en la línea de esta garita.');
                return;
              }
              const pid = String(activeCrossing?.port_id || routePortId || '');
              if (!pid) {
                setFeedback('No pudimos identificar la garita de este cruce. Reintenta en un momento.');
                return;
              }
              navigation.navigate('Report', { crossingId, portId: pid });
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.quickEmoji}>📋</Text>
            <Text style={styles.quickLabel}>Más...</Text>
          </TouchableOpacity>
        </View>

        {feedback && (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        )}

        <View style={{ height: 12 }} />
        <ShareCrossingButton moment="start" portName={portName} compact />

        {recentEvents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Comunidad ahora</Text>
            {recentEvents.map((e) => (
              <View key={e.id} style={styles.communityEvent}>
                <View style={styles.communityLeft}>
                  <Text style={styles.communityEventType}>
                    {EVENT_LABEL[e.event_type] || e.event_type}
                  </Text>
                  <Text style={styles.communityEventMeta}>
                    {e.reporter_name || 'Anónimo'} · {timeAgo(e.created_at)}
                  </Text>
                </View>
                {e.confirmations > 0 && (
                  <View style={styles.confirmBadge}>
                    <Text style={styles.confirmBadgeText}>👍 {e.confirmations}</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        <Text style={styles.autoNote}>
          📍 Al terminar, tu tiempo se suma al promedio de la comunidad para esta garita.
        </Text>

        {confirmEnd && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>¿Terminaste de cruzar?</Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity style={styles.confirmNo} onPress={() => setConfirmEnd(false)}>
                <Text style={styles.confirmNoText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmYes} onPress={doEndCrossing} disabled={loading}>
                <Text style={styles.confirmYesText}>Sí, terminé</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!confirmEnd && (
          <TouchableOpacity
            style={[styles.endBtn, loading && styles.endBtnDisabled]}
            onPress={handleEnd}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.endBtnText}>⏹  Terminar cruce</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.navyGarita,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backText: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
  portLabel: { color: Colors.white, fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  timerContainer: { alignItems: 'center', paddingTop: 20 },
  timerLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 4 },
  timer: {
    color: Colors.white,
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  pulseIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  pulseText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navyGarita,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 16,
  },
  sectionHint: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  quickEvents: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickEvent: {
    width: '30%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 76,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  quickEventSent: { borderColor: Colors.green, backgroundColor: '#E8F5EF' },
  quickEventLocked: { opacity: 0.45 },
  quickEmoji: { fontSize: 28 },
  quickLabel: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  feedbackBox: {
    backgroundColor: '#E8F5EF',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  feedbackText: { fontSize: 13, fontWeight: '600', color: Colors.green, textAlign: 'center' },
  communityEvent: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  communityLeft: { flex: 1 },
  communityEventType: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  communityEventMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  confirmBadge: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confirmBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  autoNote: {
    fontSize: 12,
    color: Colors.textMuted,
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    lineHeight: 18,
  },
  endBtn: {
    backgroundColor: Colors.red,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  endBtnDisabled: { opacity: 0.6 },
  endBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  confirmBox: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: Colors.red,
  },
  confirmText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 14 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  confirmNo: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.cardBorder, alignItems: 'center' },
  confirmNoText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmYes: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.red, alignItems: 'center' },
  confirmYesText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  finishWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  finishEmoji: { fontSize: 56, marginTop: 18 },
  finishTitle: { fontSize: 26, fontWeight: '800', color: Colors.navyGarita, marginTop: 8 },
  finishBig: { fontSize: 56, fontWeight: '800', color: Colors.green, marginTop: 6 },
  finishWhereRow: { alignItems: 'center', marginTop: 4, gap: 2 },
  finishWhere: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  finishLane: { fontSize: 14, fontWeight: '700', color: Colors.blueFlow },
  timesCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18,
    backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22,
    marginTop: 16, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  timeCell: { alignItems: 'center' },
  timeLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeValue: { fontSize: 17, fontWeight: '800', color: Colors.navyGarita, marginTop: 2 },
  timeArrow: { fontSize: 18, color: Colors.textMuted, fontWeight: '700' },
  finishNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 14, textAlign: 'center', lineHeight: 19 },
  finishActions: { width: '100%', maxWidth: 320, alignSelf: 'center', marginTop: 20, gap: 10 },
  finishDone: {
    paddingVertical: 15, borderRadius: 14, alignItems: 'center',
    backgroundColor: '#E9EEF6', borderWidth: 1.5, borderColor: '#CBD5E1',
  },
  finishDoneTxt: { fontSize: 16, fontWeight: '800', color: Colors.navyGarita },
});