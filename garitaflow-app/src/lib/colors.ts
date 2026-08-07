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

  // Dark theme (GaritaFlow)
  darkBg: '#0A1230',          // fondo de pantalla
  darkSurface: '#131E48',     // tarjetas
  darkTile: '#0E1838',        // tile CBP / chips inactivos
  darkTileBlue: '#10265C',    // tile comunidad
  darkBorder: 'rgba(255,255,255,0.07)',
  darkText: '#EDF1FB',
  darkTextSecondary: '#9AA6C8',
  darkTextMuted: '#697596',
  darkTrack: '#26305A',       // fondo de la barra
  commBlue: '#5C93FF',        // azul comunidad legible en oscuro
  confGreen: '#2FBF71',       // confianza / OK en oscuro
} as const;

export type ColorKey = keyof typeof Colors;

/** Returns flow index color based on score */
export function flowColor(score: number): string {
  if (score >= 70) return Colors.flowHigh;
  if (score >= 40) return Colors.flowMedium;
  return Colors.flowLow;
}
