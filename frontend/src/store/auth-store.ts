'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, registerTokenAccessors, registerRefreshGetter } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
      logout: () => {
        const { refreshToken } = get();
        api.post('/auth/logout', { refreshToken }).catch(() => {});
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: 'pollwave-auth',
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

// Wire the API client to the store (runs once on module import, client-side).
registerTokenAccessors({
  getAccessToken: () => useAuthStore.getState().accessToken,
  setTokens: (access, refresh) => useAuthStore.getState().setTokens(access, refresh),
  clear: () => useAuthStore.getState().clear(),
});
registerRefreshGetter(() => useAuthStore.getState().refreshToken);
