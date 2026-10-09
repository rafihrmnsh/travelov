import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/lib/queries';
import { onSessionCleared, tokenStore } from '@/lib/api';
import type { User } from '@/types/api';

const USER_KEY = 'travelov.user';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => Promise<User>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function storeUser(user: User | null): void {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (tokenStore.hasSession() ? readStoredUser() : null));
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.hasSession() ? 'loading' : 'anonymous'));

  const applyUser = useCallback((next: User | null) => {
    setUser(next);
    storeUser(next);
    setStatus(next ? 'authenticated' : 'anonymous');
  }, []);

  // Validate the persisted session once on mount.
  useEffect(() => {
    let active = true;

    if (!tokenStore.hasSession()) {
      setStatus('anonymous');
      return () => {
        active = false;
      };
    }

    authApi
      .me()
      .then((profile) => {
        if (active) applyUser(profile);
      })
      .catch(() => {
        if (active) {
          tokenStore.clear();
          applyUser(null);
        }
      });

    return () => {
      active = false;
    };
  }, [applyUser]);

  // React to a failed token refresh anywhere in the app.
  useEffect(
    () =>
      onSessionCleared(() => {
        setUser(null);
        storeUser(null);
        setStatus('anonymous');
      }),
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({ email, password });
      tokenStore.save(response);
      applyUser(response.user);
      return response.user;
    },
    [applyUser],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await authApi.register({ name, email, password });
      tokenStore.save(response);
      applyUser(response.user);
      return response.user;
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.refresh();
    tokenStore.clear();
    applyUser(null);
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Best-effort revocation; the local session is already cleared.
      }
    }
  }, [applyUser]);

  const updateProfile = useCallback(
    async (name: string) => {
      const updated = await authApi.updateProfile({ name });
      applyUser(updated);
      return updated;
    },
    [applyUser],
  );

  const refreshUser = useCallback(async () => {
    const profile = await authApi.me();
    applyUser(profile);
  }, [applyUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAdmin: user?.role === 'Admin',
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
    }),
    [user, status, login, register, logout, updateProfile, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider.');
  return context;
}
