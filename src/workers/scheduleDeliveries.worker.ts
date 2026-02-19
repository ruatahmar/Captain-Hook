import { Worker } from "bullmq";
import withTransaction from "../utils/transactionWrapper";
import { enqueueDeliveryQueue, type deliveryQueuePayload } from "../jobs/jobs";
import { connection } from "../jobs/queues";

export default function startScheduleDeliveriesWorker() {
    const scheduleDeliveriesWorker = new Worker(
        'schedule-deliveries-worker', async (job) => {
            const { eventId, eventType, payload } = job.data;
            await withTransaction(async (tx) => {
                const cursor = tx.endpointSubscriptions.findMany({
                    where: {
                        eventType,
                        endpoint: {
                            isVerified: true
                        }
                    },
                    select: {
                        endpointId: true,
                        endpoint: {
                            select: {
                                url: true,
                                secret: true
                            }
                        }
                    }
                })
                const deliveriesQueue: deliveryQueuePayload[] = []
                const endpointIds: string[] = []

                for await (let endpoint of cursor) {
                    deliveriesQueue.push({
                        endpointId: endpoint.endpointId,
                        eventId,
                        payload,
                        url: endpoint.endpoint.url,
                        secret: endpoint.endpoint.secret
                    });
                    endpointIds.push(endpoint.endpointId);

                    //batch writes
                    if (deliveriesQueue.length >= 500) {
                        enqueueDeliveryQueue(deliveriesQueue)
                        await tx.deliveries.createMany({
                            data: endpointIds.map((endpoint: string) => ({
                                eventId,
                                endpointId: endpoint
                            })),
                            skipDuplicates: true
                        })
                        deliveriesQueue.length = 0
                        endpointIds.length = 0
                    }
                }

                if (deliveriesQueue.length > 0) {
                    enqueueDeliveryQueue(deliveriesQueue)
                    await tx.deliveries.createMany({
                        data: endpointIds.map((endpoint: string) => ({
                            eventId,
                            endpointId: endpoint
                        })),
                        skipDuplicates: true
                    })
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