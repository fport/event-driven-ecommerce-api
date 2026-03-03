import { Hono } from "hono";
import { z } from "zod";
import { inventoryDb } from "./db";

const app = new Hono();

const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  stock: z.number().int().nonnegative(),
  price: z.number().positive(),
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "inventory-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /products - List all products
app.get("/products", async (c) => {
  const products = await inventoryDb.getAllProducts();
  return c.json({ success: true, data: products });
});

// GET /products/:id - Get product by ID
app.get("/products/:id", async (c) => {
  const product = await inventoryDb.getProduct(c.req.param("id"));
  if (!product) {
    return c.json({ success: false, error: "Product not found" }, 404);
  }
  return c.json({ success: true, data: product });
});

// POST /products - Create or update product
app.post("/products", async (c) => {
  const body = await c.req.json();
  const result = productSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { success: false, error: result.error.issues.map((i) => i.message).join(", ") },
      400,
    );
  }

  await inventoryDb.setProduct(result.data);
  return c.json({ success: true, data: result.data }, 201);
});

// DELETE /products/:id - Delete product
app.delete("/products/:id", async (c) => {
  const deleted = await inventoryDb.deleteProduct(c.req.param("id"));
  if (!deleted) {
    return c.json({ success: false, error: "Product not found" }, 404);
  }
  return c.json({ success: true });
});

export default app;
