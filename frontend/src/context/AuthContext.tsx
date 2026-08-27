import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { authApi } from "../api/resources";
import { setAuthToken, setUnauthorizedHandler } from "../api/client";

const TOKEN_STORAGE_KEY = "chronodemica.authToken";

type AuthStatus = "loading" | "needs-login" | "authenticated";

interface AuthContextValue {
  status: AuthStatus;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  startLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Pulls a token handed back by the OIDC callback redirect (`#token=...`) out of
// the URL fragment — it never reaches the server (fragments aren't sent in
// requests), so this is the one place that has to read it.
function consumeTokenFromUrlFragment(): string | null {
  if (!window.location.hash.startsWith("#token=")) return null;
  const token = decodeURIComponent(window.location.hash.slice("#token=".length));
  history.replaceState(null, "", window.location.pathname + window.location.search);
  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setAuthToken(null);
      setEmail(null);
      setDisplayName(null);
      setIsAdmin(false);
      setStatus("needs-login");
    });

    (async () => {
      const token = consumeTokenFromUrlFragment() ?? localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        setStatus("needs-login");
        return;
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setAuthToken(token);
      try {
        const me = await authApi.me();
        setEmail(me.email);
        setDisplayName(me.display_name);
        setIsAdmin(me.is_admin);
        setStatus("authenticated");
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setStatus("needs-login");
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, []);

  const startLogin = () => {
    window.location.href = authApi.loginUrl;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // token may already be invalid; clearing local state below is enough
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setEmail(null);
    setDisplayName(null);
    setIsAdmin(false);
    setStatus("needs-login");
  };

  return (
    <AuthContext.Provider value={{ status, email, displayName, isAdmin, startLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
