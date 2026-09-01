"use client";

import { signOut } from "firebase/auth";
import { ClipboardPlus, LogOut, Pencil, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ErrorBlock } from "@/components/ErrorBlock";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import type { BillingPeriod, SubscriptionWithUsage, UsageEventDTO } from "@/lib/types";

const BARELY_USED_THRESHOLD = 2;

type EventDraft = { label: string; value: string; usedAt: string };

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

function draftsFromEvents(events: UsageEventDTO[]) {
  const map: Record<string, EventDraft> = {};
  for (const ev of events) {
    map[ev.id] = {
      label: ev.label ?? "",
      value: ev.value != null ? String(ev.value) : "",
      usedAt: toDateInputValue(ev.usedAt),
    };
  }
  return map;
}

function tagFor(sub: SubscriptionWithUsage) {
  if (sub.worthIt != null) {
    return {
      label: sub.worthIt ? "Worth it" : "Falling short",
      className: sub.worthIt ? "tag-accent" : "tag-outline",
    };
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

  const [loggingSub, setLoggingSub] = useState<SubscriptionWithUsage | null>(null);
  const [logLabel, setLogLabel] = useState("");
  const [logValue, setLogValue] = useState("");
  const [logDate, setLogDate] = useState("");
  const [submittingLog, setSubmittingLog] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<SubscriptionWithUsage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingSub, setEditingSub] = useState<SubscriptionWithUsage | null>(null);
  const [editName, setEditName] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editBillingPeriod, setEditBillingPeriod] = useState<BillingPeriod>("monthly");
  const [savingEdit, setSavingEdit] = useState(false);

  const [detailSub, setDetailSub] = useState<SubscriptionWithUsage | null>(null);
  const [detailEvents, setDetailEvents] = useState<UsageEventDTO[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [eventDrafts, setEventDrafts] = useState<Record<string, EventDraft>>({});
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);

  const loadSubs = useCallback(async () => {
    try {
      const data = await apiFetch<SubscriptionWithUsage[]>("/api/subs");
      setSubs(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetailEvents = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const events = await apiFetch<UsageEventDTO[]>(`/api/subs/${id}/log-use`);
      setDetailEvents(events);
      setEventDrafts(draftsFromEvents(events));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
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

  useEffect(() => {
    if (!editingSub) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setEditingSub(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingSub]);

  useEffect(() => {
    if (!loggingSub) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLoggingSub(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loggingSub]);

  useEffect(() => {
    if (!detailSub) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDetailSub(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailSub]);

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
      if (detailSub?.id === id) setDetailSub(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  function handleOpenLogUse(sub: SubscriptionWithUsage) {
    setLoggingSub(sub);
    setLogLabel("");
    setLogValue("");
    setLogDate("");
  }

  async function handleLogUse(e: FormEvent) {
    e.preventDefault();
    if (!loggingSub) return;
    const id = loggingSub.id;
    setError(null);
    setSubmittingLog(true);
    try {
      const rawValue = logValue.trim();
      const rawLabel = logLabel.trim();
      const rawDate = logDate.trim();
      await apiFetch(`/api/subs/${id}/log-use`, {
        method: "POST",
        body: JSON.stringify({
          value: rawValue ? Number(rawValue) : null,
          label: rawLabel || null,
          usedAt: rawDate || null,
        }),
      });
      setLoggingSub(null);
      await loadSubs();
      if (detailSub?.id === id) await loadDetailEvents(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingLog(false);
    }
  }

  function handleOpenEdit(sub: SubscriptionWithUsage) {
    setEditingSub(sub);
    setEditName(sub.name);
    setEditCost(String(sub.cost));
    setEditBillingPeriod(sub.billingPeriod);
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingSub) return;
    const parsedCost = Number(editCost);
    if (!editName.trim() || !Number.isFinite(parsedCost) || parsedCost < 0) return;

    setSavingEdit(true);
    setError(null);
    try {
      await apiFetch(`/api/subs/${editingSub.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim(), cost: parsedCost, billingPeriod: editBillingPeriod }),
      });
      setEditingSub(null);
      const data = await loadSubs();
      if (data && detailSub?.id === editingSub.id) {
        setDetailSub(data.find((s) => s.id === editingSub.id) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingEdit(false);
    }
  }

  function handleOpenDetail(sub: SubscriptionWithUsage) {
    setDetailSub(sub);
    setConfirmDeleteEventId(null);
    loadDetailEvents(sub.id);
  }

  function updateDraft(eventId: string, field: keyof EventDraft, value: string) {
    setEventDrafts((prev) => ({ ...prev, [eventId]: { ...prev[eventId], [field]: value } }));
  }

  async function handleSaveEvent(eventId: string) {
    if (!detailSub) return;
    const draft = eventDrafts[eventId];
    if (!draft) return;
    setDetailError(null);
    setSavingEventId(eventId);
    try {
      await apiFetch(`/api/subs/${detailSub.id}/log-use/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({
          value: draft.value.trim() ? Number(draft.value) : null,
          label: draft.label.trim() || null,
          usedAt: draft.usedAt || null,
        }),
      });
      await loadDetailEvents(detailSub.id);
      await loadSubs();
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingEventId(null);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!detailSub) return;
    setDetailError(null);
    setDeletingEventId(eventId);
    try {
      await apiFetch(`/api/subs/${detailSub.id}/log-use/${eventId}`, { method: "DELETE" });
      setConfirmDeleteEventId(null);
      await loadDetailEvents(detailSub.id);
      await loadSubs();
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingEventId(null);
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
            <section>
              <h6 className="text-muted" style={{ marginBottom: "var(--space-3)" }}>
                Subscriptions — {monthLabel}
              </h6>
              <table className="table">
                <thead>
                  <tr>
                    <th>Subscription</th>
                    <th>Monthly cost</th>
                    <th>Uses</th>
                    <th>Value logged</th>
                    <th>Status</th>
                    <th style={{ width: "1%", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub) => {
                    const tag = tagFor(sub);
                    return (
                      <tr key={sub.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(sub)}
                            className="btn btn-ghost"
                            style={{ padding: "0 var(--space-1)", fontSize: "14px" }}
                          >
                            {sub.name}
                          </button>
                        </td>
                        <td>{formatCurrency(sub.costPerMonth)}</td>
                        <td>{sub.usesThisMonth}</td>
                        <td>{sub.hasValueData ? formatCurrency(sub.totalValue) : "—"}</td>
                        <td>
                          <span className={`tag ${tag.className}`}>{tag.label}</span>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div className="flex justify-end" style={{ gap: "var(--space-2)" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenLogUse(sub)}
                              className="btn btn-icon"
                              aria-label={`Log use for ${sub.name}`}
                            >
                              <ClipboardPlus size={15} strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(sub)}
                              className="btn btn-icon"
                              aria-label={`Edit ${sub.name}`}
                            >
                              <Pencil size={15} strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(sub)}
                              className="btn btn-icon btn-danger"
                              aria-label={`Delete ${sub.name}`}
                            >
                              <Trash2 size={15} strokeWidth={1.5} />
                            </button>
                          </div>
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

      {editingSub && (
        <div
          className="dialog-backdrop"
          onClick={() => !savingEdit && setEditingSub(null)}
          role="presentation"
        >
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div id="edit-dialog-title" className="dialog-title">
              Edit {editingSub.name}
            </div>
            <form onSubmit={handleSaveEdit} className="flex flex-col" style={{ gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
              <div className="field">
                <label htmlFor="edit-name">Name</label>
                <input
                  id="edit-name"
                  className="input"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="edit-cost">Cost</label>
                <input
                  id="edit-cost"
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                />
              </div>
              <div className="field">
                <label id="edit-billing-period-label">Billing</label>
                <div className="seg" role="radiogroup" aria-labelledby="edit-billing-period-label">
                  <label className="seg-opt">
                    <input
                      type="radio"
                      name="editBillingPeriod"
                      checked={editBillingPeriod === "monthly"}
                      onChange={() => setEditBillingPeriod("monthly")}
                    />
                    Monthly
                  </label>
                  <label className="seg-opt">
                    <input
                      type="radio"
                      name="editBillingPeriod"
                      checked={editBillingPeriod === "yearly"}
                      onChange={() => setEditBillingPeriod("yearly")}
                    />
                    Yearly
                  </label>
                </div>
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingSub(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailSub && (
        <div
          className="dialog-backdrop"
          onClick={() => setDetailSub(null)}
          role="presentation"
        >
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-dialog-title"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(680px, 100%)" }}
          >
            <div className="flex items-center justify-between" style={{ gap: "var(--space-2)" }}>
              <div>
                <div id="detail-dialog-title" className="dialog-title">
                  {detailSub.name}
                </div>
                <div className="text-muted text-sm">
                  {formatCurrency(detailSub.cost)} / {detailSub.billingPeriod === "yearly" ? "year" : "month"}
                </div>
              </div>
              <div className="flex" style={{ gap: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={() => handleOpenLogUse(detailSub)}
                  className="btn btn-icon"
                  aria-label={`Log use for ${detailSub.name}`}
                >
                  <ClipboardPlus size={15} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(detailSub)}
                  className="btn btn-icon"
                  aria-label={`Edit ${detailSub.name}`}
                >
                  <Pencil size={15} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(detailSub)}
                  className="btn btn-icon btn-danger"
                  aria-label={`Delete ${detailSub.name}`}
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {detailError && <ErrorBlock message={detailError} />}

            <div style={{ overflowY: "auto", maxHeight: "50vh", marginTop: "var(--space-2)" }}>
              {detailLoading ? (
                <p className="text-muted text-sm">Loading usage…</p>
              ) : detailEvents.length === 0 ? (
                <p className="text-muted text-sm">No usage logged yet.</p>
              ) : (
                <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
                  {detailEvents.map((ev) => {
                    const draft = eventDrafts[ev.id] ?? { label: "", value: "", usedAt: "" };
                    const isSaving = savingEventId === ev.id;
                    const isDeleting = deletingEventId === ev.id;
                    const isConfirmingDelete = confirmDeleteEventId === ev.id;
                    return (
                      <div
                        key={ev.id}
                        className="flex flex-wrap items-center"
                        style={{
                          gap: "var(--space-2)",
                          paddingBottom: "var(--space-2)",
                          borderBottom: "1px solid var(--color-divider)",
                        }}
                      >
                        <input
                          className="input"
                          type="date"
                          aria-label="Date used"
                          max={new Date().toISOString().slice(0, 10)}
                          value={draft.usedAt}
                          onChange={(e) => updateDraft(ev.id, "usedAt", e.target.value)}
                          style={{ flex: "0 0 150px" }}
                        />
                        <input
                          className="input"
                          type="text"
                          placeholder="Notes (optional)"
                          aria-label="Notes"
                          value={draft.label}
                          onChange={(e) => updateDraft(ev.id, "label", e.target.value)}
                          style={{ flex: 2, minWidth: "120px" }}
                        />
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Value (optional)"
                          aria-label="Value"
                          value={draft.value}
                          onChange={(e) => updateDraft(ev.id, "value", e.target.value)}
                          style={{ flex: 1, minWidth: "90px" }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEvent(ev.id)}
                          disabled={isSaving || isDeleting}
                          className="btn btn-secondary"
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                        {isConfirmingDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            disabled={isDeleting}
                            className="btn btn-primary btn-danger"
                          >
                            {isDeleting ? "Deleting…" : "Confirm?"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteEventId(ev.id)}
                            disabled={isSaving || isDeleting}
                            className="btn btn-icon btn-danger"
                            aria-label="Delete this usage entry"
                          >
                            <Trash2 size={15} strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDetailSub(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {loggingSub && (
        <div
          className="dialog-backdrop"
          onClick={() => !submittingLog && setLoggingSub(null)}
          role="presentation"
        >
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-use-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div id="log-use-dialog-title" className="dialog-title">
              Log use — {loggingSub.name}
            </div>
            <form onSubmit={handleLogUse} className="flex flex-col" style={{ gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
              <div className="field">
                <label htmlFor="log-use-label">Name (optional)</label>
                <input
                  id="log-use-label"
                  className="input"
                  type="text"
                  value={logLabel}
                  onChange={(e) => setLogLabel(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="log-use-value">Value (optional)</label>
                <input
                  id="log-use-value"
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={logValue}
                  onChange={(e) => setLogValue(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="log-use-date">Date used (optional, defaults to today)</label>
                <input
                  id="log-use-date"
                  className="input"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setLoggingSub(null)}
                  disabled={submittingLog}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingLog}>
                  {submittingLog ? "Logging…" : "Log use"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
