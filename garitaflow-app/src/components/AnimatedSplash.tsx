import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import Logo from './Logo';

/**
 * Splash animado dentro de la app (fade + scale + pulso sutil).
 * El fondo va en el azul oscuro de marca para encadenar sin parpadeo:
 * splash nativo oscuro → este → Home (que también es oscuro). Antes era blanco
 * y metía un flash intermedio.
 */
export default function AnimatedSplash() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.04, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    });
  }, [opacity, scale, pulse]);

  return (
    <View style={styles.bg}>
      <Animated.View
        style={{
          opacity,
          transform: [{ scale: Animated.multiply(scale, pulse) }],
          width: '100%',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Logo variant="dark" size={48} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1020' },
});
