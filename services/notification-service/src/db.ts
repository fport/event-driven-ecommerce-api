import { MongoClient, type Db, type Collection } from "mongodb";

const url = process.env.MONGODB_URL || "mongodb://localhost:27017/notifications";

const client = new MongoClient(url);
let db: Db;

export interface NotificationRecord {
  orderId: string;
  customerName: string;
  customerEmail: string;
  type: string;
  message: string;
  sentAt: Date;
}

export async function connectMongo(): Promise<void> {
  await client.connect();
  db = client.db();
  console.log("MongoDB connected");
}

export function getNotificationsCollection(): Collection<NotificationRecord> {
  return db.collection<NotificationRecord>("notifications");
}
