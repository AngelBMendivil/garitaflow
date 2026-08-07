import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../lib/types';
import { Colors } from '../../lib/colors';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/Logo';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LocationPermission'>;
};

const BENEFITS = [
  { emoji: '🔄', title: 'Cambio automático de garita', desc: 'Detectamos qué garita estás usando sin que hagas nada.' },
  { emoji: '⏱️', title: 'Cronómetro inteligente', desc: 'Tu cruce se detiene solo al detectar que cruzaste.' },
  { emoji: '📍', title: 'Máxima precisión', desc: 'Flow Index calculado exactamente para tu carril.' },
];

export default function LocationPermissionScreen({ navigation }: Props) {
  const { setOnboarded } = useAuth();
  const [showDialog, setShowDialog] = useState(false);

  const finish = async () => {
    await setOnboarded();
    // RootNavigator will redirect to MainTabs
  };

  const handleWhenInUse = async () => {
    setShowDialog(false);
    await Location.requestForegroundPermissionsAsync();
    await finish();
  };

  const handleOnce = async () => {
    setShowDialog(false);
    // "Solo esta vez" — same as WhenInUse for Expo purposes
    await Location.requestForegroundPermissionsAsync();
    await finish();
  };

  const handleDeny = async () => {
    setShowDialog(false);
    await finish();
  };

  const handleSkip = async () => {
    await finish();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Logo size={36} />

        <Text style={styles.title}>Activa tu{'\n'}ubicación</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <Text style={styles.benefitEmoji}>{b.emoji}</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.privacyNote}>
          🔒 Solo usamos tu ubicación cuando la app está abierta. Nunca en segundo plano sin avisarte.
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => setShowDialog(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Activar ubicación</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* iOS 3-option location dialog */}
      <Modal visible={showDialog} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{"Permitir que \"GaritaFlow\" use tu ubicación"}</Text>
            <Text style={styles.dialogSub}>
              GaritaFlow usa tu ubicación para detectar automáticamente cuándo cruzas la frontera.
            </Text>
            <View style={styles.dialogDivider} />
            <TouchableOpacity style={styles.dialogOption} onPress={handleWhenInUse}>
              <Text style={styles.dialogOptionText}>Permitir al usar la app</Text>
            </TouchableOpacity>
            <View style={styles.dialogDivider} />
            <TouchableOpacity style={styles.dialogOption} onPress={handleOnce}>
              <Text style={styles.dialogOptionText}>Solo esta vez</Text>
            </TouchableOpacity>
            <View style={styles.dialogDivider} />
            <TouchableOpacity style={styles.dialogOption} onPress={handleDeny}>
              <Text style={[styles.dialogOptionText, styles.dialogDenyText]}>No permitir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.navyGarita,
    lineHeight: 38,
    marginTop: 24,
  },
  benefits: { gap: 20, marginTop: 32 },
  benefitRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  benefitEmoji: { fontSize: 28, width: 36 },
  benefitText: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: 16, fontWeight: '700', color: Colors.navyGarita },
  benefitDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  privacyNote: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 20,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
  },
  actions: { gap: 12 },
  btnPrimary: {
    backgroundColor: Colors.blueFlow,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: Colors.textMuted, fontSize: 15, fontWeight: '500' },

  // iOS dialog
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: 270,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  dialogSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    lineHeight: 18,
  },
  dialogDivider: { height: 0.5, backgroundColor: Colors.cardBorder },
  dialogOption: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  dialogOptionText: {
    fontSize: 17,
    color: Colors.blueFlow,
    fontWeight: '400',
  },
  dialogDenyText: {
    color: Colors.red,
  },
});
