import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Colors } from '../lib/colors';
import Logo from './Logo';
import VehicleIcon from './VehicleIcon';
import { useAuth } from '../context/AuthContext';

export type ShareMoment = 'start' | 'incident' | 'finish';

// Confeti estático "horneado" en la tarjeta (se captura como PNG).
const CARD_CONFETTI: { left: number; top: number; color: string; rot: string; w: number; h: number }[] = [
  { left: 26, top: 90, color: '#2563EB', rot: '18deg', w: 8, h: 14 },
  { left: 70, top: 60, color: '#16A34A', rot: '-22deg', w: 7, h: 12 },
  { left: 120, top: 100, color: '#F59E0B', rot: '35deg', w: 9, h: 9 },
  { left: 170, top: 55, color: '#E5484D', rot: '-10deg', w: 8, h: 13 },
  { left: 210, top: 96, color: '#8B5CF6', rot: '25deg', w: 7, h: 12 },
  { left: 258, top: 66, color: '#06B6D4', rot: '-30deg', w: 9, h: 9 },
  { left: 300, top: 100, color: '#EAB308', rot: '15deg', w: 7, h: 13 },
  { left: 48, top: 150, color: '#E5484D', rot: '40deg', w: 7, h: 11 },
  { left: 150, top: 150, color: '#16A34A', rot: '-18deg', w: 8, h: 8 },
  { left: 285, top: 150, color: '#2563EB', rot: '28deg', w: 7, h: 12 },
  { left: 96, top: 128, color: '#8B5CF6', rot: '-35deg', w: 6, h: 10 },
  { left: 232, top: 130, color: '#F59E0B', rot: '12deg', w: 8, h: 8 },
];

interface Props {
  moment: ShareMoment;
  portName?: string;
  laneLabel?: string;
  minutes?: number;
  incidentLabel?: string;
  compact?: boolean;
  fullWidth?: boolean;
}

function content(p: Props) {
  const pn = p.portName || 'la garita';
  const where = p.laneLabel ? `${pn} · ${p.laneLabel}` : pn;
  if (p.moment === 'finish') {
    return {
      emoji: '🎉',
      top: 'Crucé por',
      where,
      big: p.minutes != null ? `${p.minutes} min` : '—',
      sub: 'Tiempo real de mi cruce',
      text: `🎉 Crucé por ${where} en ${p.minutes ?? '—'} min con GaritaFlow. Cruza con inteligencia: https://garitaflow.com`,
    };
  }
  if (p.moment === 'incident') {
    return {
      emoji: '⚠️',
      top: 'Reporté en',
      where,
      big: p.incidentLabel || 'Incidente',
      sub: 'Aviso a la comunidad',
      text: `⚠️ Reporté "${p.incidentLabel || 'incidente'}" en ${where} con GaritaFlow. https://garitaflow.com`,
    };
  }
  return {
    emoji: '🚗',
    top: 'Entré a la fila en',
    where,
    big: 'En la línea',
    sub: 'Sígueme en tiempo real',
    text: `🚗 Entré a la fila en ${where}. Sígueme en vivo con GaritaFlow: https://garitaflow.com`,
  };
}

export default function ShareCrossingButton(props: Props) {
  const cardRef = useRef<View>(null);
  const c = content(props);
  const { user } = useAuth();

  const onShare = async () => {
    // Intenta compartir la imagen branded; si no se puede, comparte texto+link.
    try {
      // require dinámico: estas libs se instalan con `expo install`
      const ViewShot = require('react-native-view-shot');
      const Sharing = require('expo-sharing');
      const uri = await ViewShot.captureRef(cardRef, { format: 'png', quality: 0.95, result: 'tmpfile' });
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir mi cruce' });
        return;
      }
      throw new Error('sharing-unavailable');
    } catch {
      try {
        await Share.share({ message: c.text });
      } catch {
        // usuario canceló o no hay forma de compartir
      }
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, props.compact && styles.btnCompact, props.fullWidth && styles.btnFull]}
        onPress={onShare}
        activeOpacity={0.85}
      >
        <Text style={styles.btnTxt}>↗  Compartir</Text>
      </TouchableOpacity>

      {/* Tarjeta branded oculta fuera de pantalla, solo para capturar */}
      <View collapsable={false} style={styles.offscreen} pointerEvents="none">
        <View collapsable={false} ref={cardRef} style={styles.card}>
          {/* Confeti festivo horneado en la tarjeta */}
          {props.moment !== 'incident' && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {CARD_CONFETTI.map((p, i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: p.left,
                    top: p.top,
                    width: p.w,
                    height: p.h,
                    borderRadius: 2,
                    backgroundColor: p.color,
                    transform: [{ rotate: p.rot }],
                  }}
                />
              ))}
            </View>
          )}
          <Logo variant="dark" size={44} />
          {props.moment === 'incident' ? (
            <Text style={styles.emoji}>{c.emoji}</Text>
          ) : (
            <View style={styles.vehicleWrap}>
              <VehicleIcon vehicleKey={user?.vehicle_key} color={user?.vehicle_color} size={130} />
            </View>
          )}
          <Text style={styles.top}>{c.top}</Text>
          <Text style={styles.where}>{c.where}</Text>
          <Text style={styles.big}>{c.big}</Text>
          <Text style={styles.sub}>{c.sub}</Text>
          <View style={styles.pill}>
            <Text style={styles.pillTxt}>garitaflow.com</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
  },
  btnCompact: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 },
  btnFull: { alignSelf: 'stretch', width: '100%' },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  offscreen: { position: 'absolute', left: 10000, top: 0 },
  card: {
    width: 340, height: 600, backgroundColor: Colors.darkBg,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  emoji: { fontSize: 52, marginTop: 22 },
  vehicleWrap: { marginTop: 20, marginBottom: 4 },
  top: { color: '#BCD0F5', fontSize: 15, marginTop: 10 },
  where: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  big: { color: Colors.commBlue, fontSize: 46, fontWeight: '800', marginTop: 8 },
  sub: { color: '#DFE9FF', fontSize: 14, marginTop: 4 },
  pill: {
    marginTop: 22, backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.25)', borderWidth: 1,
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 18,
  },
  pillTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
