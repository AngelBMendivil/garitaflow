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
  /** Horas ya formateadas de inicio y fin, iguales a las de la pantalla de cruce terminado. */
  times?: { start: string; end: string };
  compact?: boolean;
  fullWidth?: boolean;
}

function content(p: Props) {
  const pn = p.portName || 'la garita';
  const where = p.laneLabel ? `${pn} · ${p.laneLabel}` : pn;
  if (p.moment === 'finish') {
    return {
      emoji: '🎉',
      // La pantalla le dice "¡Cruzaste!" al usuario; la imagen la ve otra
      // persona, así que habla en primera persona.
      top: '¡Crucé!',
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

      // La tarjeta vive dentro de la ventana (opacity 0), no en left:10000. En
      // Android una vista fuera de la ventana no se recompone y captureRef
      // devolvía el bitmap cacheado de un render anterior: por eso se compartía
      // una tarjeta vieja, con la garita o los minutos del cruce pasado.
      // Un frame de gracia asegura que el contenido actual ya se dibujó.
      await new Promise((r) => requestAnimationFrame(() => r(null)));

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
          <Logo variant="light" size={34} />
          {props.moment === 'start' ? (
            <View style={styles.vehicleWrap}>
              <VehicleIcon vehicleKey={user?.vehicle_key} color={user?.vehicle_color} size={120} />
            </View>
          ) : (
            <Text style={styles.emoji}>{c.emoji}</Text>
          )}
          {props.moment === 'finish' ? (
            // Mismo orden y estilo que la pantalla "¡Cruzaste!": título, minutos
            // en verde, garita, y el recuadro de inicio → fin.
            <>
              <Text style={styles.title}>{c.top}</Text>
              <Text style={styles.big}>{c.big}</Text>
              <Text style={styles.where}>{c.where}</Text>
              {props.times ? (
                <View style={styles.timesCard}>
                  <View style={styles.timeCell}>
                    <Text style={styles.timeLabel}>Inicio</Text>
                    <Text style={styles.timeValue}>{props.times.start}</Text>
                  </View>
                  <Text style={styles.timeArrow}>→</Text>
                  <View style={styles.timeCell}>
                    <Text style={styles.timeLabel}>Fin</Text>
                    <Text style={styles.timeValue}>{props.times.end}</Text>
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.top}>{c.top}</Text>
              <Text style={styles.where}>{c.where}</Text>
              <Text style={[styles.big, styles.bigText]}>{c.big}</Text>
            </>
          )}
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
  // Dentro de la ventana pero invisible e intocable: así Android sí la dibuja
  // y captureRef obtiene el frame actual. Con left:10000 quedaba fuera de la
  // ventana, no se recomponía, y se capturaba un bitmap viejo.
  offscreen: { position: 'absolute', left: 0, top: 0, opacity: 0, zIndex: -1 },
  // La tarjeta replica la pantalla clara de cruce terminado. Antes era un
  // diseño oscuro aparte que no se actualizó cuando esa pantalla cambió, y lo
  // que se compartía no se parecía a lo que el usuario veía.
  card: {
    width: 340, height: 600, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26,
  },
  emoji: { fontSize: 56, marginTop: 18 },
  vehicleWrap: { marginTop: 18, marginBottom: 2 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.navyGarita, marginTop: 8 },
  top: { fontSize: 15, color: Colors.textSecondary, marginTop: 10 },
  big: { fontSize: 56, fontWeight: '800', color: Colors.green, marginTop: 6 },
  bigText: { fontSize: 36, color: Colors.navyGarita },
  where: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginTop: 4 },
  timesCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18,
    backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22,
    marginTop: 16, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  timeCell: { alignItems: 'center' },
  timeLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeValue: { fontSize: 17, fontWeight: '800', color: Colors.navyGarita, marginTop: 2 },
  timeArrow: { fontSize: 18, color: Colors.textMuted, fontWeight: '700' },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 14, textAlign: 'center' },
  pill: {
    marginTop: 14, backgroundColor: Colors.white, borderColor: Colors.cardBorder, borderWidth: 1,
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 16,
  },
  pillTxt: { color: Colors.blueFlow, fontSize: 13, fontWeight: '700' },
});
