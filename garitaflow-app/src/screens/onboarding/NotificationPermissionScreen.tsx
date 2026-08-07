import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../lib/types';
import { Colors } from '../../lib/colors';
import { useNotifications } from '../../hooks/useNotifications';
import Logo from '../../components/Logo';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NotificationPermission'>;
};

const BENEFITS = [
  { emoji: '⚡', title: 'Alertas instantáneas', desc: 'Cuando el flujo baja drásticamente en tu garita.' },
  { emoji: '📊', title: 'Reportes de la comunidad', desc: 'Incidentes, cierres y operativos en tiempo real.' },
  { emoji: '🎯', title: 'Solo lo que importa', desc: 'Tú decides qué garitas y qué tipo de alertas.' },
];

export default function NotificationPermissionScreen({ navigation }: Props) {
  const { requestPermission } = useNotifications();
  const [showDialog, setShowDialog] = useState(false);

  const handleAllow = async () => {
    setShowDialog(false);
    await requestPermission();
    navigation.navigate('LocationPermission');
  };

  const handleDontAllow = () => {
    setShowDialog(false);
    navigation.navigate('LocationPermission');
  };

  const handleSkip = () => {
    navigation.navigate('LocationPermission');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Logo size={36} />

        <Text style={styles.title}>Activa las{'\n'}notificaciones</Text>

        {/* Benefits */}
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

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => setShowDialog(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Activar notificaciones</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* iOS-style System Dialog Overlay */}
      <Modal visible={showDialog} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{"\"GaritaFlow\" quiere enviarte notificaciones"}</Text>
            <Text style={styles.dialogSub}>
              Las notificaciones pueden incluir alertas, sonidos y distintivos de íconos.
            </Text>
            <View style={styles.dialogDivider} />
            <View style={styles.dialogBtns}>
              <TouchableOpacity style={styles.dialogBtnNo} onPress={handleDontAllow}>
                <Text style={styles.dialogBtnNoText}>No permitir</Text>
              </TouchableOpacity>
              <View style={styles.dialogBtnDivider} />
              <TouchableOpacity style={styles.dialogBtnYes} onPress={handleAllow}>
                <Text style={styles.dialogBtnYesText}>Permitir</Text>
              </TouchableOpacity>
            </View>
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
  benefits: {
    gap: 20,
    marginTop: 32,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  benefitEmoji: { fontSize: 28, width: 36 },
  benefitText: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: 16, fontWeight: '700', color: Colors.navyGarita },
  benefitDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  actions: { gap: 12 },
  btnPrimary: {
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: Colors.textMuted, fontSize: 15, fontWeight: '500' },

  // iOS dialog styles
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
  dialogBtns: { flexDirection: 'row', height: 44 },
  dialogBtnNo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dialogBtnNoText: { fontSize: 17, color: Colors.blueFlow },
  dialogBtnDivider: { width: 0.5, backgroundColor: Colors.cardBorder },
  dialogBtnYes: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dialogBtnYesText: { fontSize: 17, color: Colors.blueFlow, fontWeight: '700' },
});
