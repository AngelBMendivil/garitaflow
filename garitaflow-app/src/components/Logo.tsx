import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';

interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
}

/**
 * GaritaFlow isotipo SVG — exact geometry:
 * - Green bar: left of diagonal, rounded left end, diagonal-cut right
 * - Red bar: split in 2 by diagonal line
 * - Blue bar: right of diagonal only, diagonal-cut left, rounded right
 * - Diagonal: thin gray line from (30,0) to (20,48) direction
 */
export default function Logo({ size = 56, showText = false, textColor = '#071E5B' }: LogoProps) {
  const scale = size / 56;
  const h = 48 * scale;

  return (
    <View style={styles.container}>
      <Svg width={size} height={h} viewBox="0 0 56 48">
        {/* Green: rounded-left, diagonal-right cut */}
        <Path
          d="M7,3 L27.9,3 L25.8,13 L7,13 A5,5 0 0,0 7,3 Z"
          fill="#00834F"
        />
        {/* Red left segment (left of diagonal) */}
        <Path
          d="M7,19 L24.5,19 L22.5,29 L7,29 A5,5 0 0,0 7,19 Z"
          fill="#E00025"
        />
        {/* Red right segment (right of diagonal) */}
        <Path
          d="M27.5,19 L48,19 A5,5 0 0,1 48,29 L25.5,29 Z"
          fill="#E00025"
        />
        {/* Blue: diagonal-left, rounded-right */}
        <Path
          d="M24.2,35 L48,35 A5,5 0 0,1 48,45 L22.1,45 Z"
          fill="#1554B5"
        />
        {/* Diagonal / line */}
        <Line
          x1="30" y1="0" x2="20" y2="48"
          stroke="#AEB4C2"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </Svg>

      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.garita, { color: textColor }]}>Garita</Text>
          <Text style={styles.flow}>Flow</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  garita: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  flow: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0B5EFF',
    letterSpacing: -0.5,
  },
});
