import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { RootStackParamList, EventType } from '../../lib/types';
import { Colors } from '../../lib/colors';
import { flowEventsApi } from '../../lib/api';

/** Ubicación actual (best-effort). null si no hay permiso o falla. */
async function getCoords(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
    };
  } catch {
    return null;
  }
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Report'>;
  route: RouteProp<RootStackParamList, 'Report'>;
};

const EVENT_OPTIONS: { type: EventType; emoji: string; label: string; desc: string }[] = [
  { type: 'slow_movement',  emoji: '🐢', label: 'Avance lento',   desc: 'Tráfico muy pausado' },
  { type: 'fast_movement',  emoji: '🚀', label: 'Flujo rápido',   desc: 'Carriles fluyendo bien' },
  { type: 'lane_open',      emoji: '✅', label: 'Carril abierto', desc: 'Nuevo carril disponible' },
  { type: 'lane_closed',    emoji: '🚫', label: 'Carril cerrado', desc: 'Un carril fuera de servicio' },
  { type: 'incident',       emoji: '🚨', label: 'Incidente',      desc: 'Accidente u obstrucción vial' },
  { type: 'other',          emoji: '💬', label: 'Otro',           desc: 'Situación no listada' },
];

export default function ReportScreen({ navigation, route }: Props) {
  const { crossingId, portId } = route.params;
  const [selected, setSelected] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selected) {
      Alert.alert('Selecciona un evento', 'Elige qué está pasando en tu garita.');
      return;
    }
    setLoading(true);
    try {
      const coords = await getCoords();
      const result = await flowEventsApi.create({
        port_id: portId,
        crossing_id: crossingId || undefined,
        event_type: selected,
        lat: coords?.lat,
        lng: coords?.lng,
        accuracy: coords?.accuracy,
      });
      navigation.replace('ReportSent', {
        eventType: selected,
        xpEarned: result.xp_earned || 20,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo enviar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Bottom sheet header */}
      <View style={styles.handle}>
        <View style={styles.handleBar} />
      </View>

      <Text style={styles.title}>¿Qué está pasando?</Text>
      <Text style={styles.sub}>Tu reporte ayuda a toda la comunidad +20 XP</Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {EVENT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.type}
            style={[styles.option, selected === opt.type && styles.optionSelected]}
            onPress={() => setSelected(opt.type)}
            activeOpacity={0.75}
          >
            <Text style={styles.optionEmoji}>{opt.emoji}</Text>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, selected === opt.type && styles.optionLabelSelected]}>
                {opt.label}
              </Text>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </View>
            {selected === opt.type && (
              <View style={styles.check}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, (!selected || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selected || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>Enviar reporte</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  handle: { alignItems: 'center', paddingTop: 12, marginBottom: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.cardBorder },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navyGarita,
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  sub: { fontSize: 13, color: Colors.textSecondary, paddingHorizontal: 24, marginBottom: 16 },
  list: { flex: 1, paddingHorizontal: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: Colors.green,
    backgroundColor: '#E8F5EF',
  },
  optionEmoji: { fontSize: 26, width: 34 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  optionLabelSelected: { color: Colors.green },
  optionDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  cancelText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  submitBtn: {
    flex: 2,
    backgroundColor: Colors.green,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
