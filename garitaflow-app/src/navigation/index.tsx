import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, MainTabParamList } from '../lib/types';
import { Colors } from '../lib/colors';
import { useAuth } from '../context/AuthContext';

// Auth screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Onboarding screens
import PersonalizationScreen from '../screens/onboarding/PersonalizationScreen';
import NotificationPermissionScreen from '../screens/onboarding/NotificationPermissionScreen';
import LocationPermissionScreen from '../screens/onboarding/LocationPermissionScreen';

// Main screens
import HomeScreen from '../screens/main/HomeScreen';
import MyCrossingsScreen from '../screens/main/MyCrossingsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AlertSettingsScreen from '../screens/profile/AlertSettingsScreen';

// Crossing screens
import ActiveCrossingScreen from '../screens/crossing/ActiveCrossingScreen';
import ReportScreen from '../screens/crossing/ReportScreen';
import ReportSentScreen from '../screens/crossing/ReportSentScreen';
import AnimatedSplash from '../components/AnimatedSplash';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, { active: string; inactive: string }> = {
    Home: { active: '🏠', inactive: '🏡' },
    MyCrossings: { active: '⏰', inactive: '⏰' },
    Profile: { active: '👤', inactive: '👥' },
  };
  const icon = icons[name];
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {focused ? icon.active : icon.inactive}
    </Text>
  );
}

function MainTabs() {
  // La altura de la barra debe respetar la zona de gestos del sistema.
  // Con altura fija, en Android los iconos quedan bajo la barra de navegación.
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: Colors.navyGarita,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          borderTopColor: Colors.cardBorder,
          paddingTop: 6,
          paddingBottom: bottomInset,
          height: 58 + bottomInset,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="MyCrossings" component={MyCrossingsScreen} options={{ title: 'Mis cruces' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return <AnimatedSplash />;
}

export default function RootNavigator() {
  const { user, isLoading, isOnboarded } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth flow
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !isOnboarded ? (
          // Onboarding flow
          <>
            <Stack.Screen name="Personalization" component={PersonalizationScreen} />
            <Stack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
            <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
          </>
        ) : (
          // Authenticated app
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="ActiveCrossing"
              component={ActiveCrossingScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="Report"
              component={ReportScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="ReportSent"
              component={ReportSentScreen}
              options={{
                presentation: 'modal',
                animation: 'fade',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen name="AlertSettings" component={AlertSettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
});