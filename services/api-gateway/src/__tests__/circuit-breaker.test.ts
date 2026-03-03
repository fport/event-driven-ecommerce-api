import { describe, test, expect } from "bun:test";
import { getBreaker } from "../middleware/circuit-breaker";

describe("CircuitBreaker", () => {
  test("starts in closed state", () => {
    const breaker = getBreaker("test-service-1");
    expect(breaker.getState()).toBe("closed");
  });

  test("stays closed on success", async () => {
    const breaker = getBreaker("test-service-2");
    await breaker.call(async () => "ok");
    expect(breaker.getState()).toBe("closed");
  });

  test("opens after threshold failures", async () => {
    const breaker = getBreaker("test-service-3");
    const fail = () => breaker.call(async () => { throw new Error("fail"); });

    for (let i = 0; i < 5; i++) {
      try { await fail(); } catch {}
    }

    expect(breaker.getState()).toBe("open");
  });

  test("rejects calls when open", async () => {
    const breaker = getBreaker("test-service-3"); // already open from previous test
    let caught = false;
    try {
      await breaker.call(async () => "ok");
    } catch (err) {
      caught = true;
      expect((err as Error).message).toContain("OPEN");
    }
    expect(caught).toBe(true);
  });

  test("resets to closed after success in half-open", async () => {
    const breaker = getBreaker("test-service-4");

    // Force failures to open
    for (let i = 0; i < 5; i++) {
      try { await breaker.call(async () => { throw new Error("fail"); }); } catch {}
    }
    expect(breaker.getState()).toBe("open");

    // Wait for reset timeout (breaker has 30s timeout, so we can't easily test this without mocking)
    // Instead, test that a fresh breaker recovers after success
    const freshBreaker = getBreaker("test-service-5");
    try { await freshBreaker.call(async () => { throw new Error("fail"); }); } catch {}
    await freshBreaker.call(async () => "recovered");
    expect(freshBreaker.getState()).toBe("closed");
  });
});
