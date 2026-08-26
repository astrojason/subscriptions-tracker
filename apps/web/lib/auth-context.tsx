"use client";

import { type User, onIdTokenChanged } from "firebase/auth";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";

const SESSION_COOKIE = "session";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

function setSessionCookie(token: string | null) {
  if (token) {
    document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=3600; SameSite=Lax`;
  } else {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      setSessionCookie(nextUser ? await nextUser.getIdToken() : null);
    });
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
