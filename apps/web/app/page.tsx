"use client";

import { signOut } from "firebase/auth";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import type { SubscriptionWithUsage } from "@/lib/types";

const BARELY_USED_THRESHOLD = 2;

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [subs, setSubs] = useState<SubscriptionWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [monthlyCost, setMonthlyCost] = useState("");
  const [adding, setAdding] = useState(false);

  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [logValue, setLogValue] = useState("");

  const loadSubs = useCallback(async () => {
    try {
      const data = await apiFetch<SubscriptionWithUsage[]>("/api/subs");
      setSubs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount pattern: setState happens inside loadSubs' async
    // continuation, not synchronously in this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!authLoading && user) loadSubs();
  }, [authLoading, user, loadSubs]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const cost = Number(monthlyCost);
    if (!name.trim() || !Number.isFinite(cost) || cost < 0) return;

    setAdding(true);
    setError(null);
    try {
      await apiFetch("/api/subs", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), monthlyCost: cost }),
      });
      setName("");
      setMonthlyCost("");
      await loadSubs();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await apiFetch(`/api/subs/${id}`, { method: "DELETE" });
      setSubs((prev) => prev.filter((sub) => sub.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleLogUse(id: string) {
    setError(null);
    try {
      const trimmed = logValue.trim();
      await apiFetch(`/api/subs/${id}/log-use`, {
        method: "POST",
        body: JSON.stringify({ value: trimmed ? Number(trimmed) : null }),
      });
      setLoggingId(null);
      setLogValue("");
      await loadSubs();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Subscriptions
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="text-sm font-medium text-zinc-500 underline dark:text-zinc-400"
          >
            Sign out
          </button>
        </div>

        <form
          onSubmit={handleAdd}
          className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex flex-1 min-w-[160px] flex-col gap-1">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Netflix"
              required
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
            />
          </div>
          <div className="flex w-32 flex-col gap-1">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Monthly cost
            </label>
            <input
              value={monthlyCost}
              onChange={(e) => setMonthlyCost(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="15.99"
              required
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Add
          </button>
        </form>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading subscriptions…</p>
        ) : subs.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No subscriptions yet — add one above.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {subs.map((sub) => {
              const barelyUsed = !sub.hasValueData && sub.usesThisMonth < BARELY_USED_THRESHOLD;
              const worthIt = sub.hasValueData && sub.totalValue >= sub.monthlyCost;
              const progress = sub.hasValueData
                ? Math.min(1, sub.totalValue / Math.max(sub.monthlyCost, 0.01))
                : 0;

              return (
                <div
                  key={sub.id}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {sub.name}
                      </h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatCurrency(sub.monthlyCost)}/mo
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(sub.id)}
                      className="text-sm font-medium text-zinc-400 hover:text-red-500"
                      aria-label={`Delete ${sub.name}`}
                    >
                      Delete
                    </button>
                  </div>

                  {sub.hasValueData ? (
                    <div className="flex flex-col gap-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${worthIt ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatCurrency(sub.totalValue)} of {formatCurrency(sub.monthlyCost)}{" "}
                        logged this month
                      </p>
                      {worthIt && (
                        <span className="w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Worth it
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {sub.usesThisMonth} use{sub.usesThisMonth === 1 ? "" : "s"} this month
                      </p>
                      {sub.perUseCost != null && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {formatCurrency(sub.perUseCost)}/use
                        </p>
                      )}
                      {barelyUsed && (
                        <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Barely used
                        </span>
                      )}
                    </div>
                  )}

                  {loggingId === sub.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={logValue}
                        onChange={(e) => setLogValue(e.target.value)}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Value (optional)"
                        className="w-full rounded-lg border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
                      />
                      <button
                        type="button"
                        onClick={() => handleLogUse(sub.id)}
                        className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoggingId(null);
                          setLogValue("");
                        }}
                        className="shrink-0 text-sm font-medium text-zinc-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLoggingId(sub.id)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                    >
                      Log a use
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
