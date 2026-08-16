import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../lib/colors';

interface FlowIndexCardProps {
  data: any;
  loading?: boolean;
  portName?: string;
}

// Mismos umbrales que el clasificador de la web: <20 verde, <45 amarillo, resto rojo.
const STATUS_META: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  GREEN:   { color: '#2FBF71', bg: 'rgba(0,131,79,0.16)',  label: 'Fluyendo bien' },
  YELLOW:  { color: '#F5B44A', bg: 'rgba(245,158,11,0.16)', label: 'Tráfico moderado' },
  RED:     { color: '#FF6B7D', bg: 'rgba(224,0,37,0.16)',   label: 'Congestionado' },
  UNKNOWN: { color: '#9AA6C8', bg: 'rgba(255,255,255,0.08)', label: 'Sin información' },
};

const fmtTime = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

/** A partir de aquí el dato oficial de CBP se considera viejo (minutos). */
const CBP_STALE_MIN = 90;

/** Antigüedad en minutos de una marca de tiempo. Null si no aplica. */
const ageMinutes = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  return mins < 0 ? null : mins;
};

/** "hace 4 min" a partir de una marca de tiempo. Null si no aplica. */
const agoLabel = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 0 || mins > 720) return null;
  if (mins < 1) return 'hace instantes';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.floor(mins / 60);
  return `hace ${h} h`;
};

