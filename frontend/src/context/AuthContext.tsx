import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { authApi } from "../api/resources";
import { setAuthToken, setUnauthorizedHandler } from "../api/client";

const TOKEN_STORAGE_KEY = "chronodemica.authToken";

type AuthStatus = "loading" | "needs-setup" | "needs-login" | "authenticated";

interface AuthContextValue {
  status: AuthStatus;
  username: string | null;
  setup: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setAuthToken(null);
      setUsername(null);
      setStatus("needs-login");
    });

    (async () => {
      const authStatus = await authApi.status();
      if (!authStatus.configured) {
        setStatus("needs-setup");
        return;
      }

      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setStatus("needs-login");
        return;
      }

      setAuthToken(storedToken);
      try {
        const me = await authApi.me();
        setUsername(me.username);
        setStatus("authenticated");
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setStatus("needs-login");
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, []);

  const setup = async (usernameInput: string, password: string) => {
    const response = await authApi.setup(usernameInput, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    setAuthToken(response.token);
    setUsername(response.username);
    setStatus("authenticated");
  };

  const login = async (usernameInput: string, password: string) => {
    const response = await authApi.login(usernameInput, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    setAuthToken(response.token);
    setUsername(response.username);
    setStatus("authenticated");
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // token may already be invalid; clearing local state below is enough
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setUsername(null);
    setStatus("needs-login");
  };

  return (
    <AuthContext.Provider value={{ status, username, setup, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
