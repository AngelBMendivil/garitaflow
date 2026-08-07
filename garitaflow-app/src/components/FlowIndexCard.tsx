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
  const hasCbp = cbpRaw !== null && cbpRaw !== undefined;
  const cbpWait = hasCbp ? Math.round(Number(cbpRaw)) : null;
  const cbpAgo = agoLabel(data.cbp?.updated_at ?? data.cbp?.reported_at);

  // ─── Comunidad (aparece sola cuando el backend la exponga) ─────────────────
  const commRaw = data.community?.wait_minutes ?? data.community?.wait;
  const hasComm = commRaw !== null && commRaw !== undefined;
  const commWait = hasComm ? Math.round(Number(commRaw)) : null;
  const sample = data.community?.sample_size ?? null;

  // Veredicto: solo tiene sentido comparando ambas fuentes.
  const delta = hasCbp && hasComm ? (commWait as number) - (cbpWait as number) : null;
  const showVerdict = delta !== null && Math.abs(delta) >= 5;
  const faster = (delta ?? 0) < 0;

  // La barra representa la espera sobre una escala de 90 min.
  const barPct = Math.max(4, Math.min(100, (wait / 90) * 100));
  const updated = fmtTime(data.calculated_at);

  const formula = hasComm
    ? 'CBP + histórico + comunidad'
    : 'CBP + histórico';

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
          <View style={[styles.panel, styles.panelCbp]}>
            <Text style={styles.panelLabel}>CBP oficial</Text>
            <View style={styles.panelValueLine}>
              <Text style={styles.panelValue}>{cbpWait}</Text>
              <Text style={styles.panelUnit}>min</Text>
            </View>
            <Text style={styles.panelMeta}>{cbpAgo ?? 'dato oficial'}</Text>
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
                {sample ? `promedio de ${sample} cruce${sample === 1 ? '' : 's'}` : 'reportes recientes'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ─── Veredicto ──────────────────────────────────────────────────── */}
      {showVerdict && (
        <View
          style={[
            styles.verdict,
            { backgroundColor: faster ? '#EFF9F2' : '#FEF6E7' },
          ]}
        >
          <Text
            style={[
              styles.verdictText,
              { color: faster ? '#00834F' : '#B45309' },
            ]}
          >
            {faster ? 'La fila avanza más rápido' : 'La fila avanza más lento'}
          </Text>
          <Text
            style={[
              styles.verdictDelta,
              { color: faster ? '#00834F' : '#B45309' },
            ]}
          >
            {(delta as number) > 0 ? `+${delta}` : delta} min
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
  panelComm: {
    backgroundColor: Colors.darkTileBlue,
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
