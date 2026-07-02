import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// `??` (not `||`) so an intentionally-empty NEXT_PUBLIC_API_URL means
// "call the API same-origin" (baseURL becomes a relative `/api`). In the
// Nexlayer deployment the backend is routed under `/api` on the same host,
// so the browser needs no absolute URL. Local dev falls back to :4000.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

// ── Token accessors ────────────────────────────────────────
// The auth store registers getters/setters here so this module has no
// circular dependency on the Zustand store.
let accessTokenGetter: () => string | null = () => null;
let tokensSetter: (access: string, refresh: string) => void = () => {};
let onAuthCleared: () => void = () => {};

export function registerTokenAccessors(fns: {
  getAccessToken: () => string | null;
  setTokens: (access: string, refresh: string) => void;
  clear: () => void;
}) {
  accessTokenGetter = fns.getAccessToken;
  tokensSetter = fns.setTokens;
  onAuthCleared = fns.clear;
}

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = accessTokenGetter();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Transparent refresh-on-401 with a single-flight refresh promise.
let refreshPromise: Promise<string> | null = null;

async function refreshTokens(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
  const { accessToken, refreshToken: newRefresh } = data.data;
  tokensSetter(accessToken, newRefresh);
  return accessToken;
}

let refreshTokenGetter: () => string | null = () => null;
export function registerRefreshGetter(fn: () => string | null) {
  refreshTokenGetter = fn;
}
function getRefreshToken() {
  return refreshTokenGetter();
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry && getRefreshToken()) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshTokens();
        const token = await refreshPromise;
        refreshPromise = null;
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      } catch (e) {
        refreshPromise = null;
        onAuthCleared();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);

/** Extract a human-friendly message from an axios error. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as any)?.error?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
