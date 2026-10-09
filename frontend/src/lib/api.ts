import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { ApiProblem, AuthResponse } from '@/types/api';

const ACCESS_TOKEN_KEY = 'travelov.accessToken';
const REFRESH_TOKEN_KEY = 'travelov.refreshToken';

/**
 * When VITE_API_BASE_URL is empty (the default in dev via the Vite proxy and in
 * production via nginx) requests are relative. If it is unset entirely we fall
 * back to the docker-compose API port so a bare `npm run dev` still works.
 */
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = rawBaseUrl === undefined ? 'http://localhost:5080' : rawBaseUrl;

export const tokenStore = {
  access: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  refresh: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  save: (tokens: { accessToken: string; refreshToken: string }): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clear: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  hasSession: (): boolean => Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)),
};

// ----- Session-cleared pub/sub (used by AuthContext to log out) -----

type Listener = () => void;
const sessionListeners = new Set<Listener>();

export function onSessionCleared(listener: Listener): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function emitSessionCleared(): void {
  sessionListeners.forEach((listener) => listener());
}

// ----- Error normalisation -----

/** Uniform error thrown by every API call; `details` holds per-field messages. */
export class ApiError extends Error {
  readonly status: number;
  readonly details: Record<string, string[]> | null;
  readonly traceId: string | null;

  constructor(message: string, status: number, details: Record<string, string[]> | null, traceId: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.traceId = traceId;
  }
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    if (error.response) {
      const problem = error.response.data as ApiProblem | undefined;
      const message =
        (typeof problem?.error === 'string' && problem.error) ||
        error.response.statusText ||
        'Terjadi kesalahan pada server.';
      const details = (problem?.details as Record<string, string[]> | undefined) ?? null;
      return new ApiError(message, error.response.status, details, problem?.traceId ?? null);
    }

    if (error.code === 'ERR_NETWORK') {
      return new ApiError('Tidak dapat terhubung ke server. Periksa koneksi atau status API.', 0, null, null);
    }

    return new ApiError(error.message || 'Permintaan gagal.', 0, null, null);
  }

  return new ApiError(error instanceof Error ? error.message : 'Terjadi kesalahan tak terduga.', 0, null, null);
}

/** Field name -> first error message, with the first letter lowercased to match form state. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details) return {};
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.details)) {
    if (Array.isArray(messages) && messages.length > 0) {
      const key = field.charAt(0).toLowerCase() + field.slice(1);
      result[key] = messages[0];
    }
  }
  return result;
}

// ----- Axios instance -----

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<string> {
  // Bare axios call so this never re-enters the interceptors.
  const { data } = await axios.post<AuthResponse>(
    `${API_BASE_URL}/api/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  tokenStore.save({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';
    const isAuthEndpoint = url.includes('/api/auth/');

    if (!original || status !== 401 || original._retry || isAuthEndpoint) {
      throw normalizeError(error);
    }

    const refreshToken = tokenStore.refresh();
    if (!refreshToken) {
      tokenStore.clear();
      emitSessionCleared();
      throw normalizeError(error);
    }

    original._retry = true;

    try {
      refreshPromise = refreshPromise ?? refreshAccessToken(refreshToken);
      const newAccessToken = await refreshPromise;
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return await api.request(original as AxiosRequestConfig);
    } catch (refreshError) {
      tokenStore.clear();
      emitSessionCleared();
      throw normalizeError(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);
