import { eq } from "drizzle-orm";
import type { Order } from "@ecommerce/shared";
import { db, readDb } from "./db";
import { orders } from "./db/schema";

function rowToOrder(row: typeof orders.$inferSelect): Order {
  return {
    id: row.id,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    items: row.items,
    totalAmount: Number(row.totalAmount),
    status: row.status as Order["status"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const store = {
  async getAll(): Promise<Order[]> {
    const rows = await readDb.select().from(orders);
    return rows.map(rowToOrder);
  },

  async getById(id: string): Promise<Order | undefined> {
    const [row] = await readDb.select().from(orders).where(eq(orders.id, id));
    return row ? rowToOrder(row) : undefined;
  },

  async create(data: {
    customerName: string;
    customerEmail: string;
    items: Order["items"];
    totalAmount: number;
  }): Promise<Order> {
    const [row] = await db
      .insert(orders)
      .values({
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        items: data.items,
        totalAmount: data.totalAmount.toFixed(2),
        status: "pending",
      })
      .returning();
    return rowToOrder(row);
  },

  async update(id: string, data: Partial<Pick<Order, "customerName" | "customerEmail" | "status">>): Promise<Order | undefined> {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.customerName !== undefined) values.customerName = data.customerName;
    if (data.customerEmail !== undefined) values.customerEmail = data.customerEmail;
    if (data.status !== undefined) values.status = data.status;

    const [row] = await db
      .update(orders)
      .set(values)
      .where(eq(orders.id, id))
      .returning();
    return row ? rowToOrder(row) : undefined;
  },
};
