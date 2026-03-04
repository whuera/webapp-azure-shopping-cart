"use client";
import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from "react";
import Cookies from "js-cookie";
import { authApi } from "@/lib/api";
import { LoginResponse, UserResponse } from "@/types";
import { useRouter } from "next/navigation";

interface AuthCtx {
  user: UserResponse | null;
  token: string | null;
  loading: boolean;
  login: (res: LoginResponse) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthCtx>({
  user: null, token: null, loading: true,
  login: () => {}, logout: () => {}, isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    try {
      const res = await authApi.me();
      if (res.success) setUser(res.data);
      else logout();
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = Cookies.get("token");
    if (t) { setToken(t); fetchMe(); }
    else setLoading(false);
  }, [fetchMe]);

  const login = (res: LoginResponse) => {
    Cookies.set("token", res.token, { expires: 1 });
    setToken(res.token);
    setUser({
      id: res.userId, email: res.email,
      firstName: res.firstName, lastName: res.lastName,
      userType: res.userType, status: "ACTIVE",
      roles: res.roles,
    });
    router.push("/dashboard");
  };

  const logout = () => {
    Cookies.remove("token");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const isAdmin = user?.roles.includes("ROLE_ADMIN") ?? false;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
