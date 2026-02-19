import { tryCatch, Worker } from "bullmq";
import { connection } from "../jobs/queues";
import { generateHmac } from "../modules/webhooks/webhooks.services";
import prisma from "../infra/db";
import { DeliveryStatus } from "../../generated/prisma/enums";

export function startDeliveryWorker() {
    const deliveryWorker = new Worker(
        'delivery-worker',
        async (job) => {
            const { endpointId, eventId, payload, url, secret, event, endpoint, } = job.data

            try {
                const signature = generateHmac(secret, JSON.stringify(payload));
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        "Content-Type": 'application/json',
                        "X-Webhook-Signature": signature
                    },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(10000)
                })

                const responseBody = await res.text()
                let status: DeliveryStatus
                if (res.ok) {
                    status = DeliveryStatus.SUCCESS
                } else if (res.status >= 500) {
                    status = DeliveryStatus.RETRYING
                } else {
                    status = DeliveryStatus.FAILED
                }

                await prisma.delivery.update({
                    where: {
                        eventId_endpointId: {
                            eventId,
                            endpointId
                        },
                    },
                    data: {
                        status,
                        responseCode: res.status,
                        responseBody
                    }
                })
                if (!res.ok && res.status >= 500) throw new Error(`Server error: ${res.status}`)
            } catch (error) {
                //extra safe ,just incase of network failures 
                await prisma.delivery.update({
                    where: { eventId_endpointId: { eventId, endpointId } },
                    data: { status: DeliveryStatus.RETRYING }
                })
                throw error;

            }

        },
        {
            connection: connection,
            concurrency: 50
        }
    )

    deliveryWorker.on("ready", () => {
        console.log("[delivery-worker] Ready.")
    })

    deliveryWorker.on("active", (job) => {
        console.log("[delivery-worker] Active :", job?.id)
    })

    deliveryWorker.on("completed", (job) => {
        console.log("[delivery-worker] Completed :", job?.id)
    })

    deliveryWorker.on("failed", (job, err) => {
        console.error("[delivery-worker] Failed :", job?.id, err)
    })


    return deliveryWorker;
}       