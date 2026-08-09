import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../lib/colors';
import { flowIndexApi } from '../lib/api';

interface Props {
  portId: string | number | null;
  hasSentri?: boolean;
  mode?: string;
}

const H = 96; // alto del área de gráfica

function label12(h: number): string {
  const ampm = h < 12 ? 'am' : 'pm';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${ampm}`;
}

export default function EsperaPorHora({ portId, hasSentri, mode = 'VEHICULAR' }: Props) {
  const [lane, setLane] = useState<'GENERAL' | 'SENTRI'>('GENERAL');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!portId) return;
    setLoading(true);
    flowIndexApi
      .hourly(portId, lane, mode)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [portId, lane, mode]);

  const hours: any[] = data?.hours || [];
  const vals = hours
    .flatMap((h) => [h.historic, h.today])
    .filter((v) => v != null) as number[];
  const max = Math.max(30, ...vals);
  const best = data?.best;
  const worst = data?.worst;
  const now = data?.now;
  const hasData = hours.some((h) => h.historic != null);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>📈 Espera por hora</Text>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.tg, lane === 'GENERAL' && styles.tgOn]}
            onPress={() => setLane('GENERAL')}
          >
            <Text style={[styles.tgTxt, lane === 'GENERAL' && styles.tgTxtOn]}>General</Text>
          </TouchableOpacity>
          {hasSentri && (
            <TouchableOpacity
              style={[styles.tg, lane === 'SENTRI' && styles.tgOn]}
              onPress={() => setLane('SENTRI')}
            >
              <Text style={[styles.tgTxt, lane === 'SENTRI' && styles.tgTxtOn]}>SENTRI</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.commBlue} style={{ marginVertical: 30 }} />
      ) : !hasData ? (
        <Text style={styles.empty}>
          Aún no hay suficiente histórico de esta garita. Se va llenando con el tiempo.
        </Text>
      ) : (
        <>
          <View style={styles.stats}>
            <View style={[styles.s3, { backgroundColor: 'rgba(70,208,144,0.12)' }]}>
              <Text style={[styles.sLab, { color: Colors.confGreen }]}>MEJOR</Text>
              <Text style={[styles.sVal, { color: Colors.confGreen }]}>{best ? label12(best.hour) : '—'}</Text>
              <Text style={styles.sMeta}>{best ? `${best.minutes} min` : ''}</Text>
            </View>
            <View style={[styles.s3, { backgroundColor: 'rgba(249,138,151,0.12)' }]}>
              <Text style={[styles.sLab, { color: Colors.dangerSoft }]}>PEOR</Text>
              <Text style={[styles.sVal, { color: Colors.dangerSoft }]}>{worst ? label12(worst.hour) : '—'}</Text>
              <Text style={styles.sMeta}>{worst ? `${worst.minutes} min` : ''}</Text>
            </View>
            <View style={[styles.s3, { backgroundColor: 'rgba(110,168,255,0.12)' }]}>
              <Text style={[styles.sLab, { color: Colors.commBlue }]}>AHORA</Text>
              <Text style={[styles.sVal, { color: Colors.commBlue }]}>{now ? label12(now.hour) : '—'}</Text>
              <Text style={styles.sMeta}>{now?.minutes != null ? `${now.minutes} min` : 's/d'}</Text>
            </View>
          </View>

          <View style={[styles.chart, { height: H }]}>
            {hours.map((h) => {
              const hv = h.historic ?? 0;
              const bh = Math.max(2, (hv / max) * H);
              const isBest = best && h.hour === best.hour;
              const isWorst = worst && h.hour === worst.hour;
              const isNow = now && h.hour === now.hour;
              const color = isBest ? Colors.confGreen : isWorst ? Colors.dangerSoft : '#3A63C8';
              const todayPct = h.today != null ? (h.today / max) * H : null;
              return (
                <View key={h.hour} style={styles.colWrap}>
                  {todayPct != null && (
                    <View style={[styles.todayDot, { bottom: Math.min(H - 4, todayPct) }]} />
                  )}
                  <View
                    style={[
                      styles.bar,
                      { height: bh, backgroundColor: color, opacity: isBest || isWorst ? 1 : 0.85 },
                      isNow && styles.barNow,
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.axis}>
            <Text style={styles.ax}>12am</Text>
            <Text style={styles.ax}>6am</Text>
            <Text style={styles.ax}>12pm</Text>
            <Text style={styles.ax}>6pm</Text>
            <Text style={styles.ax}>11pm</Text>
          </View>
          <Text style={styles.foot}>
            Barras = promedio histórico · puntos naranjas = tendencia de hoy
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.darkSurface, borderRadius: 16, padding: 14,
    marginHorizontal: 20, marginTop: 12, borderWidth: 1, borderColor: Colors.darkBorder,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { color: Colors.darkText, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  toggle: { flexDirection: 'row', gap: 6 },
  tg: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: Colors.darkTile },
  tgOn: { backgroundColor: Colors.primary },
  tgTxt: { fontSize: 12, fontWeight: '700', color: Colors.darkTextSecondary },
  tgTxtOn: { color: '#fff' },
  empty: { color: Colors.darkTextMuted, fontSize: 13, textAlign: 'center', paddingVertical: 24, lineHeight: 19 },
  stats: { flexDirection: 'row', gap: 7, marginTop: 12 },
  s3: { flex: 1, borderRadius: 10, padding: 9 },
  sLab: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  sVal: { fontSize: 17, fontWeight: '800', marginTop: 1 },
  sMeta: { fontSize: 9, color: Colors.darkTextSecondary, marginTop: 1 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 14 },
  colWrap: { flex: 1, height: '100%', justifyContent: 'flex-end', position: 'relative' },
  bar: { width: '100%', borderRadius: 2 },
  barNow: { borderWidth: 1, borderColor: Colors.commBlue },
  todayDot: {
    position: 'absolute', alignSelf: 'center',
    width: 4, height: 4, borderRadius: 2, backgroundColor: '#F5A623',
  },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  ax: { fontSize: 8, color: Colors.darkTextMuted },
  foot: { fontSize: 10, color: Colors.darkTextMuted, marginTop: 8 },
});
