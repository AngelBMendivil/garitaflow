import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'gf_jwt';
const USER_KEY = 'gf_user';
const ONBOARDING_KEY = 'gf_onboarded';

// On web, SecureStore is not available — fall back to localStorage
const isWeb = Platform.OS === 'web';

const webStore = {
  setItem: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch {}
  },
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  removeItem: (key: string) => {
    try { localStorage.removeItem(key); } catch {}
  },
};

export const Storage = {
  async setToken(token: string) {
    if (isWeb) { webStore.setItem(TOKEN_KEY, token); return; }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    if (isWeb) return webStore.getItem(TOKEN_KEY);
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async clearToken() {
    if (isWeb) { webStore.removeItem(TOKEN_KEY); return; }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async setUser(user: object) {
    const value = JSON.stringify(user);
    if (isWeb) { webStore.setItem(USER_KEY, value); return; }
    await SecureStore.setItemAsync(USER_KEY, value);
  },

  async getUser<T>(): Promise<T | null> {
    const raw = isWeb
      ? webStore.getItem(USER_KEY)
      : await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  },

  async clearUser() {
    if (isWeb) { webStore.removeItem(USER_KEY); return; }
    await SecureStore.deleteItemAsync(USER_KEY);
  },

  async setOnboarded(value: boolean) {
    const str = value ? '1' : '0';
    if (isWeb) { webStore.setItem(ONBOARDING_KEY, str); return; }
    await SecureStore.setItemAsync(ONBOARDING_KEY, str);
  },

  async isOnboarded(): Promise<boolean> {
    const val = isWeb
      ? webStore.getItem(ONBOARDING_KEY)
      : await SecureStore.getItemAsync(ONBOARDING_KEY);
    return val === '1';
  },

  async clearAll() {
    if (isWeb) {
      webStore.removeItem(TOKEN_KEY);
      webStore.removeItem(USER_KEY);
      webStore.removeItem(ONBOARDING_KEY);
      return;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  },
};
