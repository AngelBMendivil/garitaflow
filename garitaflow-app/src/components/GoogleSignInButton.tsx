import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { Colors } from '../lib/colors';

/**
 * Botón real de "Continuar con Google". Vive en un componente aparte a
 * propósito: useGoogleAuth() inicializa la sesión OAuth al montar, y eso solo
 * debe pasar cuando YA hay credenciales. Las pantallas solo montan este
 * componente si isGoogleConfigured() es true; si no, muestran un botón inerte.
 */
export default function GoogleSignInButton({
  label,
  style,
  textStyle,
  disabledStyle,
  blocked,
  onBlockedPress,
}: {
  label: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabledStyle?: StyleProp<ViewStyle>;
  /** Impide iniciar el flujo (p. ej. falta confirmar la edad en el registro). */
  blocked?: boolean;
  /** Se llama al tocar el botón bloqueado, para explicar por qué. */
  onBlockedPress?: () => void;
}) {
  const { signIn, loading, disabled } = useGoogleAuth();
  const off = loading || disabled;
  // Bloqueado se mantiene tocable a propósito: si estuviera deshabilitado el
  // usuario no entendería por qué no pasa nada al tocarlo.
  return (
    <TouchableOpacity
      style={[style, (off || blocked) && disabledStyle]}
      onPress={blocked ? onBlockedPress : signIn}
      disabled={off}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={Colors.textPrimary} />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
