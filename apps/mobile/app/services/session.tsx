import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/v1';
const SESSION_STORAGE_KEY = 'trustpay.session';

type Session = {
  token: string;
  user: { id: string; name: string; email: string };
};

type SessionContextValue = {
  session: Session | null;
  ready: boolean;
  signIn(input: { email: string; password: string }): Promise<void>;
  register(input: {
    name: string;
    email: string;
    password: string;
    country: string;
  }): Promise<void>;
  signOut(): Promise<void>;
  request<T>(path: string, options?: RequestInit): Promise<T>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync(SESSION_STORAGE_KEY).then((value) => {
      if (value) {
        setSession(JSON.parse(value) as Session);
      }
      setReady(true);
    });
  }, []);

  const request = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(session ? { authorization: `Bearer ${session.token}` } : {}),
        ...options.headers
      }
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  };

  const storeSession = async (nextSession: Session) => {
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      ready,
      request,
      async signIn(input) {
        const nextSession = await request<Session>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(input)
        });
        await storeSession(nextSession);
      },
      async register(input) {
        const nextSession = await request<Session>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ ...input, language: 'en' })
        });
        await storeSession(nextSession);
      },
      async signOut() {
        if (session) {
          await request('/auth/logout', { method: 'POST' });
        }
        await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
        setSession(null);
      }
    }),
    [ready, session]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider.');
  }
  return context;
}

export function useRequireSession(): SessionContextValue {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session.ready && !session.session) {
      router.replace('/sign-in');
    }
  }, [router, session.ready, session.session]);
  return session;
}
