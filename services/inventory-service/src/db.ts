import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const PRODUCT_PREFIX = "product:";

export interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
}

export const inventoryDb = {
  async getProduct(id: string): Promise<Product | null> {
    const data = await redis.get(`${PRODUCT_PREFIX}${id}`);
    return data ? JSON.parse(data) : null;
  },

  async setProduct(product: Product): Promise<void> {
    await redis.set(`${PRODUCT_PREFIX}${product.id}`, JSON.stringify(product));
  },

  async getAllProducts(): Promise<Product[]> {
    const keys = await redis.keys(`${PRODUCT_PREFIX}*`);
    if (keys.length === 0) return [];

    const values = await redis.mget(keys);
    return values.filter(Boolean).map((v) => JSON.parse(v as string));
  },

  async decreaseStock(productId: string, quantity: number): Promise<{ success: boolean; stock?: number }> {
    const product = await this.getProduct(productId);
    if (!product) return { success: false };
    if (product.stock < quantity) return { success: false, stock: product.stock };

    product.stock -= quantity;
    await this.setProduct(product);
    return { success: true, stock: product.stock };
  },

  async deleteProduct(id: string): Promise<boolean> {
    const result = await redis.del(`${PRODUCT_PREFIX}${id}`);
    return result > 0;
  },
};
