#

This doc functions as a scratchpad or a rough notebook for the building phase

# Challenges:

- URL Verification: How do you validate that webhook URLs are legitimate?

- Security: Payloads need HMAC signatures to prevent tampering

- Reliability: What happens when a webhook endpoint is down?

- Scale: How do you deliver to thousands of subscribers without blocking?

- Monitoring: You need delivery stats, failure tracking, and auto-disabling of broken webhooks

- Retry Logic: Exponential backoff, maximum attempts, timeout handling

# Scale challenge

- in trigger event and create subscription endpoints, the heavy operations are made async with queues to make api responses faster

- using cursor to make the fanout (scheduleDeliveries) faster

- new arch for trigger endpoint

  ```
  api call ---> fanout worker ---> delivery worker
  ```

# auditing and reliability

- everything is stored in postgres as events to track and see history
- postgres is the single source of truth

Pipeline:
Event happens
→ stored
→ scheduled
→ delivered
→ monitored
→ retried if needed

# endpoint verification

- copied stripe style verification for endpoints

# fanout update

- initial plan was to use a cursor and stream data from postgres
- this cant be done anymore because even though postgres supports streams, primsa dosent
- maybe use drizzle as orm for future projects
