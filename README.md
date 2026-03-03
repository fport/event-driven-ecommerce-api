# Event-Driven E-Commerce Order System

Progressive microservices project for learning event-driven architecture.

## Architecture

### System Overview

```mermaid
graph TB
    Client[Client] -->|HTTP| OS[Order Service :3001]
    Client -->|HTTP| NS_API[Notification Service :3002]
    Client -->|HTTP| IS_API[Inventory Service :3003]

    OS -->|Read/Write| PG[(PostgreSQL)]
    OS -->|Cache| RD[(Redis)]
    OS -->|Publish Event| RMQ[[RabbitMQ\norders.exchange\ntopic]]

    RMQ -->|order.created\norder.updated| NQ[notification.orders queue]
    RMQ -->|order.created| IQ[inventory.orders queue]

    NQ --> NS[Notification Service\nConsumer]
    NS -->|Save| MDB[(MongoDB)]

    IQ --> IS[Inventory Service\nConsumer]
    IS -->|Decrease Stock| RD

    RMQ -->|Failed messages| DLX[[DLX\norders.exchange.dlx\nfanout]]
    DLX --> DLQ[orders.dlq]

    style OS fill:#4CAF50,color:#fff
    style NS fill:#2196F3,color:#fff
    style NS_API fill:#2196F3,color:#fff
    style IS fill:#9C27B0,color:#fff
    style IS_API fill:#9C27B0,color:#fff
    style RMQ fill:#FF9800,color:#fff
    style DLX fill:#f44336,color:#fff
```

### Event Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant OS as Order Service
    participant PG as PostgreSQL
    participant RD as Redis
    participant RMQ as RabbitMQ
    participant NS as Notification Service
    participant MDB as MongoDB

    C->>OS: POST /orders
    OS->>PG: Insert order
    OS->>RD: Cache order
    OS->>RMQ: Publish order.created
    OS-->>C: 201 Created

    par Notification
        RMQ->>NS: Deliver message
        NS->>MDB: Save notification
        NS-->>RMQ: ACK
    and Inventory
        RMQ->>IS: Deliver message
        IS->>RD: Decrease stock
        IS-->>RMQ: ACK
    end

    Note over NS,RMQ: Hata durumunda 3 kez retry,<br/>sonra DLQ'ya gönderilir
```

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

## API Endpoints (notification-service :3002)

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /notifications | List notifications (limit query param) |
| GET | /notifications/:orderId | Get notifications for an order |

## API Endpoints (inventory-service :3003)

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /products | List all products |
| GET | /products/:id | Get product by ID |
| POST | /products | Create/update product |
| DELETE | /products/:id | Delete product |

### Example: Add Stock

```bash
curl -X POST http://localhost:3003/products \
  -H "Content-Type: application/json" \
  -d '{"id": "p1", "name": "Laptop", "stock": 100, "price": 999.99}'
```

## API Endpoints (search-service :3004)

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /search?q=&status=&from=&size= | Full-text search orders |
| GET | /search/stats | Aggregated stats (status counts, revenue) |

### Example: Search

```bash
# Full-text search
curl "http://localhost:3004/search?q=laptop&status=pending"

# Get stats
curl "http://localhost:3004/search/stats"
```

## Infrastructure

### PostgreSQL
- **Port:** 5432
- **Credentials:** postgres / postgres
- **Database:** orders
- Connect: `psql -h localhost -U postgres -d orders`

### Redis
- **Port:** 6379
- Monitor: `redis-cli MONITOR`
- List keys: `redis-cli KEYS '*'`

### MongoDB
- **Port:** 27017
- **Database:** notifications

### RabbitMQ
- **Port:** 5672 (AMQP), 15672 (Management UI)
- **Credentials:** guest / guest
- **Management UI:** http://localhost:15672

### ElasticSearch
- **Port:** 9200
- Health: `curl http://localhost:9200/_cluster/health?pretty`

### Kibana
- **Port:** 5601
- **Dashboard:** http://localhost:5601

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

## Roadmap

| # | Proje | Konu | Durum |
|---|-------|------|-------|
| 1 | Docker + Hono.dev | Order Service CRUD, Dockerfile, docker-compose | Done |
| 2 | PostgreSQL + Redis | Drizzle ORM, caching, rate limiting | Done |
| 3 | RabbitMQ Events | Notification & Inventory service, DLX/DLQ | Done |
| 4 | ElasticSearch | Search Service, full-text search | Done |
| 5 | Monitoring | Elastic APM + Kibana | Done |
| 6 | API Gateway | Auth (Better Auth), routing, circuit breaker | Done |
| 7 | Kubernetes | K8s deployment, Helm, HPA, Ingress | Done |
| 8 | Terraform + CI/CD | IaC, GitHub Actions pipeline | Done |
