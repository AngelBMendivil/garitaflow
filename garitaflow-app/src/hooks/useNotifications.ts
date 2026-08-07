// Notificaciones reales con expo-notifications.
// Nota: el PUSH REMOTO no funciona en Expo Go (SDK 54); requiere development build.
// Las notificaciones LOCALES sí funcionan. Todo va protegido para web/Expo Go.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { pushApi } from '../lib/api';

// Cómo se muestran las notificaciones cuando la app está en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  /** Pide permiso del sistema operativo. Devuelve true si quedó concedido. */
  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      const current = await Notifications.getPermissionsAsync();
      let status = current.status;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }
      return status === 'granted';
    } catch {
      return false;
    }
  };

  /** Obtiene el Expo push token y lo registra en el backend. Best-effort. */
  const registerForPush = async (): Promise<string | null> => {
    if (Platform.OS === 'web') return null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await pushApi.register(token, platform as 'ios' | 'android');
      return token;
    } catch (e) {
      // En Expo Go no hay push remoto; se ignora sin romper el flujo.
      console.log('[Notifications] push token no disponible (¿Expo Go?):', e);
      return null;
    }
  };

  /** Muestra una notificación local inmediata (sí funciona en Expo Go). */
  const showLocal = async (title: string, body: string): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch {
      // no-op
    }
  };

  const getStatus = async (): Promise<string> => {
    if (Platform.OS === 'web') return 'unsupported';
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch {
      return 'undetermined';
    }
  };

  return { requestPermission, registerForPush, showLocal, getStatus };
}
