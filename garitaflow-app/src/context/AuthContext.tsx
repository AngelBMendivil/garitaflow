import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Storage } from '../lib/storage';
import { authApi } from '../lib/api';
import { User } from '../lib/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isOnboarded: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: (data: { google_id: string; email: string; name: string; avatar_url?: string }) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  setOnboarded: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// El onboarding se considera hecho si el perfil del servidor ya tiene
// preferencias. Así no se repite al cambiar de dispositivo o reinstalar.
function hasPreferences(u: any): boolean {
  return !!(u && u.selected_garita && u.selected_city);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboardedState] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser, onboardedLocal] = await Promise.all([
          Storage.getToken(),
          Storage.getUser<User>(),
          Storage.isOnboarded(),
        ]);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
          setIsOnboardedState(onboardedLocal || hasPreferences(storedUser));

          // El perfil del servidor manda sobre la bandera local
          authApi.me()
            .then((fresh) => {
              setUser(fresh);
              Storage.setUser(fresh);
              if (hasPreferences(fresh)) {
                setIsOnboardedState(true);
                Storage.setOnboarded(true);
              }
            })
            .catch(() => {/* token expirado */});
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Tras autenticar, se consulta el perfil completo: /auth/login sólo
  // devuelve id, email y name, sin las preferencias.
  const hydrateProfile = async (fallback: User) => {
    try {
      const fresh = await authApi.me();
      await Storage.setUser(fresh);
      setUser(fresh);
      const done = hasPreferences(fresh);
      setIsOnboardedState(done);
      if (done) await Storage.setOnboarded(true);
    } catch {
      await Storage.setUser(fallback);
      setUser(fallback);
      setIsOnboardedState(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { token: t, user: u } = await authApi.login(email, password);
    await Storage.setToken(t);
    setToken(t);
    await hydrateProfile(u);
  };

  const register = async (email: string, password: string, name: string) => {
    const { token: t, user: u } = await authApi.register(email, password, name);
    await Storage.setToken(t);
    setToken(t);
    await Storage.setUser(u);
    setUser(u);
    setIsOnboardedState(false); // usuario nuevo: sí pasa por onboarding
  };

  // Login con Google: el backend hace find-or-create y devuelve token + user.
  // Un usuario de Google puede ya tener preferencias (reinstalación), así que
  // hidratamos el perfil igual que en el login por correo.
  const googleLogin = async (data: { google_id: string; email: string; name: string; avatar_url?: string }) => {
    const { token: t, user: u } = await authApi.google(
      data.google_id, data.email, data.name, data.avatar_url
    );
    await Storage.setToken(t);
    setToken(t);
    await hydrateProfile(u);
  };

  const logout = async () => {
    await Storage.clearAll();
    setToken(null);
    setUser(null);
    setIsOnboardedState(false);
  };

  // Borra la cuenta en el servidor y limpia el estado local (sesión cerrada).
  const deleteAccount = async () => {
    try {
      await authApi.deleteAccount();
    } finally {
      await Storage.clearAll();
      setToken(null);
      setUser(null);
      setIsOnboardedState(false);
    }
  };

  const updateUser = (partial: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...partial };
    setUser(updated);    Storage.setUser(updated);
    if (hasPreferences(updated)) {
      setIsOnboardedState(true);
      Storage.setOnboarded(true);
    }
  };

  const setOnboarded = async () => {
    await Storage.setOnboarded(true);
    setIsOnboardedState(true);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, isOnboarded, login, register, googleLogin, logout, deleteAccount, updateUser, setOnboarded }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
