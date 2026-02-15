# Captain-Hook.

Challenges:
URL Verification: How do you validate that webhook URLs are legitimate?
Security: Payloads need HMAC signatures to prevent tampering
Reliability: What happens when a webhook endpoint is down?
Scale: How do you deliver to thousands of subscribers without blocking?
Monitoring: You need delivery stats, failure tracking, and auto-disabling of broken webhooks
Retry Logic: Exponential backoff, maximum attempts, timeout handling

generate signature function

Pipeline:
Event happens
→ stored
→ scheduled
→ delivered
→ monitored
→ retried if needed
