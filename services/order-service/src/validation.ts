import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  items: z.array(orderItemSchema).min(1),
});

const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const updateOrderSchema = z.object({
  customerName: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  status: orderStatusSchema.optional(),
});
