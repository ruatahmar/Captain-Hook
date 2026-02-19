# API Reference

## Endpoints

### Register an endpoint

```
POST /webhooks/
```

**Body**

```json
{
  "url": "https://your-server.com/webhook",
  "secret": "your-signing-secret",
  "events": ["order.placed", "payment.failed"]
}
```

**Response** `202 Accepted`

```json
{
  "status": 202,
  "data": {},
  "message": "Success"
}
```

A verification request is sent to the URL before it becomes active.

---

### List all endpoints

```
GET /webhooks/endpoints
```

**Response** `200 OK`

```json
{
  "status": 200,
  "data": [
    {
      "id": "uuid",
      "url": "https://your-server.com/webhook",
      "enabled": true,
      "secret": "your-signing-secret",
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Get a specific endpoint

```
GET /webhooks/endpoints/:endpointId
```

**Response** `200 OK`

```json
{
  "status": 200,
  "data": {
    "id": "uuid",
    "url": "https://your-server.com/webhook",
    "enabled": true,
    "secret": "your-signing-secret",
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Response** `404 Not Found` — if endpoint does not exist.

---

## Events

### Trigger an event

```
POST /events/trigger/:eventType
```

**Params**

- `eventType` — e.g. `order.placed`, `payment.failed`

**Body**

```json
{
  "payload": {
    "orderId": "123",
    "amount": 99.99
  }
}
```

**Response** `202 Accepted`

```json
{
  "status": 202,
  "data": { "eventId": "uuid" },
  "message": "Event Accepted"
}
```

> Save the `eventId` — use it to query delivery status across all subscribers.

---

## Deliveries

### Get all deliveries for an event

```
GET /webhooks/events/:eventId/deliveries
```

Returns the delivery status for every endpoint that was targeted when this event was triggered.

**Response** `200 OK`

```json
{
  "status": 200,
  "data": [
    {
      "endpointId": "uuid",
      "status": "SUCCESS",
      "responseCode": 200,
      "responseBody": "ok"
    },
    {
      "endpointId": "uuid",
      "status": "FAILED",
      "responseCode": 500,
      "responseBody": "Internal Server Error"
    }
  ]
}
```

---

### Get delivery history for an endpoint

```
GET /webhooks/endpoints/:endpointId/deliveries
```

Returns all deliveries ever sent to a specific endpoint, across all events.

**Response** `200 OK` — same shape as above.

---

### Manually retry a failed delivery

```
POST /webhooks/deliveries/:deliveryId/retry
```

Re-enqueues the delivery job. Only valid for deliveries with status `FAILED` or `RETRYING`. Returns `400` if the delivery already succeeded.

**Response** `202 Accepted`

```json
{
  "status": 202,
  "data": {},
  "message": "Manual retry queued"
}
```

**Response** `404 Not Found` — if delivery does not exist.

**Response** `400 Delivery already succeeded` — if delivery status is `SUCCESS`.
