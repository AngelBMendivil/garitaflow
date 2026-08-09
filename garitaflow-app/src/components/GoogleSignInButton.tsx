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
}: {
  label: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabledStyle?: StyleProp<ViewStyle>;
}) {
  const { signIn, loading, disabled } = useGoogleAuth();
  const off = loading || disabled;
  return (
    <TouchableOpacity
      style={[style, off && disabledStyle]}
      onPress={signIn}
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
