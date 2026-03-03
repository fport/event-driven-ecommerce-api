/**
 * E2E Test Script
 * Run with: bun run tests/e2e.ts
 * Requires all services running (docker compose up)
 */

const GATEWAY = process.env.GATEWAY_URL || "http://localhost:3000";
const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || "http://localhost:3001";
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3002";
const INVENTORY_SERVICE = process.env.INVENTORY_SERVICE_URL || "http://localhost:3003";
const SEARCH_SERVICE = process.env.SEARCH_SERVICE_URL || "http://localhost:3004";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function json(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  return { status: res.status, data: await res.json() };
}

// --- Tests ---

console.log("\n=== Health Checks ===");

await test("order-service is healthy", async () => {
  const { status, data } = await json(`${ORDER_SERVICE}/health`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.status === "ok", "Expected status ok");
});

await test("notification-service is healthy", async () => {
  const { status, data } = await json(`${NOTIFICATION_SERVICE}/health`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.status === "ok", "Expected status ok");
});

await test("inventory-service is healthy", async () => {
  const { status, data } = await json(`${INVENTORY_SERVICE}/health`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.status === "ok", "Expected status ok");
});

await test("search-service is healthy", async () => {
  const { status, data } = await json(`${SEARCH_SERVICE}/health`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.status === "ok", "Expected status ok");
});

await test("api-gateway is healthy", async () => {
  const { status, data } = await json(`${GATEWAY}/health`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.status === "ok", "Expected status ok");
});

console.log("\n=== Inventory Setup ===");

await test("create product stock", async () => {
  const { status, data } = await json(`${INVENTORY_SERVICE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "e2e-p1", name: "E2E Laptop", stock: 50, price: 1299.99 }),
  });
  assert(status === 201, `Expected 201, got ${status}`);
  assert(data.success === true, "Expected success");
});

await test("verify product exists", async () => {
  const { status, data } = await json(`${INVENTORY_SERVICE}/products/e2e-p1`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.data.stock === 50, `Expected stock 50, got ${data.data.stock}`);
});

console.log("\n=== Order Flow (Direct) ===");

let orderId: string;

await test("create order", async () => {
  const { status, data } = await json(`${ORDER_SERVICE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "E2E Test User",
      customerEmail: "e2e@test.com",
      items: [{ productId: "e2e-p1", name: "E2E Laptop", quantity: 2, price: 1299.99 }],
    }),
  });
  assert(status === 201, `Expected 201, got ${status}`);
  assert(data.success === true, "Expected success");
  assert(data.data.status === "pending", "Expected pending status");
  assert(data.data.totalAmount === 2599.98, `Expected 2599.98, got ${data.data.totalAmount}`);
  orderId = data.data.id;
});

await test("get order by id", async () => {
  const { status, data } = await json(`${ORDER_SERVICE}/orders/${orderId}`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.data.id === orderId, "Order ID mismatch");
});

await test("list orders includes new order", async () => {
  const { status, data } = await json(`${ORDER_SERVICE}/orders`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.data.some((o: { id: string }) => o.id === orderId), "Order not found in list");
});

await test("update order status", async () => {
  const { status, data } = await json(`${ORDER_SERVICE}/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "confirmed" }),
  });
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.data.status === "confirmed", "Expected confirmed status");
});

console.log("\n=== Event Propagation (wait 2s for consumers) ===");
await new Promise((r) => setTimeout(r, 2000));

await test("notification was created for order", async () => {
  const { status, data } = await json(`${NOTIFICATION_SERVICE}/notifications/${orderId}`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.data.length >= 1, `Expected at least 1 notification, got ${data.data.length}`);
});

await test("stock was decreased", async () => {
  const { status, data } = await json(`${INVENTORY_SERVICE}/products/e2e-p1`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.data.stock === 48, `Expected stock 48, got ${data.data.stock}`);
});

await test("order is searchable in ElasticSearch", async () => {
  const { status, data } = await json(`${SEARCH_SERVICE}/search?q=E2E`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.data.total >= 1, `Expected at least 1 result, got ${data.data.total}`);
});

console.log("\n=== Validation ===");

await test("rejects invalid order (missing items)", async () => {
  const { status } = await json(`${ORDER_SERVICE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName: "", customerEmail: "bad", items: [] }),
  });
  assert(status === 400, `Expected 400, got ${status}`);
});

await test("returns 404 for non-existent order", async () => {
  const { status } = await json(`${ORDER_SERVICE}/orders/00000000-0000-0000-0000-000000000000`);
  assert(status === 404, `Expected 404, got ${status}`);
});

console.log("\n=== Search Stats ===");

await test("search stats return aggregations", async () => {
  const { status, data } = await json(`${SEARCH_SERVICE}/search/stats`);
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.success === true, "Expected success");
});

// --- Summary ---
console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
