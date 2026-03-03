import type { Order, OrderItem } from "@ecommerce/shared";
import { logger } from "@ecommerce/shared";

const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || "http://localhost:3003";

interface SagaStep {
  name: string;
  execute: () => Promise<void>;
  compensate: () => Promise<void>;
}

interface StockCheckResult {
  available: boolean;
  product?: { id: string; stock: number };
}

async function checkStock(productId: string, quantity: number): Promise<StockCheckResult> {
  const res = await fetch(`${INVENTORY_URL}/products/${productId}`);
  if (!res.ok) return { available: false };

  const { data } = await res.json() as { data: { id: string; stock: number } };
  return { available: data.stock >= quantity, product: data };
}

async function reserveStock(productId: string, quantity: number): Promise<boolean> {
  // Decrease stock (reserve)
  const res = await fetch(`${INVENTORY_URL}/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stockChange: -quantity }),
  });
  return res.ok;
}

async function releaseStock(productId: string, quantity: number): Promise<void> {
  // Compensate: restore stock
  const product = await fetch(`${INVENTORY_URL}/products/${productId}`);
  if (!product.ok) return;

  const { data } = await product.json() as { data: { id: string; name: string; stock: number; price: number } };
  await fetch(`${INVENTORY_URL}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, stock: data.stock + quantity }),
  });
}

function mockPayment(_amount: number): Promise<{ success: boolean; transactionId: string }> {
  // Simulate payment - 90% success rate
  const success = Math.random() > 0.1;
  return Promise.resolve({
    success,
    transactionId: success ? crypto.randomUUID() : "",
  });
}

function mockPaymentRefund(_transactionId: string): Promise<void> {
  logger.info("Payment refunded", { transactionId: _transactionId });
  return Promise.resolve();
}

export interface SagaResult {
  success: boolean;
  error?: string;
  paymentId?: string;
}

export async function executeOrderSaga(items: OrderItem[], totalAmount: number): Promise<SagaResult> {
  const completedSteps: SagaStep[] = [];
  let paymentTransactionId = "";

  // Step 1: Check stock for all items
  const steps: SagaStep[] = [];

  for (const item of items) {
    steps.push({
      name: `check-stock-${item.productId}`,
      execute: async () => {
        const result = await checkStock(item.productId, item.quantity);
        if (!result.available) {
          throw new Error(`Insufficient stock for ${item.productId} (need ${item.quantity}, have ${result.product?.stock ?? 0})`);
        }
      },
      compensate: async () => {}, // No compensation needed for check
    });
  }

  // Step 2: Reserve stock for all items
  for (const item of items) {
    steps.push({
      name: `reserve-stock-${item.productId}`,
      execute: async () => {
        const ok = await reserveStock(item.productId, item.quantity);
        if (!ok) throw new Error(`Failed to reserve stock for ${item.productId}`);
      },
      compensate: async () => {
        await releaseStock(item.productId, item.quantity);
      },
    });
  }

  // Step 3: Process payment
  steps.push({
    name: "process-payment",
    execute: async () => {
      const result = await mockPayment(totalAmount);
      if (!result.success) throw new Error("Payment failed");
      paymentTransactionId = result.transactionId;
    },
    compensate: async () => {
      if (paymentTransactionId) {
        await mockPaymentRefund(paymentTransactionId);
      }
    },
  });

  // Execute saga
  for (const step of steps) {
    try {
      await step.execute();
      completedSteps.push(step);
      logger.info(`Saga step completed: ${step.name}`);
    } catch (err) {
      const error = (err as Error).message;
      logger.error(`Saga step failed: ${step.name}`, { error });

      // Compensate in reverse order
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        try {
          await completedSteps[i].compensate();
          logger.info(`Compensated: ${completedSteps[i].name}`);
        } catch (compErr) {
          logger.error(`Compensation failed: ${completedSteps[i].name}`, {
            error: (compErr as Error).message,
          });
        }
      }

      return { success: false, error };
    }
  }

  return { success: true, paymentId: paymentTransactionId };
}
