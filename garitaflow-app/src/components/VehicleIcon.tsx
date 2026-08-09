import React from 'react';
import Svg, { Path, Rect, Circle, G, Ellipse } from 'react-native-svg';

// Catálogo corto de vehículos para la tarjeta de compartir.
export const VEHICLES: { key: string; label: string; defaultColor: string }[] = [
  { key: 'sedan', label: 'Sedán', defaultColor: '#2563EB' },
  { key: 'pickup', label: 'Pickup', defaultColor: '#B91C1C' },
  { key: 'tesla', label: 'Tesla', defaultColor: '#E5E7EB' },
  { key: 'van', label: 'Camioneta', defaultColor: '#374151' },
  { key: 'minivan', label: 'Carro de mamá', defaultColor: '#8B5CF6' },
  { key: 'carcacha', label: 'La carcachita', defaultColor: '#F59E0B' },
];

// Colores disponibles (sobre todo para el sedán).
export const VEHICLE_COLORS: { key: string; hex: string }[] = [
  { key: 'blue', hex: '#2563EB' },
  { key: 'red', hex: '#E5484D' },
  { key: 'black', hex: '#1F2937' },
  { key: 'white', hex: '#E5E7EB' },
  { key: 'silver', hex: '#9CA3AF' },
  { key: 'green', hex: '#16A34A' },
];

export function defaultColorFor(key: string): string {
  return VEHICLES.find((v) => v.key === key)?.defaultColor || '#2563EB';
}

const WINDOW = '#BFD7FF';
const TIRE = '#111827';
const HUB = '#9CA3AF';

type Props = { vehicleKey?: string | null; color?: string | null; size?: number };

function Wheels() {
  return (
    <G>
      <Circle cx={28} cy={50} r={9} fill={TIRE} />
      <Circle cx={28} cy={50} r={3.5} fill={HUB} />
      <Circle cx={78} cy={50} r={9} fill={TIRE} />
      <Circle cx={78} cy={50} r={3.5} fill={HUB} />
    </G>
  );
}

export default function VehicleIcon({ vehicleKey, color, size = 96 }: Props) {
  const key = vehicleKey || 'sedan';
  const body = color || defaultColorFor(key);
  const h = (size * 62) / 100;

  const shape = () => {
    switch (key) {
      case 'pickup':
        return (
          <G>
            <Rect x={10} y={40} width={80} height={10} rx={4} fill={body} />
            <Rect x={16} y={24} width={30} height={20} rx={4} fill={body} />
            <Rect x={20} y={27} width={22} height={11} rx={2} fill={WINDOW} />
            <Rect x={48} y={34} width={40} height={12} rx={2} fill={body} />
          </G>
        );
      case 'tesla':
        return (
          <G>
            <Path d="M8 44 Q10 34 26 33 L36 22 Q50 18 66 22 L80 33 Q90 35 92 44 L90 48 L10 48 Z" fill={body} />
            <Path d="M34 32 L42 24 Q52 22 62 24 L70 32 Z" fill={WINDOW} />
          </G>
        );
      case 'van':
        return (
          <G>
            <Rect x={12} y={16} width={76} height={32} rx={6} fill={body} />
            <Rect x={60} y={22} width={22} height={14} rx={2} fill={WINDOW} />
            <Rect x={18} y={22} width={34} height={10} rx={2} fill={WINDOW} />
          </G>
        );
      case 'minivan':
        return (
          <G>
            <Path d="M12 46 L14 28 Q16 22 26 22 L74 22 Q84 22 86 30 L88 46 Z" fill={body} />
            <Rect x={22} y={26} width={20} height={12} rx={2} fill={WINDOW} />
            <Rect x={46} y={26} width={16} height={12} rx={2} fill={WINDOW} />
            <Rect x={66} y={26} width={16} height={12} rx={2} fill={WINDOW} />
          </G>
        );
      case 'carcacha':
        return (
          <G>
            <Ellipse cx={50} cy={40} rx={40} ry={16} fill={body} />
            <Path d="M30 30 Q50 14 70 30 Z" fill={body} />
            <Path d="M36 30 Q50 20 64 30 Z" fill={WINDOW} />
            <Circle cx={40} cy={44} r={2.4} fill="#111827" />
            <Circle cx={62} cy={45} r={2.4} fill="#111827" />
          </G>
        );
      case 'sedan':
      default:
        return (
          <G>
            <Rect x={10} y={34} width={80} height={14} rx={6} fill={body} />
            <Path d="M28 34 L38 22 L64 22 L76 34 Z" fill={body} />
            <Path d="M33 33 L40 25 L62 25 L70 33 Z" fill={WINDOW} />
          </G>
        );
    }
  };

  return (
    <Svg width={size} height={h} viewBox="0 0 100 62">
      {shape()}
      <Wheels />
    </Svg>
  );
}
