import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, __resetRateLimitForTests } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit and returns remaining count", () => {
    const cfg = { max: 3, windowMs: 60_000 };
    const r1 = checkRateLimit("key", cfg);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit("key", cfg);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit("key", cfg);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks once the limit is exhausted and reports retryAfterMs", () => {
    const cfg = { max: 2, windowMs: 60_000 };
    checkRateLimit("k", cfg); // t=0
    vi.advanceTimersByTime(10_000); // t=10s
    checkRateLimit("k", cfg);

    const r = checkRateLimit("k", cfg);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    // First hit was at t=0, window is 60s; we're at t=10s so retry in 50s.
    expect(r.retryAfterMs).toBe(50_000);
  });

  it("resets after the window expires", () => {
    const cfg = { max: 1, windowMs: 1_000 };
    const first = checkRateLimit("k", cfg);
    expect(first.allowed).toBe(true);

    const blocked = checkRateLimit("k", cfg);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(1_001);

    const afterWindow = checkRateLimit("k", cfg);
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(0);
  });

  it("tracks keys independently", () => {
    const cfg = { max: 1, windowMs: 60_000 };
    expect(checkRateLimit("a", cfg).allowed).toBe(true);
    expect(checkRateLimit("b", cfg).allowed).toBe(true);
    expect(checkRateLimit("a", cfg).allowed).toBe(false);
    expect(checkRateLimit("b", cfg).allowed).toBe(false);
  });

  it("retryAfterMs approaches zero as the oldest timestamp ages out", () => {
    const cfg = { max: 1, windowMs: 10_000 };
    checkRateLimit("k", cfg); // t=0
    vi.advanceTimersByTime(9_000); // t=9s
    const r = checkRateLimit("k", cfg);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBe(1_000);
  });

  it("sliding window: old entries drop off one at a time", () => {
    const cfg = { max: 3, windowMs: 10_000 };
    checkRateLimit("k", cfg); // t=0
    vi.advanceTimersByTime(3_000);
    checkRateLimit("k", cfg); // t=3s
    vi.advanceTimersByTime(3_000);
    checkRateLimit("k", cfg); // t=6s
    // At t=6s we've used 3/3; next call should fail.
    expect(checkRateLimit("k", cfg).allowed).toBe(false);

    // Advance past t=10s so the t=0 entry expires.
    vi.advanceTimersByTime(5_000); // now t=11s
    const r = checkRateLimit("k", cfg);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(0); // 2 remaining in window (t=3, t=6) + new one = 3
  });
});
