import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Vibration,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../lib/types';
import { Colors } from '../../lib/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReportSent'>;
  route: RouteProp<RootStackParamList, 'ReportSent'>;
};

export default function ReportSentScreen({ navigation, route }: Props) {
  const { eventType, xpEarned } = route.params;
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Vibration.vibrate(100);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.goBack();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Animated.View style={[styles.circle, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.checkmark}>✓</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', gap: 8 }}>
          <Text style={styles.title}>¡Reporte enviado!</Text>
          <Text style={styles.sub}>Gracias por ayudar a la comunidad.</Text>

          <View style={styles.xpBadge}>
            <Text style={styles.xpText}>+{xpEarned} XP</Text>
          </View>

          <Text style={styles.eventType}>{eventType}</Text>
        </Animated.View>

        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  checkmark: { fontSize: 48, color: Colors.white, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.navyGarita, textAlign: 'center' },
  sub: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  xpBadge: {
    backgroundColor: Colors.navyGarita,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
  },
  xpText: { color: Colors.white, fontSize: 20, fontWeight: '800' },
  eventType: {
    fontSize: 14,
    color: Colors.textMuted,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  btn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  btnText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
});
