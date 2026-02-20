import { Worker } from "bullmq";
import withTransaction from "../utils/transactionWrapper";
import { enqueueDeliveryQueue, type deliveryQueuePayload } from "../jobs/jobs";
import { connection } from "../jobs/queues";
import { Prisma } from "../../generated/prisma/client";

type endpointSubscriptionPayload = Prisma.EndpointSubscriptionGetPayload<{
    select: {
        endpointId: true
        endpoint: {
            select: { url: true; secret: true }
        }
    }
}>

export default function startScheduleDeliveriesWorker() {
    const scheduleDeliveriesWorker = new Worker(
        'schedule-deliveries', async (job) => {
            const { eventId, eventType, payload } = job.data;
            await withTransaction(async (tx) => {
                const BATCH_SIZE = 500
                let skip = 0
                while (true) {
                    const endpoints = await tx.endpointSubscription.findMany({
                        where: {
                            eventType,
                            endpoint: { isVerified: true }
                        },
                        select: {
                            endpointId: true,
                            endpoint: {
                                select: { url: true, secret: true }
                            }
                        },
                        take: BATCH_SIZE,
                        skip
                    })

                    if (endpoints.length === 0) break

                    const deliveriesQueue: deliveryQueuePayload[] = endpoints.map((e: endpointSubscriptionPayload) => ({
                        endpointId: e.endpointId,
                        eventId,
                        payload,
                        url: e.endpoint.url,
                        secret: e.endpoint.secret
                    }))

                    const endpointIds = endpoints.map((e: endpointSubscriptionPayload) => e.endpointId)

                    await Promise.all([
                        enqueueDeliveryQueue(deliveriesQueue),
                        tx.delivery.createMany({
                            data: endpointIds.map((id: string) => ({ eventId, endpointId: id })),
                            skipDuplicates: true
                        })
                    ])

                    skip += endpoints.length
                    if (endpoints.length < BATCH_SIZE) break
                }

            })
        },
        {
            connection: connection,
        }
    )

    scheduleDeliveriesWorker.on("ready", () => {
        console.log("[schedule-deliveries-worker] Ready.")
    })

    scheduleDeliveriesWorker.on("active", (job) => {
        console.log("[schedule-deliveries-worker] Active :", job?.id)
    })

    scheduleDeliveriesWorker.on("completed", (job) => {
        console.log("[schedule-deliveries-worker] Completed :", job?.id)
    })

    scheduleDeliveriesWorker.on("failed", (job, err) => {
        console.error("[schedule-deliveries-worker] Failed :", job?.id, err)
    })


    return scheduleDeliveriesWorker;
}