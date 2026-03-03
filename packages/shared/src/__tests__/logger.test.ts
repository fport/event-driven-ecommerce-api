import { describe, test, expect, spyOn } from "bun:test";
import { logger } from "../logger";

describe("logger", () => {
  test("info outputs JSON with correct fields", () => {
    const spy = spyOn(console, "log").mockImplementation(() => {});
    logger.info("test message", { orderId: "123" });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.level).toBe("info");
    expect(output.message).toBe("test message");
    expect(output.orderId).toBe("123");
    expect(output.timestamp).toBeDefined();
    spy.mockRestore();
  });

  test("error outputs to stderr", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    logger.error("something broke");

    expect(spy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.level).toBe("error");
    spy.mockRestore();
  });

  test("warn outputs to console.warn", () => {
    const spy = spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("be careful");

    expect(spy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.level).toBe("warn");
    spy.mockRestore();
  });
});
