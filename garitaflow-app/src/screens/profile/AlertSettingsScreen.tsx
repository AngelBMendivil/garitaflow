import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../lib/types';
import { Colors } from '../../lib/colors';
import { alertsApi, portsApi } from '../../lib/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AlertSettings'>;
};

// Same hierarchy as HomeScreen
interface AlertRow {
  location: string;      // "San Ysidro"
  cruce: string;         // "Vehicular" | "Peatonal"
  portCode: string;      // "SAN_YSIDRO"
  portId: string | null; // DB id (resolved after port load)
}

const ALERT_ROWS: AlertRow[] = [
  { location: 'San Ysidro', cruce: 'Vehicular', portCode: 'SAN_YSIDRO', portId: null },
  { location: 'San Ysidro', cruce: 'Peatonal',  portCode: 'PED_WEST',   portId: null },
  { location: 'Otay Mesa',  cruce: 'Vehicular', portCode: 'OTAY',       portId: null },
  { location: 'Tecate',     cruce: 'Vehicular', portCode: 'TECATE',     portId: null },
];

export default function AlertSettingsScreen({ navigation }: Props) {
  const [rows, setRows] = useState<AlertRow[]>(ALERT_ROWS);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([portsApi.list(), alertsApi.list()])
      .then(([ports, alerts]: [any[], any[]]) => {
        // Map port codes → DB ids
        const codeToId: Record<string, string> = {};
        ports.forEach((p) => { codeToId[p.code] = String(p.id); });

        const resolved = ALERT_ROWS.map((r) => ({
          ...r,
          portId: codeToId[r.portCode] ?? null,
        }));
        setRows(resolved);

        // Build enabled map from existing alerts
        const em: Record<string, boolean> = {};
        resolved.forEach((r) => {
          if (!r.portId) return;
          const existing = alerts.find((a: any) => String(a.port_id) === r.portId);
          em[r.portCode] = existing?.enabled ?? false;
        });
        setEnabledMap(em);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (row: AlertRow, value: boolean) => {
    if (!row.portId) return;
    setSavingCode(row.portCode);
    setEnabledMap((prev) => ({ ...prev, [row.portCode]: value }));
    try {
      await alertsApi.upsert(row.portId, {
        enabled: value,
        alert_types: ['flow_drop', 'congestion', 'incident'],
        frequency: 'immediate',
      });
    } catch {
      // revert on error
      setEnabledMap((prev) => ({ ...prev, [row.portCode]: !value }));
    }
    setSavingCode(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.navyGarita} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alertas</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Recibe una notificación cuando el flujo cambie en tu garita.
        </Text>

        {/* Column headers */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colHead, { flex: 2 }]}>Locación</Text>
          <Text style={[styles.colHead, { flex: 1.2 }]}>Cruce</Text>
          <Text style={[styles.colHead, { width: 60, textAlign: 'right' }]}>Activar</Text>
        </View>

        {/* Rows */}
        <View style={styles.card}>
          {rows.map((row, idx) => (
            <View
              key={row.portCode}
              style={[styles.row, idx < rows.length - 1 && styles.rowBorder]}
            >
              <Text style={[styles.cellLocation, { flex: 2 }]}>{row.location}</Text>
              <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.cruceIcon}>
                  {row.cruce === 'Vehicular' ? '🚗' : '🚶'}
                </Text>
                <Text style={styles.cellCruce}>{row.cruce}</Text>
              </View>
              <View style={{ width: 60, alignItems: 'flex-end' }}>
                {savingCode === row.portCode ? (
                  <ActivityIndicator size="small" color={Colors.green} />
                ) : (
                  <Switch
                    value={enabledMap[row.portCode] ?? false}
                    onValueChange={(v) => handleToggle(row, v)}
                    trackColor={{ true: Colors.green, false: Colors.cardBorder }}
                    thumbColor={Colors.white}
                    disabled={!row.portId}
                  />
                )}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          💡 Las alertas se envían cuando el Flow Index sube o baja significativamente.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  back: { color: Colors.blueFlow, fontSize: 15, fontWeight: '600', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.navyGarita },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  colHead: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  cellLocation: { fontSize: 15, fontWeight: '700', color: Colors.navyGarita },
  cruceIcon: { fontSize: 16 },
  cellCruce: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  note: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 16,
    lineHeight: 18,
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 10,
  },
});
