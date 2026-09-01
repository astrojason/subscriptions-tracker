"use client";

import { type User, onIdTokenChanged } from "firebase/auth";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { ErrorBlock } from "@/components/ErrorBlock";
import { auth } from "./firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

/**
 * Mints (or clears) the server-side session cookie used to gate page
 * requests in proxy.ts. Exported so callers that need the cookie in place
 * before navigating (e.g. the login page, before router.push) can await it
 * directly instead of racing the onIdTokenChanged listener below.
 */
export async function syncSessionCookie(user: User | null) {
  if (user) {
    const idToken = await user.getIdToken();
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const message = await res.text().catch(() => res.statusText);
      throw new Error(message || `Failed to start session (status ${res.status})`);
    }
  } else {
    const res = await fetch("/api/auth/session", { method: "DELETE" });
    if (!res.ok) {
      const message = await res.text().catch(() => res.statusText);
      throw new Error(message || `Failed to end session (status ${res.status})`);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    return onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      try {
        await syncSessionCookie(nextUser);
        setSessionError(null);
      } catch (err) {
        setSessionError(err instanceof Error ? err.message : String(err));
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {sessionError && (
        <div style={{ padding: "var(--space-4)" }}>
          <ErrorBlock message={sessionError} />
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
