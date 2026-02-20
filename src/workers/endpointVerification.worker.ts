import { Worker } from "bullmq";
import { generateHmac } from "../modules/webhooks/webhooks.services";
import withTransaction from "../utils/transactionWrapper";
import { randomUUID } from "node:crypto";
import { connection } from "../jobs/queues";

export default function startEndpointVerificationWorker() {
    const endpointVerificationWorker = new Worker(
        `endpoint-verifications`,
        async (job) => {
            const { endpointId, url, secret, events } = job.data;

            const payload = {
                events
            }


            const signature = generateHmac(secret, JSON.stringify(payload))
            console.log(url)
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Webhook-Signature": signature
                },
                body: JSON.stringify(payload),
                // signal: AbortSignal.timeout(10000)
            })

            if (!res.ok) throw new Error(`Verification failed with status ${res.status}`);

            await withTransaction(async (tx) => {
                const endpoint = await tx.webhookEndpoint.findUnique({
                    where: { id: endpointId },
                    select: { isVerified: true }
                })
                if (endpoint?.isVerified) return;

                await tx.webhookEndpoint.update({
                    where: { id: endpointId },
                    data: {
                        isVerified: true,
                        verifiedAt: new Date(Date.now())
                    }
                })
                await tx.endpointSubscription.createMany({
                    data: events.map((event: string) => ({
                        endpointId,
                        eventType: event
                    })),
                    skipDuplicates: true
                })

            })
        },
        {
            connection: connection,
        }
    );

    endpointVerificationWorker.on("ready", () => {
        console.log("[endpoint-verification-worker] Ready.")
    })

    endpointVerificationWorker.on("active", (job) => {
        console.log("[endpoint-verification-worker] Active :", job?.id)
    })

    endpointVerificationWorker.on("completed", (job) => {
        console.log("[endpoint-verification-worker] Completed :", job?.id)
    })

    endpointVerificationWorker.on("failed", (job, err) => {
        console.error("[endpoint-verification-worker] Failed :", job?.id, err)
    })

    return endpointVerificationWorker;
}
