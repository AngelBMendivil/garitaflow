import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../lib/colors';
import { useAuth } from '../../context/AuthContext';
import { recurringApi, portsApi } from '../../lib/api';
import { useNotifications } from '../../hooks/useNotifications';
import Logo from '../../components/Logo';
import EsperaPorHora from '../../components/EsperaPorHora';
import TimePicker from '../../components/TimePicker';

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // 0=Dom .. 6=Sáb
const LANE_LABEL: Record<string, string> = {
  GENERAL: 'General',
  READY: 'Ready Lane',
  SENTRI: 'SENTRI',
  PEDWEST: 'PedWest',
};
const SENS_LABEL: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
const HHMM = /^(\d{1,2}):(\d{2})$/;

function daysText(days: number[]): string {
  const s = [...days].sort();
  if (s.length === 7) return 'Todos los días';
  if (s.length === 5 && s.join() === '1,2,3,4,5') return 'Lun–Vie';
  if (s.length === 2 && s.join() === '0,6') return 'Fines de semana';
  return s.map((d) => DAY_LABELS[d]).join(' ');
}

type Port = { id: number | string; name: string; lanes?: { mode: string; lane_type: string }[] };

export default function MyCrossingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requestPermission, registerForPush } = useNotifications();
  const city = user?.selected_city || 'tijuana';

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ports, setPorts] = useState<Port[]>([]);

  // formulario
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fPort, setFPort] = useState<string>('');
  const [fLane, setFLane] = useState<string>('GENERAL');
  const [fTime, setFTime] = useState<string>('05:00');
  const [fDays, setFDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [fSens, setFSens] = useState<'low' | 'medium' | 'high'>('medium');
  const [fLead, setFLead] = useState<number>(45);

  const load = useCallback(async () => {
    try {
      const rows = await recurringApi.list();
      setItems(rows || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    portsApi
      .list(city)
      .then((ps: any[]) => {
        const list = (ps || []).filter((p) => (p.lanes || []).length > 0);
        setPorts(list);
        if (list[0]) setFPort(String(list[0].id));
      })
      .catch(() => setPorts([]));
  }, [city, load]);

  const toggleDay = (d: number) =>
    setFDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const lanesForPort = (): string[] => {
    const p = ports.find((x) => String(x.id) === fPort);
    if (!p?.lanes) return ['GENERAL'];
    const veh = Array.from(new Set(p.lanes.filter((l) => l.mode === 'VEHICULAR').map((l) => l.lane_type)));
    return veh.length ? veh : ['GENERAL'];
  };

  const save = async () => {
    if (!fPort) return Alert.alert('Falta la garita', 'Elige una garita.');
    if (!HHMM.test(fTime)) return Alert.alert('Hora inválida', 'Usa el formato HH:MM (ej. 03:00).');
    if (fDays.length === 0) return Alert.alert('Faltan días', 'Elige al menos un día.');
    setSaving(true);
    try {
      // La alarma necesita permiso de notificaciones + token registrado,
      // si no, no hay a dónde mandar el aviso. Se pide al crear la alarma.
      const granted = await requestPermission();
      if (granted) {
        await registerForPush();
      }

      await recurringApi.create({
        port_id: fPort,
        lane_type: fLane,
        mode: 'VEHICULAR',
        days_of_week: fDays,
        target_time: fTime,
        lead_minutes: fLead,
        sensitivity: fSens,
      });
      setOpen(false);
      await load();

      if (!granted) {
        Alert.alert(
          'Alarma guardada',
          'Para recibir el aviso activa las notificaciones de GaritaFlow en los ajustes de tu teléfono.'
        );
      }
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (it: any) => {
    try {
      await recurringApi.update(it.id, { active: !it.active });
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, active: !x.active } : x)));
    } catch {}
  };

  const remove = (it: any) => {
    Alert.alert('Eliminar alarma', '¿Quitar este cruce recurrente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await recurringApi.remove(it.id);
            setItems((prev) => prev.filter((x) => x.id !== it.id));
          } catch {}
        },
      },
    ]);
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.logoBar}>
          <Logo variant="dark" size={30} />
        </View>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mis cruces recurrentes</Text>
        </View>
        <Text style={styles.subtitle}>
          Como una alarma: te avisamos si tu cruce trae más fila de lo normal.
        </Text>

        {loading ? (
          <ActivityIndicator color={Colors.green} style={{ marginTop: 30 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Aún no tienes cruces recurrentes. Crea el primero abajo.</Text>
        ) : (
          items.map((it) => (
            <View key={it.id} style={[styles.card, !it.active && styles.cardOff]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTime}>{it.target_time}</Text>
                <Text style={styles.cardLine}>
                  {it.port_name} · {LANE_LABEL[it.lane_type] || it.lane_type}
                </Text>
                <Text style={styles.cardMeta}>
                  {daysText(it.days_of_week || [])} · aviso {it.lead_minutes} min antes · sensib. {SENS_LABEL[it.sensitivity]}
                </Text>
                <TouchableOpacity onPress={() => remove(it)}>
                  <Text style={styles.deleteLink}>Eliminar</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => toggleActive(it)} activeOpacity={0.8}>
                <View style={[styles.switch, it.active && styles.switchOn]}>
                  <View style={[styles.knob, it.active && styles.knobOn]} />
                </View>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => setOpen(true)} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Nuevo cruce recurrente</Text>
        </TouchableOpacity>

        <EsperaPorHora portId={ports[0]?.id ?? null} hasSentri={user?.has_sentri} />
      </ScrollView>

      {/* Modal crear alarma */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>Nuevo cruce recurrente</Text>

              <Text style={styles.label}>Garita</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                {ports.map((p) => {
                  const on = String(p.id) === fPort;
                  return (
                    <TouchableOpacity
                      key={String(p.id)}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => { setFPort(String(p.id)); setFLane('GENERAL'); }}
                    >
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{p.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>Carril</Text>
              <View style={styles.rowWrap}>
                {lanesForPort().map((l) => {
                  const on = l === fLane;
                  return (
                    <TouchableOpacity key={l} style={[styles.chip, on && styles.chipOn]} onPress={() => setFLane(l)}>
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{LANE_LABEL[l] || l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Hora del cruce</Text>
              <TimePicker value={fTime} onChange={setFTime} />

              <Text style={styles.label}>Días</Text>
              <View style={styles.rowWrap}>
                {DAY_LABELS.map((lbl, idx) => {
                  const on = fDays.includes(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.dayChip, on && styles.chipOn]}
                      onPress={() => toggleDay(idx)}
                    >
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{lbl}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Avísame antes</Text>
              <View style={styles.rowWrap}>
                {[30, 45, 60, 90].map((m) => {
                  const on = m === fLead;
                  return (
                    <TouchableOpacity key={m} style={[styles.chip, on && styles.chipOn]} onPress={() => setFLead(m)}>
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{m} min</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Sensibilidad</Text>
              <View style={styles.rowWrap}>
                {(['low', 'medium', 'high'] as const).map((s) => {
                  const on = s === fSens;
                  return (
                    <TouchableOpacity key={s} style={[styles.chip, on && styles.chipOn]} onPress={() => setFSens(s)}>
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{SENS_LABEL[s]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Guardar alarma</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)}>
                <Text style={styles.cancelTxt}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  logoBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2 },
  headerRow: { paddingHorizontal: 20, marginTop: 8 },
  title: { color: Colors.darkText, fontSize: 22, fontWeight: '800' },
  subtitle: { color: Colors.darkTextSecondary, fontSize: 13, paddingHorizontal: 20, marginTop: 4 },
  empty: { color: Colors.darkTextMuted, textAlign: 'center', marginTop: 30, paddingHorizontal: 30 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.darkSurface, borderRadius: 14, padding: 14,
    marginHorizontal: 20, marginTop: 12,
    borderWidth: 1, borderColor: Colors.darkBorder, borderLeftWidth: 4, borderLeftColor: Colors.blueFlow,
  },
  cardOff: { opacity: 0.55, borderLeftColor: Colors.darkTextMuted },
  cardTime: { color: Colors.darkText, fontSize: 22, fontWeight: '800' },
  cardLine: { color: Colors.darkTextSecondary, fontSize: 13, marginTop: 2, fontWeight: '600' },
  cardMeta: { color: Colors.darkTextMuted, fontSize: 12, marginTop: 3 },
  deleteLink: { color: '#FF6B7D', fontSize: 12, fontWeight: '700', marginTop: 8 },
  addBtn: {
    backgroundColor: Colors.blueFlow, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginHorizontal: 20, marginTop: 18,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  proCard: {
    marginHorizontal: 20, marginTop: 18, backgroundColor: Colors.darkTile,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.darkBorder,
  },
  proTag: { color: '#FFCF6B', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  proText: { color: Colors.darkTextSecondary, fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  switch: {
    width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.darkTile,
    borderWidth: 1, borderColor: Colors.darkBorder, padding: 3, justifyContent: 'center',
  },
  switchOn: { backgroundColor: Colors.green, borderColor: Colors.green },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#9AA6C8' },
  knobOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.darkSurface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 20, maxHeight: '88%', borderWidth: 1, borderColor: Colors.darkBorder,
  },
  sheetTitle: { color: Colors.darkText, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  label: {
    color: Colors.darkTextMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 8,
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: Colors.darkTile, borderWidth: 1.5, borderColor: Colors.darkBorder,
  },
  chipOn: { backgroundColor: '#1C2E6E', borderColor: '#2E4088' },
  chipTxt: { color: Colors.darkTextSecondary, fontSize: 13, fontWeight: '600' },
  chipTxtOn: { color: '#fff' },
  dayChip: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.darkTile, borderWidth: 1.5, borderColor: Colors.darkBorder,
  },
  input: {
    backgroundColor: Colors.darkTile, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.darkText, fontSize: 16, borderWidth: 1, borderColor: Colors.darkBorder,
  },
  saveBtn: {
    backgroundColor: Colors.green, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 24,
  },
  saveTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelTxt: { color: Colors.darkTextSecondary, fontSize: 14, fontWeight: '600' },
});
