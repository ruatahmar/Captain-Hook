# Captain-Hook.

A scalable, reliable webhook delivery system built with TypeScript, Express, PostgreSQL, Redis, and BullMQ. Supports fan-out delivery to thousands of subscribers, HMAC signature verification, automatic retries with exponential backoff, and full delivery audit logging.

---

## Documentation

- [Architecture, Retries & Signature Verification](docs/architecture.md)
- [API Reference](docs/api.md)

---

## Concepts

**Endpoint** — A URL registered by a subscriber to receive webhook events. Each endpoint has a secret used to verify incoming payloads.

**Event** — Something that happened in your application (e.g. `order.placed`, `payment.failed`). Triggering an event fans it out to all subscribed endpoints.

**Delivery** — A single attempt to send an event to one endpoint. Each event creates one delivery record per subscribed endpoint.

**Fan-out** — The process of taking one triggered event and creating individual delivery jobs for every subscribed endpoint.

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

### Installation

```bash
git clone https://github.com/<your-username>/Captain-Hook.git
cd Captain-Hook
npm install
```

### Database

```bash
npx prisma migrate dev
npx prisma generate
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Workers start automatically with the server.

---

## Environment Variables

```env
# Server
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/webhooks

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

> In production, `REDIS_HOST` and `REDIS_PORT` are required. The server will throw on startup if they are missing.
