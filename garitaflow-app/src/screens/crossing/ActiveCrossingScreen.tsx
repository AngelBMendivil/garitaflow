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
  const { crossingId, portName } = route.params;
  const { activeCrossing, formattedTime, endCrossing, loading } = useCrossing();
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentType, setSentType] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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
    const result = await endCrossing();
    if (result) navigation.replace('MainTabs' as any);
  };

  // El reporte rápido ahora sí envía el tipo, sin pasar por otra pantalla.
  const handleQuickEvent = async (type: string) => {
    if (!activeCrossing?.port_id || sending) return;
    setSending(type);
    setFeedback(null);
    try {
      await flowEventsApi.create({
        port_id: activeCrossing.port_id,
        crossing_id: crossingId,
        event_type: type,
        lane_type: activeCrossing.lane_type,
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
              style={[styles.quickEvent, sentType === e.type && styles.quickEventSent]}
              onPress={() => handleQuickEvent(e.type)}
              disabled={!!sending}
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
            style={styles.quickEvent}
            onPress={() => navigation.navigate('Report', { crossingId, portId: activeCrossing?.port_id || '' })}
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
});