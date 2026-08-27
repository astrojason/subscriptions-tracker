"use client";

import { signOut } from "firebase/auth";
import { LogOut, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ErrorBlock } from "@/components/ErrorBlock";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import type { BillingPeriod, SubscriptionWithUsage } from "@/lib/types";

const BARELY_USED_THRESHOLD = 2;

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function tagFor(sub: SubscriptionWithUsage) {
  if (sub.hasValueData) {
    const worthIt = sub.totalValue >= sub.costPerMonth;
    return { label: worthIt ? "Worth it" : "Falling short", className: worthIt ? "tag-accent" : "tag-outline" };
  }
  if (sub.usesThisMonth < BARELY_USED_THRESHOLD) {
    return { label: "Barely used", className: "tag-outline" };
  }
  return { label: "Tracking", className: "tag-neutral" };
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [subs, setSubs] = useState<SubscriptionWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [adding, setAdding] = useState(false);

  const [valueInputs, setValueInputs] = useState<Record<string, string>>({});
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<SubscriptionWithUsage | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    if (!confirmDelete) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmDelete(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmDelete]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const parsedCost = Number(cost);
    if (!name.trim() || !Number.isFinite(parsedCost) || parsedCost < 0) return;

    setAdding(true);
    setError(null);
    try {
      await apiFetch("/api/subs", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), cost: parsedCost, billingPeriod }),
      });
      setName("");
      setCost("");
      setBillingPeriod("monthly");
      await loadSubs();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setError(null);
    setDeleting(true);
    try {
      await apiFetch(`/api/subs/${id}`, { method: "DELETE" });
      setSubs((prev) => prev.filter((sub) => sub.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleLogUse(id: string) {
    setError(null);
    setLoggingId(id);
    try {
      const raw = (valueInputs[id] ?? "").trim();
      await apiFetch(`/api/subs/${id}/log-use`, {
        method: "POST",
        body: JSON.stringify({ value: raw ? Number(raw) : null }),
      });
      setValueInputs((prev) => ({ ...prev, [id]: "" }));
      await loadSubs();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoggingId(null);
    }
  }

  const monthLabel = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="nav" style={{ padding: "0 var(--space-8)" }}>
        <div className="nav-brand">Subscriptions</div>
        <div className="text-muted text-sm">{user.email}</div>
        <button type="button" onClick={() => signOut(auth)} className="btn btn-ghost">
          <LogOut size={15} strokeWidth={1.5} />
          Sign out
        </button>
      </nav>

      <main
        className="w-full flex-1"
        style={{ maxWidth: "1040px", margin: "0 auto", padding: "var(--space-8) var(--space-6)" }}
      >
        {error && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <ErrorBlock message={error} />
          </div>
        )}

        {loading ? (
          <p className="text-muted text-sm">Loading subscriptions…</p>
        ) : subs.length === 0 ? (
          <div className="text-muted text-center text-sm" style={{ padding: "var(--space-8) 0" }}>
            No subscriptions yet — add one below to start tracking.
          </div>
        ) : (
          <>
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-6)" }}
            >
              {subs.map((sub) => {
                const tag = tagFor(sub);
                const progressPct = sub.hasValueData
                  ? Math.min(100, (sub.totalValue / Math.max(sub.costPerMonth, 0.01)) * 100)
                  : 0;
                const isLogging = loggingId === sub.id;
                const isYearly = sub.billingPeriod === "yearly";

                return (
                  <div
                    key={sub.id}
                    className="card blueprint elev-sm"
                    style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
                  >
                    <i className="corner tl" />
                    <i className="corner tr" />
                    <i className="corner bl" />
                    <i className="corner br" />

                    <div className="flex items-center justify-between" style={{ gap: "var(--space-2)" }}>
                      <div>
                        <div className="card-title" style={{ fontSize: "22px" }}>
                          {sub.name}
                        </div>
                        <div className="card-meta">
                          {formatCurrency(sub.cost)} / {isYearly ? "year" : "month"}
                          {isYearly && ` · ${formatCurrency(sub.costPerMonth)}/mo`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(sub)}
                        className="btn btn-icon btn-danger"
                        aria-label={`Delete ${sub.name}`}
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>

                    <div>
                      <span className={`tag ${tag.className}`}>{tag.label}</span>
                    </div>

                    {sub.hasValueData ? (
                      <div>
                        <div
                          style={{
                            height: "6px",
                            background: "var(--color-neutral-200)",
                            borderRadius: "var(--radius-sm)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{ height: "100%", width: `${progressPct}%`, background: "var(--color-accent)" }}
                          />
                        </div>
                        <div className="text-muted text-sm" style={{ marginTop: "var(--space-1)" }}>
                          {formatCurrency(sub.totalValue)} of {formatCurrency(sub.costPerMonth)} logged this month
                        </div>
                      </div>
                    ) : sub.usesThisMonth > 0 ? (
                      <div className="text-muted text-sm">
                        {sub.perUseCost != null && `${formatCurrency(sub.perUseCost)} / use · `}
                        {sub.usesThisMonth} {sub.usesThisMonth === 1 ? "use" : "uses"} this month
                      </div>
                    ) : (
                      <div className="text-muted text-sm">Not logged yet this month</div>
                    )}

                    <div
                      className="flex"
                      style={{
                        gap: "var(--space-2)",
                        marginTop: "auto",
                        paddingTop: "var(--space-2)",
                        borderTop: "1px solid var(--color-divider)",
                      }}
                    >
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="value (optional)"
                        value={valueInputs[sub.id] ?? ""}
                        onChange={(e) => setValueInputs((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleLogUse(sub.id)}
                        disabled={isLogging}
                        className="btn btn-secondary"
                      >
                        Log use
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <section style={{ marginTop: "var(--space-8)" }}>
              <h6 className="text-muted" style={{ marginBottom: "var(--space-3)" }}>
                Usage report — {monthLabel}
              </h6>
              <table className="table">
                <thead>
                  <tr>
                    <th>Subscription</th>
                    <th>Monthly cost</th>
                    <th>Uses</th>
                    <th>Value logged</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub) => {
                    const tag = tagFor(sub);
                    return (
                      <tr key={sub.id}>
                        <td>{sub.name}</td>
                        <td>{formatCurrency(sub.costPerMonth)}</td>
                        <td>{sub.usesThisMonth}</td>
                        <td>{sub.hasValueData ? formatCurrency(sub.totalValue) : "—"}</td>
                        <td>
                          <span className={`tag ${tag.className}`}>{tag.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}

        <section
          className="card blueprint elev-sm"
          style={{ marginTop: "var(--space-8)", padding: "var(--space-6)" }}
        >
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
          <div className="card-kicker">Add subscription</div>
          <form
            onSubmit={handleAdd}
            className="flex flex-wrap items-end"
            style={{ gap: "var(--space-4)", marginTop: "var(--space-3)" }}
          >
            <div className="field" style={{ flex: 2, minWidth: "180px" }}>
              <label htmlFor="new-name">Name</label>
              <input
                id="new-name"
                className="input"
                type="text"
                placeholder="e.g. Netflix"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: "120px" }}>
              <label htmlFor="new-cost">Cost</label>
              <input
                id="new-cost"
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                required
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div className="field">
              <label id="new-billing-period-label">Billing</label>
              <div className="seg" role="radiogroup" aria-labelledby="new-billing-period-label">
                <label className="seg-opt">
                  <input
                    type="radio"
                    name="billingPeriod"
                    checked={billingPeriod === "monthly"}
                    onChange={() => setBillingPeriod("monthly")}
                  />
                  Monthly
                </label>
                <label className="seg-opt">
                  <input
                    type="radio"
                    name="billingPeriod"
                    checked={billingPeriod === "yearly"}
                    onChange={() => setBillingPeriod("yearly")}
                  />
                  Yearly
                </label>
              </div>
            </div>
            <button type="submit" disabled={adding} className="btn btn-primary">
              Add
            </button>
          </form>
        </section>
      </main>

      {confirmDelete && (
        <div
          className="dialog-backdrop"
          onClick={() => !deleting && setConfirmDelete(null)}
          role="presentation"
        >
          <div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div id="delete-dialog-title" className="dialog-title">
              Delete {confirmDelete.name}?
            </div>
            <div className="dialog-body">
              This removes the subscription and all of its logged usage. This can&apos;t be undone.
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
