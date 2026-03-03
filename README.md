# Event-Driven E-Commerce Order System

Progressive microservices project for learning event-driven architecture.

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono.dev
- **Message Broker:** RabbitMQ
- **Databases:** PostgreSQL, MongoDB, Redis, ElasticSearch
- **Monitoring:** Elastic APM + Kibana
- **Container:** Docker + Kubernetes
- **IaC:** Terraform

## Project Structure

```
services/
├── order-service/        # Order CRUD API (PostgreSQL)
├── notification-service/ # Event consumer (MongoDB)
├── inventory-service/    # Stock management (Redis)
├── search-service/       # Full-text search (ElasticSearch)
└── api-gateway/          # API Gateway + Auth
packages/
└── shared/               # Common types & utilities
infrastructure/
├── docker/
├── k8s/
└── terraform/
```

## Quick Start

```bash
# Development (with hot-reload)
docker compose -f docker-compose.dev.yml up --build

# Production
docker compose up --build
```

## API Endpoints (order-service)

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /orders | List all orders |
| GET | /orders/:id | Get order by ID |
| POST | /orders | Create new order |
| PATCH | /orders/:id | Update order |

### Example: Create Order

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "items": [
      {"productId": "p1", "name": "Laptop", "quantity": 1, "price": 999.99}
    ]
  }'
```

## Services

### PostgreSQL
- **Port:** 5432
- **Credentials:** postgres / postgres
- **Database:** orders
- Connect: `psql -h localhost -U postgres -d orders`

### Redis
- **Port:** 6379
- Monitor: `redis-cli MONITOR`
- List keys: `redis-cli KEYS '*'`

## Features

- **Caching:** Redis write-through cache on orders (5 min TTL)
- **Rate Limiting:** 100 requests/min per IP via Redis sliding window
- **Migrations:** Auto-run on startup via Drizzle ORM
- **Validation:** Zod schema validation on all inputs

## Database Migrations

```bash
cd services/order-service
bun run db:generate  # Generate migration from schema changes
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio GUI
```