export default function FlowIndexCard({ data, loading, portName }: FlowIndexCardProps) {
  if (loading && !data) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={Colors.navyGarita} />
      </View>
    );
  }

  if (!data || !data.has_data || data.estimated_wait === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.noData}>Sin datos disponibles</Text>
      </View>
    );
  }

  const meta = STATUS_META[data.status] ?? STATUS_META.UNKNOWN;
  const wait = Math.round(Number(data.estimated_wait));
  const confidence = data.confidence != null ? Math.round(Number(data.confidence)) : null;

  // ─── CBP oficial ───────────────────────────────────────────────────────────
  const cbpRaw = data.cbp?.wait_minutes;
  const cbpTs = data.cbp?.updated_at ?? data.cbp?.reported_at;
  const cbpAgeMin = ageMinutes(cbpTs);
  // Pasado el umbral el dato oficial ya no describe la fila de ahora (el cron
  // que lo refresca puede estar caído). Se sigue mostrando, pero marcado como
  // viejo y fuera del veredicto, en vez de competir de tú a tú con la comunidad.
  const cbpStale = cbpAgeMin !== null && cbpAgeMin > CBP_STALE_MIN;
  const hasCbp = cbpRaw !== null && cbpRaw !== undefined;
  const cbpUsable = hasCbp && !cbpStale;
  const cbpWait = hasCbp ? Math.round(Number(cbpRaw)) : null;
  const cbpAgo = agoLabel(cbpTs);

  // ─── Comunidad: promedio de tiempos reales de cruce + N usuarios ───────────
  const commRaw =
    data.community?.avg_minutes ?? data.community?.wait_minutes ?? data.community?.wait;
  const hasComm = commRaw !== null && commRaw !== undefined;
  const commWait = hasComm ? Math.round(Number(commRaw)) : null;
  const sample = data.community?.users ?? data.community?.sample_size ?? null;

  // ─── Puertas / carriles abiertos (CBP) ─────────────────────────────────────
  const lanesOpen = data.cbp?.lanes_open;
  const hasDoors = lanesOpen !== null && lanesOpen !== undefined && Number(lanesOpen) > 0;

  // Veredicto: solo tiene sentido comparando ambas fuentes y con el dato
  // oficial fresco. Contra una lectura de hace horas el veredicto miente.
  const delta = cbpUsable && hasComm ? (commWait as number) - (cbpWait as number) : null;
  const showVerdict = delta !== null && Math.abs(delta) >= 5;
  const faster = (delta ?? 0) < 0;

  // La barra representa la espera sobre una escala de 90 min.
  const barPct = Math.max(4, Math.min(100, (wait / 90) * 100));
  const updated = fmtTime(data.calculated_at);

  // La fórmula debe reflejar lo que de verdad entró en el cálculo: si el dato
  // de CBP está viejo, anunciarlo como insumo vigente es engañoso.
  const formula = cbpUsable
    ? (hasComm ? 'CBP + histórico + comunidad' : 'CBP + histórico')
    : (hasComm ? 'Histórico + comunidad' : 'Histórico');

  return (
    <View style={styles.card}>
      {/* ─── Encabezado ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {portName ? (
          <Text style={styles.portName} numberOfLines={1}>
            {portName}
          </Text>
        ) : (
          <View />
        )}
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* ─── Contraste: CBP oficial vs comunidad ────────────────────────── */}
      {hasCbp && (
        <View style={styles.panels}>
          <View style={[styles.panel, styles.panelCbp, cbpStale && styles.panelStale]}>
            <Text style={styles.panelLabel}>
              CBP oficial{cbpStale ? ' · desactualizado' : ''}
            </Text>
            <View style={styles.panelValueLine}>
              <Text style={[styles.panelValue, cbpStale && styles.valueStale]}>{cbpWait}</Text>
              <Text style={[styles.panelUnit, cbpStale && styles.valueStale]}>min</Text>
            </View>
            <Text style={styles.panelMeta}>
              {cbpStale
                ? `${cbpAgo ?? 'sin actualizar'} · no se usa en la estimación`
                : cbpAgo ?? 'dato oficial'}
            </Text>
          </View>

          {hasComm && (
            <View style={[styles.panel, styles.panelComm]}>
              <Text style={[styles.panelLabel, { color: Colors.commBlue }]}>
                La comunidad
              </Text>
              <View style={styles.panelValueLine}>
                <Text style={[styles.panelValue, { color: Colors.commBlue }]}>
                  {commWait}
                </Text>
                <Text style={[styles.panelUnit, { color: Colors.commBlue }]}>min</Text>
              </View>
              <Text style={[styles.panelMeta, { color: Colors.commBlue }]}>
                {sample ? `promedio de ${sample} usuario${sample === 1 ? '' : 's'}` : 'aún sin cronometrar'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ─── Puertas abiertas ───────────────────────────────────────────── */}
      {hasDoors && (
        <View style={styles.doorsChip}>
          <Text style={styles.doorsText}>🚧 {Number(lanesOpen)} puertas abiertas</Text>
        </View>
      )}

      {/* ─── Veredicto ──────────────────────────────────────────────────── */}
      {showVerdict && (
        <View
          style={[
            styles.verdict,
            { backgroundColor: faster ? 'rgba(70,208,144,0.12)' : 'rgba(245,180,74,0.12)' },
          ]}
        >
          <Text
            style={[
              styles.verdictText,
              { color: faster ? Colors.confGreen : Colors.flowMedium },
            ]}
          >
            La comunidad dice que es {Math.abs(delta as number)} min más {faster ? 'rápido' : 'lento'}
          </Text>
        </View>
      )}

      {/* ─── Estimación propia ──────────────────────────────────────────── */}
      <View style={styles.divider} />

      <View style={styles.estimateRow}>
        <Text style={styles.estimateLabel}>Estimación GaritaFlow</Text>
        <View style={styles.estimateValueLine}>
          <Text style={[styles.estimateValue, { color: Colors.flowMedium }]}>{wait}</Text>
          <Text style={styles.estimateUnit}>min</Text>
        </View>
      </View>

      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            { width: `${barPct}%` as any, backgroundColor: Colors.flowMedium },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.formula}>{formula}</Text>
        {confidence !== null && (
          <Text style={[styles.confidence, { color: confColor(confidence) }]}>
            Confianza {confidence}%
          </Text>
        )}
      </View>

      {updated && <Text style={styles.updated}>Actualizado {updated}</Text>}
    </View>
  );
}

/** La confianza se colorea sola: baja en gris, alta en verde. */
function confColor(c: number): string {
  if (c >= 70) return Colors.confGreen;
  if (c >= 40) return '#F5B44A';
  return Colors.darkTextMuted;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.darkSurface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  noData: {
    fontSize: 14,
    color: Colors.darkTextSecondary,
    textAlign: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  portName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkText,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  panels: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  panel: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
  },
  panelCbp: {
    backgroundColor: Colors.darkTile,
  },
  // El dato viejo se atenúa para que no compita visualmente con el fresco.
  panelStale: { opacity: 0.55 },
  valueStale: { textDecorationLine: 'line-through' },
  panelComm: {
    backgroundColor: Colors.darkTileBlue,
    borderWidth: 1.5,
    borderColor: 'rgba(110,168,255,0.35)',
  },
  panelLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.darkTextSecondary,
    marginBottom: 6,
  },
  panelValueLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  panelValue: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
    color: Colors.darkText,
  },
  panelUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkTextSecondary,
  },
  panelMeta: {
    fontSize: 11,
    color: Colors.darkTextSecondary,
    marginTop: 4,
  },
  doorsChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47,191,113,0.12)',
    borderColor: 'rgba(47,191,113,0.4)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  doorsText: { color: Colors.confGreen, fontSize: 12, fontWeight: '700' },

  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  verdictDelta: {
    fontSize: 16,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: Colors.darkBorder,
    marginBottom: 14,
  },

  estimateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  estimateLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkText,
  },
  estimateValueLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  estimateValue: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  estimateUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.darkTextSecondary,
  },

  barBg: {
    height: 8,
    backgroundColor: Colors.darkTrack,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  formula: {
    fontSize: 11,
    color: Colors.darkTextMuted,
    flexShrink: 1,
  },
  confidence: {
    fontSize: 11,
    fontWeight: '700',
  },
  updated: {
    fontSize: 11,
    color: Colors.darkTextMuted,
    marginTop: 6,
    textAlign: 'right',
  },
});
