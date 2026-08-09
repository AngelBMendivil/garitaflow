import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { pushApi } from '../lib/api';

// Cómo se muestran las notificaciones con la app en primer plano.
// `as any` tolera los cambios de forma del NotificationBehavior entre SDKs.
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    } as any),
});

function platformTag(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Notificaciones reales (build de producción / EAS). En Expo Go varias APIs
 * no están disponibles: todo va envuelto en try/catch para no tronar.
 */
export function useNotifications() {
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');

  const ensureAndroidChannel = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'GaritaFlow',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    } catch {
      // Expo Go u otra limitación → se ignora
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      await ensureAndroidChannel();
      const current = await Notifications.getPermissionsAsync();
      let status = current.status;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }
      setPermissionStatus(status);
      return status === 'granted';
    } catch {
      return false;
    }
  }, [ensureAndroidChannel]);

  // Obtiene el Expo push token y lo registra en el backend. Devuelve el token
  // o null si no hay permiso / entorno sin push (Expo Go). Best-effort.
  const registerForPush = useCallback(async (): Promise<string | null> => {
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (perm.status !== 'granted') return null;

      const projectId =
        (Constants.expoConfig?.extra as any)?.eas?.projectId ||
        (Constants as any).easConfig?.projectId;

      const tokenResp = await Notifications.getExpoPushTokenAsync(
        projectId ? ({ projectId } as any) : (undefined as any)
      );
      const token = tokenResp?.data;
      if (token) {
        try {
          await pushApi.register(token, platformTag());
        } catch {
          // el registro remoto puede fallar sin bloquear
        }
      }
      return token || null;
    } catch {
      return null;
    }
  }, []);

  // Notificación local inmediata (feedback en pantalla).
  const showLocal = useCallback(async (title: string, body: string) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: 'default' },
        trigger: null,
      });
    } catch {
      // sin permiso / Expo Go → se ignora
    }
  }, []);

  const getStatus = useCallback(async (): Promise<string> => {
    try {
      const p = await Notifications.getPermissionsAsync();
      setPermissionStatus(p.status);
      return p.status;
    } catch {
      return 'undetermined';
    }
  }, []);

  return { permissionStatus, requestPermission, registerForPush, showLocal, getStatus };
}
