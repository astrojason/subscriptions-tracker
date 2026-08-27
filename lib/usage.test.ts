import { describe, expect, it } from "vitest";
import { parseLogUseInput } from "@/lib/usage";

describe("parseLogUseInput", () => {
  it("defaults value and label to null and usedAt to now when omitted", () => {
    const before = Date.now();
    const result = parseLogUseInput({});
    const after = Date.now();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
    expect(result.label).toBeNull();
    expect(result.usedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.usedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("parses a numeric value", () => {
    const result = parseLogUseInput({ value: "12.5" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(12.5);
  });

  it("rejects a negative value", () => {
    const result = parseLogUseInput({ value: -1 });
    expect(result).toEqual({ ok: false, error: "value must be a non-negative number" });
  });

  it("rejects a non-numeric value", () => {
    const result = parseLogUseInput({ value: "not-a-number" });
    expect(result).toEqual({ ok: false, error: "value must be a non-negative number" });
  });

  it("trims a provided label", () => {
    const result = parseLogUseInput({ label: "  Movie night  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.label).toBe("Movie night");
  });

  it("treats a blank label as null", () => {
    const result = parseLogUseInput({ label: "   " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.label).toBeNull();
  });

  it("parses a provided usedAt date", () => {
    const result = parseLogUseInput({ usedAt: "2026-01-15" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedAt.getUTCFullYear()).toBe(2026);
    expect(result.usedAt.getUTCMonth()).toBe(0);
    expect(result.usedAt.getUTCDate()).toBe(15);
  });

  it("rejects an invalid usedAt date", () => {
    const result = parseLogUseInput({ usedAt: "not-a-date" });
    expect(result).toEqual({ ok: false, error: "usedAt must be a valid date" });
  });

  it("rejects a usedAt date in the future", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
    const result = parseLogUseInput({ usedAt: future.toISOString() });
    expect(result).toEqual({ ok: false, error: "usedAt cannot be in the future" });
  });
});
