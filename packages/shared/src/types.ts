export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
}

export interface UpdateOrderInput {
  customerName?: string;
  customerEmail?: string;
  status?: OrderStatus;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Event types
export interface BaseEvent<T = unknown> {
  id: string;
  type: string;
  timestamp: string;
  data: T;
}

export interface OrderCreatedEvent extends BaseEvent<Order> {
  type: "order.created";
}

export interface OrderUpdatedEvent extends BaseEvent<Order> {
  type: "order.updated";
}

export type OrderEvent = OrderCreatedEvent | OrderUpdatedEvent;

// RabbitMQ constants
export const EXCHANGES = {
  ORDERS: "orders.exchange",
} as const;

export const ROUTING_KEYS = {
  ORDER_CREATED: "order.created",
  ORDER_UPDATED: "order.updated",
} as const;

export const QUEUES = {
  NOTIFICATION_ORDERS: "notification.orders",
  INVENTORY_ORDERS: "inventory.orders",
  SEARCH_ORDERS: "search.orders",
  DLQ_ORDERS: "orders.dlq",
} as const;
