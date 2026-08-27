export type ParsedLogUseInput =
  | { ok: true; value: number | null; label: string | null; usedAt: Date }
  | { ok: false; error: string };

export function parseLogUseInput(body: unknown): ParsedLogUseInput {
  const input = (body ?? {}) as Record<string, unknown>;

  let value: number | null = null;
  if (input.value !== undefined && input.value !== null && input.value !== "") {
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ok: false, error: "value must be a non-negative number" };
    }
    value = parsed;
  }

  let label: string | null = null;
  if (typeof input.label === "string" && input.label.trim()) {
    label = input.label.trim();
  }

  let usedAt = new Date();
  if (input.usedAt !== undefined && input.usedAt !== null && input.usedAt !== "") {
    const parsed = new Date(input.usedAt as string);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "usedAt must be a valid date" };
    }
    if (parsed.getTime() > Date.now()) {
      return { ok: false, error: "usedAt cannot be in the future" };
    }
    usedAt = parsed;
  }

  return { ok: true, value, label, usedAt };
}
