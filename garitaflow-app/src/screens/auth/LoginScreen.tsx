import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../lib/types';
import { Colors } from '../../lib/colors';
import { useAuth } from '../../context/AuthContext';
import { isGoogleConfigured } from '../../hooks/useGoogleAuth';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import Logo from '../../components/Logo';
import { LEGAL_URLS, EDAD_MINIMA } from '../../lib/legal';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const googleReady = isGoogleConfigured();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Navigation is handled by RootNavigator based on auth state
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>

          <Logo size={40} />
          <Text style={styles.title}>Iniciar sesión</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="tu@correo.com"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btnText}>Entrar</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.line} />
          </View>

          {/* Google Sign-In: el botón real solo se monta si ya hay credenciales;
              si no, un botón inerte que avisa (evita el crash al no configurar OAuth). */}
          {googleReady ? (
            <GoogleSignInButton
              label="🇬 Continuar con Google"
              style={styles.googleBtn}
              textStyle={styles.googleText}
              disabledStyle={styles.btnDisabled}
            />
          ) : (
            <TouchableOpacity
              style={styles.googleBtn}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert('Google casi listo', 'El inicio con Google se habilitará muy pronto. Por ahora usa tu correo.')
              }
            >
              <Text style={styles.googleText}>🇬 Continuar con Google</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.switchLink}
          >
            <Text style={styles.switchText}>
              ¿No tienes cuenta?{' '}
              <Text style={styles.switchHighlight}>Regístrate</Text>
            </Text>
          </TouchableOpacity>

          {/* Entrar con Google también crea la cuenta si no existe, así que el
              requisito de edad se hace constar también aquí. Es un aviso
              pasivo: no añade fricción a quien ya tiene cuenta. */}
          <Text style={styles.legalNote}>
            Al continuar confirmas que tienes al menos {EDAD_MINIMA} años y aceptas los{' '}
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL(LEGAL_URLS.terminos)}
            >
              Términos de Uso
            </Text>{' '}
            y el{' '}
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL(LEGAL_URLS.privacidad)}
            >
              Aviso de Privacidad
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  kav: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 32,
  },
  back: { marginBottom: 24 },
  backText: { color: Colors.blueFlow, fontSize: 15, fontWeight: '600' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.navyGarita,
    marginTop: 16,
    marginBottom: 32,
  },
  form: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  btn: {
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  line: { flex: 1, height: 1, backgroundColor: Colors.cardBorder },
  dividerText: { color: Colors.textMuted, fontSize: 13 },
  googleBtn: {
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  googleText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  switchLink: { marginTop: 24, alignItems: 'center' },
  legalNote: {
    marginTop: 18, fontSize: 12, lineHeight: 17,
    color: Colors.textMuted, textAlign: 'center',
  },
  legalLink: { color: Colors.blueFlow, fontWeight: '700', textDecorationLine: 'underline' },
  switchText: { fontSize: 14, color: Colors.textSecondary },
  switchHighlight: { color: Colors.blueFlow, fontWeight: '700' },
});
