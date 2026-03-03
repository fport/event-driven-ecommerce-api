import type { Context, Next } from "hono";

const APM_SERVER_URL = process.env.APM_SERVER_URL;
const SERVICE_NAME = process.env.APM_SERVICE_NAME || "unknown";

interface ApmTransaction {
  traceId: string;
  spanId: string;
  service: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  error?: string;
}

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

async function sendToApm(transaction: ApmTransaction): Promise<void> {
  if (!APM_SERVER_URL) return;

  try {
    await fetch(`${APM_SERVER_URL}/intake/v2/events`, {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body: [
        JSON.stringify({
          metadata: {
            service: { name: SERVICE_NAME, environment: process.env.NODE_ENV || "development" },
          },
        }),
        JSON.stringify({
          transaction: {
            id: transaction.spanId,
            trace_id: transaction.traceId,
            name: `${transaction.method} ${transaction.path}`,
            type: "request",
            duration: transaction.duration,
            result: `HTTP ${transaction.statusCode}`,
            timestamp: new Date(transaction.timestamp).getTime() * 1000,
            context: {
              request: { method: transaction.method, url: { pathname: transaction.path } },
              response: { status_code: transaction.statusCode },
            },
          },
        }),
        "",
      ].join("\n"),
    });
  } catch {
    // Silently fail - APM should not break the app
  }
}

export function apmMiddleware() {
  return async (c: Context, next: Next) => {
    const traceId = c.req.header("x-trace-id") || generateId() + generateId();
    const spanId = generateId();
    const start = performance.now();

    // Propagate trace context
    c.header("x-trace-id", traceId);
    c.header("x-span-id", spanId);
    c.set("traceId", traceId);
    c.set("spanId", spanId);

    await next();

    const duration = performance.now() - start;
    const transaction: ApmTransaction = {
      traceId,
      spanId,
      service: SERVICE_NAME,
      method: c.req.method,
      path: c.req.path,
      statusCode: c.res.status,
      duration,
      timestamp: new Date().toISOString(),
    };

    // Fire and forget
    sendToApm(transaction);
  };
}

// Trace context propagation helper for inter-service calls
export function getTraceHeaders(c: Context): Record<string, string> {
  return {
    "x-trace-id": c.get("traceId") || "",
    "x-span-id": c.get("spanId") || "",
  };
}
