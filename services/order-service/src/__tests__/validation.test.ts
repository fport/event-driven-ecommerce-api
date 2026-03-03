import { describe, test, expect } from "bun:test";
import { createOrderSchema, updateOrderSchema } from "../validation";

describe("createOrderSchema", () => {
  test("accepts valid input", () => {
    const result = createOrderSchema.safeParse({
      customerName: "John Doe",
      customerEmail: "john@example.com",
      items: [{ productId: "p1", name: "Laptop", quantity: 1, price: 999.99 }],
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty customer name", () => {
    const result = createOrderSchema.safeParse({
      customerName: "",
      customerEmail: "john@example.com",
      items: [{ productId: "p1", name: "Laptop", quantity: 1, price: 999.99 }],
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid email", () => {
    const result = createOrderSchema.safeParse({
      customerName: "John",
      customerEmail: "not-an-email",
      items: [{ productId: "p1", name: "Laptop", quantity: 1, price: 999.99 }],
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty items array", () => {
    const result = createOrderSchema.safeParse({
      customerName: "John",
      customerEmail: "john@example.com",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects negative quantity", () => {
    const result = createOrderSchema.safeParse({
      customerName: "John",
      customerEmail: "john@example.com",
      items: [{ productId: "p1", name: "Laptop", quantity: -1, price: 999.99 }],
    });
    expect(result.success).toBe(false);
  });

  test("rejects zero price", () => {
    const result = createOrderSchema.safeParse({
      customerName: "John",
      customerEmail: "john@example.com",
      items: [{ productId: "p1", name: "Laptop", quantity: 1, price: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("updateOrderSchema", () => {
  test("accepts valid status update", () => {
    const result = updateOrderSchema.safeParse({ status: "confirmed" });
    expect(result.success).toBe(true);
  });

  test("accepts partial update", () => {
    const result = updateOrderSchema.safeParse({ customerName: "Jane" });
    expect(result.success).toBe(true);
  });

  test("rejects invalid status", () => {
    const result = updateOrderSchema.safeParse({ status: "invalid" });
    expect(result.success).toBe(false);
  });

  test("accepts empty object", () => {
    const result = updateOrderSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
