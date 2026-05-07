import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, setToken } from "../lib/storage";
import { fetchMe, loginRequest, MeResponse } from "../services/auth";

type AuthState = {
  me: MeResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    const token = getToken();
    if (!token) {
      setMe(null);
      return;
    }
    const meResp = await fetchMe(token);
    setMe(meResp);
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } catch {
        clearToken();
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { accessToken } = await loginRequest(email, password);
    setToken(accessToken);
    await refreshMe();
  };

  const logout = () => {
    clearToken();
    setMe(null);
  };

  const value = useMemo<AuthState>(() => {
    const isAuthenticated = !!getToken() && !!me;
    const isPro = me?.role === "PRO";
    return { me, loading, isAuthenticated, isPro, login, logout, refreshMe };
  }, [me, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}