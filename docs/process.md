Challenges:

URL Verification: How do you validate that webhook URLs are legitimate?

Security: Payloads need HMAC signatures to prevent tampering

Reliability: What happens when a webhook endpoint is down?

Scale: How do you deliver to thousands of subscribers without blocking?

Monitoring: You need delivery stats, failure tracking, and auto-disabling of broken webhooks

Retry Logic: Exponential backoff, maximum attempts, timeout handling

created subscription endpoint:

- used async verification handler for faster and safety underconcurrency

Using prisma for ORM but all querys are in raw sql to practice

- use cursor to make the fanout faster

new arch

```
api call ---> fanout worker ---> delivery worker
```

generate signature function

Pipeline:
Event happens
→ stored
→ scheduled
→ delivered
→ monitored
→ retried if needed

After 5 failed attempts the delivery is marked `FAILED`.
