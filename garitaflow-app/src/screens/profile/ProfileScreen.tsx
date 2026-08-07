import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList, UserBadges } from '../../lib/types';
import { Colors } from '../../lib/colors';
import { useAuth } from '../../context/AuthContext';
import { crossingsApi, gamificationApi } from '../../lib/api';
import Logo from '../../components/Logo';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type Props = { navigation: Nav };

const BADGES = ['🏅', '⭐', '🚀', '🌊', '🔥', '💎'];

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [badges, setBadges] = useState<UserBadges | null>(null);

  useEffect(() => {
    crossingsApi.history(5).then(setHistory).catch(() => {});
    gamificationApi.me().then(setBadges).catch(() => {});
  }, []);

  const xpForNextLevel = (user?.level || 1) * 100;
  const xpProgress = ((user?.total_xp || 0) % 100) / 100;

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Logo size={28} showText />
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <Text style={styles.avatar}>{user?.avatar_key || '😎'}</Text>
          <Text style={styles.userName}>{user?.name || 'Cruzador'}</Text>
          <Text style={styles.userCity}>
            📍 {user?.selected_garita || 'Sin garita'} · {user?.selected_city || ''}
          </Text>

          {/* Level + XP */}
          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Nivel {user?.level || 1}</Text>
            </View>
            <Text style={styles.xpText}>{user?.total_xp || 0} XP</Text>
          </View>

          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%` as any }]} />
          </View>
          <Text style={styles.xpMeta}>
            {(user?.total_xp || 0) % 100} / 100 XP para Nivel {(user?.level || 1) + 1}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{user?.total_crossings || 0}</Text>
            <Text style={styles.statLabel}>Cruces</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{user?.total_xp || 0}</Text>
            <Text style={styles.statLabel}>XP Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{user?.level || 1}</Text>
            <Text style={styles.statLabel}>Nivel</Text>
          </View>
        </View>

        {/* Flow score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu Flow Score</Text>
          <View style={styles.flowScoreCard}>
            <Text style={styles.flowScoreValue}>78</Text>
            <View style={styles.flowScoreRight}>
              <Text style={styles.flowScoreLabel}>Cruzador experto</Text>
              <Text style={styles.flowScoreSub}>Top 15% de usuarios</Text>
            </View>
          </View>
        </View>

        {/* Reconocimientos (dos badges independientes) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reconocimientos</Text>

          <View style={styles.recoCard}>
            <Text style={styles.recoIcon}>🛣️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.recoLabel}>Experiencia fronteriza</Text>
              <Text style={styles.recoName}>{badges?.crossings.current?.name ?? 'Sin badge aún'}</Text>
              <Text style={styles.recoMeta}>
                {badges?.crossings.value ?? user?.total_crossings ?? 0} cruces registrados
                {badges?.crossings.next
                  ? ` · faltan ${badges.crossings.toNext} para ${badges.crossings.next.name}`
                  : ''}
              </Text>
            </View>
          </View>

          <View style={styles.recoCard}>
            <Text style={styles.recoIcon}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.recoLabel}>Comunidad</Text>
              <Text style={styles.recoName}>{badges?.community.current?.name ?? 'Sin badge aún'}</Text>
              <Text style={styles.recoMeta}>
                {badges?.community.value ?? 0} aportaciones válidas
                {badges?.community.next
                  ? ` · faltan ${badges.community.toNext} para ${badges.community.next.name}`
                  : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Crossing history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial reciente</Text>
          {history.length === 0 ? (
            <Text style={styles.empty}>Aún no tienes cruces registrados.</Text>
          ) : (
            history.map((c) => (
              <View key={c.id} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyPort}>{c.port_name}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(c.started_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <Text style={styles.historyDuration}>{formatDuration(c.duration_seconds)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('AlertSettings')}
          >
            <Text style={styles.settingsLabel}>🔔  Configurar alertas</Text>
            <Text style={styles.settingsArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoutText: { color: Colors.red, fontSize: 14, fontWeight: '600' },
  profileCard: {
    backgroundColor: Colors.navyGarita,
    margin: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  avatar: { fontSize: 48 },
  userName: { fontSize: 22, fontWeight: '800', color: Colors.white, marginTop: 4 },
  userCity: { fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  levelBadge: {
    backgroundColor: Colors.green,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  xpText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  xpBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  xpBarFill: { height: 8, backgroundColor: Colors.green, borderRadius: 4 },
  xpMeta: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.navyGarita },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.cardBorder },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navyGarita,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  flowScoreCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  flowScoreValue: { fontSize: 52, fontWeight: '800', color: Colors.green },
  flowScoreRight: { gap: 2 },
  flowScoreLabel: { fontSize: 16, fontWeight: '700', color: Colors.navyGarita },
  flowScoreSub: { fontSize: 13, color: Colors.textSecondary },
  badgeGrid: { flexDirection: 'row', gap: 10 },
  badgeCell: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  badgeEmoji: { fontSize: 26 },
  recoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recoIcon: { fontSize: 30 },
  recoLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  recoName: { fontSize: 17, fontWeight: '800', color: Colors.navyGarita, marginTop: 2 },
  recoMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  historyRow: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyPort: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  historyDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  historyDuration: { fontSize: 15, fontWeight: '600', color: Colors.blueFlow },
  empty: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  settingsRow: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  settingsArrow: { fontSize: 20, color: Colors.textMuted },
});
