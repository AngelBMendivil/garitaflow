import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';

// Necesario para que el navegador de autenticación cierre correctamente.
WebBrowser.maybeCompleteAuthSession();

type GoogleCfg = {
  expoClientId?: string;
  androidClientId?: string;
  iosClientId?: string;
  webClientId?: string;
};

// ¿Ya hay credenciales OAuth de Google? Función pura (sin hooks): sirve para
// decidir si montamos el botón real de Google o no. MIENTRAS esté en falso NO
// se debe montar useGoogleAuth (inicializar la sesión OAuth sin clientId truena
// la app). Por eso el botón real vive en un componente aparte.
export function isGoogleConfigured(): boolean {
  const cfg: GoogleCfg = ((Constants.expoConfig?.extra as any)?.googleAuth as GoogleCfg) || {};
  return !!(cfg.androidClientId || cfg.iosClientId || cfg.webClientId || cfg.expoClientId);
}

/**
 * Hook de inicio de sesión con Google. Comparte la lógica entre Login y
 * Registro. Lee los Client IDs desde app.json → extra.googleAuth.
 *
 * Mientras esos IDs estén vacíos (aún no creados en Google Cloud), el botón
 * avisa amablemente en lugar de fallar, para no bloquear las pruebas del APK.
 */
export function useGoogleAuth() {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const cfg: GoogleCfg =
    ((Constants.expoConfig?.extra as any)?.googleAuth as GoogleCfg) || {};
  const configured = !!(
    cfg.androidClientId ||
    cfg.iosClientId ||
    cfg.webClientId ||
    cfg.expoClientId
  );

  // Se pasa como any para tolerar diferencias de tipado entre versiones de
  // expo-auth-session (las claves exactas han variado entre SDKs).
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: cfg.webClientId || cfg.expoClientId || undefined,
    androidClientId: cfg.androidClientId || undefined,
    iosClientId: cfg.iosClientId || undefined,
    webClientId: cfg.webClientId || undefined,
  } as any);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const accessToken = (response as any).authentication?.accessToken;
      if (!accessToken) {
        setLoading(false);
        return;
      }
      (async () => {
        try {
          const r = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const info: any = await r.json();
          await googleLogin({
            google_id: String(info.id),
            email: String(info.email || '').toLowerCase(),
            name: info.name || info.email || 'Usuario',
            avatar_url: info.picture,
          });
        } catch (e: any) {
          Alert.alert('Google', e?.message || 'No se pudo iniciar sesión con Google.');
        } finally {
          setLoading(false);
        }
      })();
    } else if (response.type === 'error') {
      setLoading(false);
      Alert.alert('Google', 'No se pudo completar el inicio con Google.');
    } else {
      // cancel / dismiss
      setLoading(false);
    }
  }, [response]);

  const signIn = useCallback(async () => {
    if (!configured) {
      Alert.alert(
        'Google casi listo',
        'El inicio con Google se habilitará muy pronto. Por ahora usa tu correo.'
      );
      return;
    }
    setLoading(true);
    try {
      await promptAsync();
    } catch {
      setLoading(false);
    }
  }, [configured, promptAsync]);

  return { signIn, loading, disabled: configured && !request };
}
