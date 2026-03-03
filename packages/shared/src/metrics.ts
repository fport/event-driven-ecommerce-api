import type { Context, Next } from "hono";

interface MetricEntry {
  method: string;
  path: string;
  status: number;
  duration: number;
}

const metrics: MetricEntry[] = [];
let requestCount = 0;
let errorCount = 0;
const startTime = Date.now();

export function metricsMiddleware() {
  return async (c: Context, next: Next) => {
    const start = performance.now();
    await next();
    const duration = performance.now() - start;

    requestCount++;
    if (c.res.status >= 400) errorCount++;

    metrics.push({
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
    });

    // Keep only last 1000 entries
    if (metrics.length > 1000) metrics.splice(0, metrics.length - 1000);
  };
}

export function getPrometheusMetrics(serviceName: string): string {
  const uptime = (Date.now() - startTime) / 1000;

  // Aggregate by method+path+status
  const buckets = new Map<string, { count: number; totalDuration: number }>();
  for (const m of metrics) {
    const key = `${m.method}|${m.path}|${m.status}`;
    const existing = buckets.get(key) || { count: 0, totalDuration: 0 };
    existing.count++;
    existing.totalDuration += m.duration;
    buckets.set(key, existing);
  }

  const lines: string[] = [
    `# HELP http_requests_total Total HTTP requests`,
    `# TYPE http_requests_total counter`,
    `http_requests_total{service="${serviceName}"} ${requestCount}`,
    `# HELP http_errors_total Total HTTP errors (4xx+5xx)`,
    `# TYPE http_errors_total counter`,
    `http_errors_total{service="${serviceName}"} ${errorCount}`,
    `# HELP process_uptime_seconds Process uptime`,
    `# TYPE process_uptime_seconds gauge`,
    `process_uptime_seconds{service="${serviceName}"} ${uptime.toFixed(1)}`,
    `# HELP http_request_duration_ms HTTP request duration`,
    `# TYPE http_request_duration_ms summary`,
  ];

  for (const [key, val] of buckets) {
    const [method, path, status] = key.split("|");
    const avg = val.totalDuration / val.count;
    lines.push(
      `http_request_duration_ms{service="${serviceName}",method="${method}",path="${path}",status="${status}"} ${avg.toFixed(2)}`,
    );
    lines.push(
      `http_request_count{service="${serviceName}",method="${method}",path="${path}",status="${status}"} ${val.count}`,
    );
  }

  return lines.join("\n") + "\n";
}
