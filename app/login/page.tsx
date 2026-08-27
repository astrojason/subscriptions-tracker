"use client";

import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBlock } from "@/components/ErrorBlock";
import { auth, googleProvider } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center" style={{ padding: "var(--space-6)" }}>
      <div
        className="card blueprint elev-sm w-full max-w-sm"
        style={{ padding: "var(--space-6)" }}
      >
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />

        <h1 style={{ marginBottom: "var(--space-6)" }}>Sign in</h1>

        {error && (
          <div style={{ marginBottom: "var(--space-4)" }}>
            <ErrorBlock message={error} />
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="btn btn-primary btn-block"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
