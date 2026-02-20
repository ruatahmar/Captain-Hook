# Architecture

## Overview

```
┌─────────────────┐
│  Your App       │
│  fires event    │
└────────┬────────┘
         │ POST /events/trigger/:eventType
         ▼
┌──────────────────────────────────┐
│  API Server (Express)            │
│  1. Audit event to Postgres      │
│  2. Enqueue fanout job (BullMQ)  │
│  3. Return 202 Accepted          │
└────────┬─────────────────────────┘
         │
         ▼
┌───────────────────────────────────────┐
│  Fanout Worker (BullMQ)               │
│  Paginate endpoints from Postgres     │
│  Bulk inserts delivery rows (Postgres)|
│  Bulk enqueues delivery jobs (BullMQ) │
└────────┬──────────────────────────────┘
         │  N delivery jobs
         ▼
┌──────────────────────────────────┐
│  Delivery Queue (BullMQ/Redis)   │
└──┬──────────┬──────────┬─────────┘
   │          │          │
   ▼          ▼          ▼
Worker 1   Worker 2   Worker N     (concurrency: 50 per worker)
   │          │          │
   ▼          ▼          ▼
Endpoint   Endpoint   Endpoint
  URL 1      URL 2      URL N
   │          │          │
   └──────────┴──────────┘
              │
              ▼
     Update delivery status
       in Postgres (audit)
```

---

## Flow Breakdown

### 1. Event Trigger

When your application fires an event, the API does three things atomically before responding:

1. Inserts an audit row into the `events` table in Postgres
2. Enqueues a single **fanout job** into BullMQ
3. Returns `202 Accepted` with the `eventId`

The API never waits for delivery. It returns as soon as the job is durably enqueued in Redis. This is done for speed and to prevent blocking of the API thread.

### 2. Fan-out Worker (scheduleDeliveriesWorker)

The fanout worker queries matching active endpoints from Postgres in batches of 500 — it never loads all rows into memory at once. For each batch it flushes concurrently:

```
for each batch of 500 endpoints:
  Promise.all([
    BullMQ.addBulk(500 delivery jobs),     // enqueue to Redis
    Postgres.bulkInsert(500 delivery rows)  // audit with status PENDING
  ])

  skip += 500 // fetch next batch
```

Using `Promise.all` means the Redis and Postgres writes happen concurrently, not sequentially. Memory stays bounded at ~500 rows regardless of subscriber count. True Postgres cursors are not available through Prisma, so batch pagination achieves the same memory profile.

### 3. Delivery Workers

Delivery workers process jobs concurrently (50 at a time per worker process). For each job:

1. Sign the payload with HMAC-SHA256 using the endpoint's secret
2. POST to the endpoint URL with a 10 second timeout
3. Update the delivery row in Postgres with the status, response code, and response body

Multiple worker processes can run in parallel. BullMQ handles coordination between them — no double delivery.

### 4. Data Stores

**Redis (BullMQ)** — the queue for fanout jobs and delivery jobs. Fast, handles concurrency, retries, and backoff natively.

**Postgres** — source of truth. Stores events, endpoints, and every delivery attempt with its outcome. Queryable by event, endpoint, or status.

---

## Delivery States

| Status     | Meaning                                               |
| ---------- | ----------------------------------------------------- |
| `PENDING`  | Delivery row created, job enqueued, not yet attempted |
| `SUCCESS`  | Endpoint returned a 2xx response                      |
| `RETRYING` | Failed with 5xx or network error, scheduled for retry |
| `FAILED`   | All retry attempts exhausted                          |

> 4xx responses are marked `FAILED` immediately — a bad request won't succeed on retry.

---

## Retry Behavior

BullMQ handles retries automatically with exponential backoff. Retries for delivery are triggered when:

- The endpoint returns a 5xx response
- The request times out (10 second limit)
- A network error occurs (endpoint unreachable)

| Attempt | Delay      |
| ------- | ---------- |
| 1       | 30 seconds |
| 2       | 1 minute   |
| 3       | 2 minutes  |
| 4       | 4 minutes  |
| 5       | 8 minutes  |

After 5 failed attempts the delivery is marked `FAILED`. You can trigger a manual retry via the API at any point — see [API Reference](api.md#manually-retry-a-failed-delivery).

Configured on enqueue:

```typescript
  attempts:5,
  backoff: {
    type: "exponential",
    delay: 30000, // 30s base
```

---

## Webhook Signature Verification

Every delivery includes an `X-Webhook-Signature` header — an HMAC-SHA256 hash of the request body signed with the endpoint's secret. This lets receivers verify the payload came from this system and was not tampered with.

### How to verify on your server

```typescript
import crypto from "crypto";

function verifyWebhook(
  secret: string,
  body: string,
  signature: string,
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expected = hmac.digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

app.post("/webhooks", (req, res) => {
  const signature = req.headers["x-webhook-signature"] as string;
  const { payload } = req.body;

  const isValid = verifyWebhook(
    YOUR_SECRET,
    JSON.stringify(req.body),
    signature,
  );

  if (!isValid) return res.status(401).send("Invalid signature");

  console.log("Payload:", payload);
  return res.sendStatus(200);
});
```

> Always use `crypto.timingSafeEqual` instead of `===` to prevent timing attacks.
