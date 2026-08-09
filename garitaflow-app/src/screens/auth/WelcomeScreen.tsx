import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../lib/types';
import Logo from '../../components/Logo';
import { Colors } from '../../lib/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

const CITIES = ['Tijuana', 'Mexicali', 'Nogales', 'El Paso'];

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Logo size={52} showText />
          </View>

          <View style={styles.hero}>
            <Text style={styles.headline}>Cruza la frontera{'\n'}con inteligencia</Text>
            <Text style={styles.subheadline}>
              Tiempos de espera en tiempo real, cronómetro automático y reportes de la comunidad.
            </Text>
          </View>

          <View style={styles.cityRow}>
            {CITIES.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Crear cuenta gratis</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>Ya tengo cuenta</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            Al continuar aceptas los Términos de uso y Política de privacidad.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#071E5B' },
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  logoContainer: { alignSelf: 'stretch' },
  hero: { gap: 12, marginTop: 32 },
  headline: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 24,
  },
  cityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  actions: { gap: 12, marginTop: 40 },
  btnPrimary: {
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  btnSecondaryText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
});
