import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../lib/types';
import { Colors } from '../../lib/colors';
import { useAuth } from '../../context/AuthContext';
import { profileApi } from '../../lib/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Personalization'>;
};

const CITIES = [
  { id: 'tijuana', label: 'Tijuana', flag: '🌊' },
  { id: 'mexicali', label: 'Mexicali', flag: '🌵' },
  { id: 'nogales', label: 'Nogales', flag: '⛰️' },
  { id: 'juarez', label: 'Cd. Juárez', flag: '🏜️' },
];

const GARITAS = ['San Ysidro', 'Otay', 'Tecate', 'PedWest', 'Puerta México', 'Garita Andrade'];

// 24 avatar emoji bank — fun, diverse, no copyright
const AVATARS = [
  '😎', '🤠', '👩‍💻', '👨‍🍳', '🧑‍🎤', '👩‍🚀',
  '🦸', '🧙‍♂️', '🕵️', '👩‍⚕️', '👨‍🏫', '🧑‍🌾',
  '🐺', '🦊', '🐸', '🤖', '👾', '🦄',
  '🌵', '🍕', '🚗', '🛸', '⚡', '🎸',
];

export default function PersonalizationScreen({ navigation }: Props) {
  const { updateUser } = useAuth();
  const [selectedCity, setSelectedCity] = useState<string>('tijuana');
  const [selectedGarita, setSelectedGarita] = useState<string>('San Ysidro');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('😎');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await profileApi.update({
        selected_city: selectedCity,
        selected_garita: selectedGarita,
        avatar_key: selectedAvatar,
      });
      updateUser({ selected_city: selectedCity, selected_garita: selectedGarita, avatar_key: selectedAvatar });
      navigation.navigate('NotificationPermission');
    } catch {
      // Continue anyway — preferences can be set later
      navigation.navigate('NotificationPermission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Personaliza tu{'\n'}experiencia</Text>
        <Text style={styles.sub}>Puedes cambiar esto en cualquier momento.</Text>

        {/* Avatar selector */}
        <Text style={styles.sectionTitle}>Tu avatar</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.avatarCell,
                selectedAvatar === emoji && styles.avatarSelected,
              ]}
              onPress={() => setSelectedAvatar(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.avatarEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* City selector */}
        <Text style={styles.sectionTitle}>Tu ciudad fronteriza</Text>
        <View style={styles.cityGrid}>
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.cityCard, selectedCity === c.id && styles.cityCardSelected]}
              onPress={() => setSelectedCity(c.id)}
              activeOpacity={0.75}
            >
              <Text style={styles.cityFlag}>{c.flag}</Text>
              <Text style={[styles.cityLabel, selectedCity === c.id && styles.cityLabelSelected]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Garita selector */}
        <Text style={styles.sectionTitle}>Tu garita frecuente</Text>
        <View style={styles.garitaList}>
          {GARITAS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.garitaRow, selectedGarita === g && styles.garitaRowSelected]}
              onPress={() => setSelectedGarita(g)}
              activeOpacity={0.75}
            >
              <View style={[styles.radio, selectedGarita === g && styles.radioSelected]} />
              <Text style={[styles.garitaText, selectedGarita === g && styles.garitaTextSelected]}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.autoNote}>
          📍 También detectamos tu garita automáticamente por ubicación.
        </Text>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.btnText}>Continuar →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.navyGarita,
    lineHeight: 36,
  },
  sub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navyGarita,
    marginBottom: 12,
    marginTop: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarCell: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: Colors.green,
    backgroundColor: '#E8F5EF',
  },
  avatarEmoji: { fontSize: 26 },
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cityCard: {
    width: '47%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 6,
  },
  cityCardSelected: {
    borderColor: Colors.green,
    backgroundColor: '#E8F5EF',
  },
  cityFlag: { fontSize: 24 },
  cityLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  cityLabelSelected: { color: Colors.green },
  garitaList: { gap: 8 },
  garitaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  garitaRowSelected: {
    borderColor: Colors.green,
    backgroundColor: '#E8F5EF',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.grayDiagonal,
  },
  radioSelected: {
    borderColor: Colors.green,
    backgroundColor: Colors.green,
  },
  garitaText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  garitaTextSelected: { color: Colors.green, fontWeight: '700' },
  autoNote: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 12,
    lineHeight: 18,
  },
  btn: {
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
