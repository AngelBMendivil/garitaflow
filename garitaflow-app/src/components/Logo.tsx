import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

/**
 * Logo oficial de GaritaFlow (PNG reales, tal cual).
 * - variant="dark"  → fondos oscuros: wordmark BLANCO
 * - variant="light" → fondos claros:  wordmark NAVY
 * `size` = altura del ícono (px). `showText` muestra el wordmark.
 */
const MARK = require('../../assets/brand/mark.png');
const WORDMARK_WHITE = require('../../assets/brand/wordmark-white.png');
const WORDMARK_NAVY = require('../../assets/brand/wordmark-navy.png');

// relaciones ancho/alto reales de cada asset
const MARK_AR = 723 / 762;
const WM_WHITE_AR = 881 / 152;
const WM_NAVY_AR = 1273 / 198;

interface LogoProps {
  size?: number;               // altura del ícono
  variant?: 'dark' | 'light';
  showText?: boolean;
}

export default function Logo({ size = 44, variant = 'dark', showText = true }: LogoProps) {
  const isLight = variant === 'light';
  const wm = isLight ? WORDMARK_NAVY : WORDMARK_WHITE;
  const wmAR = isLight ? WM_NAVY_AR : WM_WHITE_AR;
  const wmHeight = Math.round(size * 0.6);

  return (
    <View style={styles.row}>
      <Image
        source={MARK}
        style={{ height: size, width: size * MARK_AR }}
        resizeMode="contain"
      />
      {showText && (
        <Image
          source={wm}
          style={{ height: wmHeight, width: wmHeight * wmAR, marginLeft: size * 0.26 }}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
