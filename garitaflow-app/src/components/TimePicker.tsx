import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../lib/colors';

interface Props {
  value: string;               // 'HH:MM' en 24h
  onChange: (v: string) => void;
}

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...55

function parse(v: string): { h: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v || '');
  if (!m) return { h: 5, m: 0 };
  return { h: Math.min(23, Number(m[1])), m: Math.min(59, Number(m[2])) };
}
const pad = (n: number) => String(n).padStart(2, '0');

export default function TimePicker({ value, onChange }: Props) {
  const [fmt, setFmt] = useState<'24' | '12'>('24');
  const { h, m } = useMemo(() => parse(value), [value]);

  const set = (nh: number, nm: number) => onChange(`${pad(((nh % 24) + 24) % 24)}:${pad(nm)}`);

  const hours = fmt === '24'
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i)); // 12,1..11
  const isPM = h >= 12;
  const disp12 = h % 12 === 0 ? 12 : h % 12;

  const pickHour12 = (hr12: number) => {
    const base = hr12 % 12; // 12->0
    set(isPM ? base + 12 : base, m);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.preview}>
          {fmt === '24' ? `${pad(h)}:${pad(m)}` : `${disp12}:${pad(m)} ${isPM ? 'PM' : 'AM'}`}
        </Text>
        <View style={styles.fmtToggle}>
          <TouchableOpacity style={[styles.fmtBtn, fmt === '24' && styles.fmtOn]} onPress={() => setFmt('24')}>
            <Text style={[styles.fmtTxt, fmt === '24' && styles.fmtTxtOn]}>24h</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fmtBtn, fmt === '12' && styles.fmtOn]} onPress={() => setFmt('12')}>
            <Text style={[styles.fmtTxt, fmt === '12' && styles.fmtTxtOn]}>12h</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.lbl}>Hora</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {hours.map((hr) => {
          const on = fmt === '24' ? hr === h : hr === disp12;
          return (
            <TouchableOpacity
              key={hr}
              style={[styles.cell, on && styles.cellOn]}
              onPress={() => (fmt === '24' ? set(hr, m) : pickHour12(hr))}
            >
              <Text style={[styles.cellTxt, on && styles.cellTxtOn]}>{fmt === '24' ? pad(hr) : hr}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {fmt === '12' && (
        <View style={styles.ampmRow}>
          <TouchableOpacity style={[styles.ampm, !isPM && styles.cellOn]} onPress={() => set(h % 12, m)}>
            <Text style={[styles.cellTxt, !isPM && styles.cellTxtOn]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ampm, isPM && styles.cellOn]} onPress={() => set((h % 12) + 12, m)}>
            <Text style={[styles.cellTxt, isPM && styles.cellTxtOn]}>PM</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.lbl}>Minutos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {MINUTES.map((mm) => {
          const on = mm === m;
          return (
            <TouchableOpacity key={mm} style={[styles.cell, on && styles.cellOn]} onPress={() => set(h, mm)}>
              <Text style={[styles.cellTxt, on && styles.cellTxtOn]}>{pad(mm)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { color: Colors.darkText, fontSize: 24, fontWeight: '800' },
  fmtToggle: { flexDirection: 'row', backgroundColor: Colors.darkTile, borderRadius: 10, padding: 3 },
  fmtBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  fmtOn: { backgroundColor: Colors.primary },
  fmtTxt: { color: Colors.darkTextSecondary, fontSize: 12, fontWeight: '700' },
  fmtTxtOn: { color: '#fff' },
  lbl: {
    color: Colors.darkTextMuted, fontSize: 10, fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 12, marginBottom: 6,
  },
  cell: {
    minWidth: 44, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10,
    borderRadius: 10, marginRight: 8, backgroundColor: Colors.darkTile,
    borderWidth: 1.5, borderColor: Colors.darkBorder,
  },
  cellOn: { backgroundColor: '#1C2E6E', borderColor: '#2E4088' },
  cellTxt: { color: Colors.darkTextSecondary, fontSize: 15, fontWeight: '700' },
  cellTxtOn: { color: '#fff' },
  ampmRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ampm: {
    paddingVertical: 8, paddingHorizontal: 18, borderRadius: 10,
    backgroundColor: Colors.darkTile, borderWidth: 1.5, borderColor: Colors.darkBorder,
  },
});
