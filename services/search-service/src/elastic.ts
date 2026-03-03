import { Client } from "@elastic/elasticsearch";
import { HttpConnection } from "@elastic/transport";
import type { Order } from "@ecommerce/shared";

const INDEX = "orders";

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
  Connection: HttpConnection,
});

export async function ensureIndex(retries = 10, delay = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const exists = await client.indices.exists({ index: INDEX });
      if (!exists) {
        await client.indices.create({
          index: INDEX,
          body: {
            mappings: {
              properties: {
                id: { type: "keyword" },
                customerName: { type: "text" },
                customerEmail: { type: "keyword" },
                items: {
                  type: "nested",
                  properties: {
                    productId: { type: "keyword" },
                    name: { type: "text" },
                    quantity: { type: "integer" },
                    price: { type: "float" },
                  },
                },
                totalAmount: { type: "float" },
                status: { type: "keyword" },
                createdAt: { type: "date" },
                updatedAt: { type: "date" },
              },
            },
          },
        });
        console.log(`ElasticSearch index "${INDEX}" created`);
      }
      return;
    } catch (err) {
      console.log(`ES connection attempt ${attempt}/${retries} failed, retrying in ${delay / 1000}s...`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function indexOrder(order: Order): Promise<void> {
  await client.index({
    index: INDEX,
    id: order.id,
    document: order,
  });
}

export interface SearchParams {
  q?: string;
  status?: string;
  from?: number;
  size?: number;
}

export async function searchOrders(params: SearchParams) {
  const { q, status, from = 0, size = 20 } = params;

  const must: object[] = [];

  if (q) {
    must.push({
      multi_match: {
        query: q,
        fields: ["customerName", "customerEmail", "items.name"],
        type: "best_fields",
        fuzziness: "AUTO",
      },
    });
  }

  if (status) {
    must.push({ term: { status } });
  }

  // If no filters, match all
  const query = must.length > 0 ? { bool: { must } } : { match_all: {} };

  const result = await client.search({
    index: INDEX,
    body: {
      query,
      from,
      size,
      sort: [{ createdAt: { order: "desc" } }],
    },
  });

  return {
    total: typeof result.hits.total === "number" ? result.hits.total : result.hits.total?.value ?? 0,
    hits: result.hits.hits.map((hit) => hit._source),
  };
}

export async function getStats() {
  const result = await client.search({
    index: INDEX,
    body: {
      size: 0,
      aggs: {
        status_counts: {
          terms: { field: "status" },
        },
        total_revenue: {
          sum: { field: "totalAmount" },
        },
        avg_order_value: {
          avg: { field: "totalAmount" },
        },
        orders_over_time: {
          date_histogram: {
            field: "createdAt",
            calendar_interval: "day",
          },
        },
      },
    },
  });

  return result.aggregations;
}
