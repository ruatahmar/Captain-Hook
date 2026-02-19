import { Worker } from "bullmq";
import { generateHmac } from "../modules/webhooks/webhooks.services";
import withTransaction from "../utils/transactionWrapper";
import { randomUUID } from "node:crypto";
import z from 'zod'
import { connection } from "../jobs/queues";

const verificationResponseSchema = z.object({
    challenge: z.string()
});

export default function startEndpointVerificationWorker() {
    const endpointVerificationWorker = new Worker(
        `endpoint-verification-worker`,
        async (job) => {
            const { endpointId, url, secret, events } = job.data;

            const payload = {
                challenge: randomUUID(),
                events
            }

            //sends http for verification
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10000)
            })

            if (!res.ok) throw new Error(`Verification failed with status ${res.status}`);
            const raw = await res.json();
            const data = verificationResponseSchema.parse(raw)
            if (data.challenge !== payload.challenge) throw new Error("Challenge mismatch");

            await withTransaction(async (tx) => {
                const endpoint = await tx.webhookEndpoint.findUnique({
                    where: { id: endpointId },
                    select: { isVerified: true }
                })
                if (endpoint?.isVerified) return;

                await tx.webhookEndpoint.update({
                    where: { id: endpointId },
                    data: { isVerified: true }
                })
                await tx.endpointSubscriptions.createMany({
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
