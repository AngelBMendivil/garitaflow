import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

// Confeti ligero, hecho con Animated (sin dependencias nativas nuevas).
// Cae desde arriba con deriva horizontal y giro. Se reproduce una vez.

const COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#E5484D', '#8B5CF6', '#06B6D4', '#EAB308'];
const PIECES = 16;

type PieceProps = { index: number; width: number; height: number };

function Piece({ index, width, height }: PieceProps) {
  const progress = useRef(new Animated.Value(0)).current;

  // Semillas deterministas por índice (variedad sin depender de Math.random).
  const startX = ((index * 47) % 100) / 100 * width;
  const drift = (((index * 31) % 60) - 30);
  const delay = (index % 6) * 120;
  const duration = 2200 + (index % 5) * 350;
  const size = 7 + (index % 3) * 3;
  const color = COLORS[index % COLORS.length];
  const spin = index % 2 === 0 ? 1 : -1;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, height + 40],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, drift, drift * 1.6],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${spin * 540}deg`],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: startX,
        top: 0,
        width: size,
        height: size * 1.6,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

export default function Confetti() {
  const { width, height } = Dimensions.get('window');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: PIECES }, (_, i) => (
        <Piece key={i} index={i} width={width} height={height} />
      ))}
    </View>
  );
}
