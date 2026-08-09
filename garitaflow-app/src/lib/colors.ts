export const Colors = {
  // Brand
  green: '#00834F',
  red: '#E00025',
  blueIsotipo: '#1554B5',
  blueFlow: '#0B5EFF',
  navyGarita: '#071E5B',
  grayDiagonal: '#AEB4C2',

  // UI
  background: '#F5F7FA',
  white: '#FFFFFF',
  cardBorder: '#E8EBF0',
  textPrimary: '#071E5B',
  textSecondary: '#6B7280',
  textMuted: '#AEB4C2',
  inputBorder: '#D1D5DB',
  inputFocus: '#0B5EFF',

  // Flow Index levels
  flowHigh: '#00834F',     // 70-100
  flowMedium: '#F59E0B',   // 40-69
  flowLow: '#E00025',      // 0-39

  // Tabs
  tabActive: '#071E5B',
  tabInactive: '#AEB4C2',

  // Dark theme — Paleta A (Midnight elegante)
  darkBg: '#0B1020',          // fondo de pantalla
  darkSurface: '#131A2E',     // tarjetas
  darkTile: '#0E1526',        // tile CBP / chips inactivos
  darkTileBlue: '#0E1930',    // tile comunidad
  darkBorder: 'rgba(255,255,255,0.06)',
  darkText: '#EAF0FF',
  darkTextSecondary: '#9FB0D6',
  darkTextMuted: '#6D7AA0',
  darkTrack: '#1D2740',       // fondo de la barra
  commBlue: '#6EA8FF',        // azul comunidad legible en oscuro
  confGreen: '#46D090',       // confianza / OK en oscuro
  primary: '#2563EB',         // acción primaria (paleta A)
  dangerSoft: '#F98A97',      // rojo tenue para badges/alertas
} as const;

export type ColorKey = keyof typeof Colors;

/** Returns flow index color based on score */
export function flowColor(score: number): string {
  if (score >= 70) return Colors.flowHigh;
  if (score >= 40) return Colors.flowMedium;
  return Colors.flowLow;
}
