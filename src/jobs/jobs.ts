import { getScheduleDeliveriesQueue, getEndpointVerificationQueue, getDeliveryQueue } from "./queues";

type endpointVerificationQueuePayload = {
    endpointId: string,
    url: string,
    secret: string,
    events: string[]
}

export type scheduleDeliveriesQueuePayload = {
    eventId: string,
    eventType: string,
    payload: unknown,
}

export type deliveryQueuePayload = {
    endpointId: string,
    eventId: string,
    payload: any,
    url: string,
    secret: string
}

export function enqueueScheduleDeliveriesQueue(payload: scheduleDeliveriesQueuePayload) {
    const queue = getScheduleDeliveriesQueue();
    queue.add('schedule-deliveries',
        payload,
        {
            jobId: `schedule-deliveries-${payload.eventId}`,
            attempts: 3,
            backoff: {
                delay: 2000,
                type: "exponential"
            },
            removeOnFail: false,
            removeOnComplete: true,
        }
    )
}

export function enqueueEndpointVerificationQueue(payload: endpointVerificationQueuePayload) {
    const queue = getEndpointVerificationQueue();
    queue.add('endpoint-verification',
        payload,
        {
            jobId: `endpoint-verification-${payload.endpointId}`,
            attempts: 3,
            backoff: {
                delay: 5000,
                type: "exponential"
            },
            removeOnComplete: true,
            removeOnFail: false
        }
    )
}

export function enqueueDeliveryQueue(deliveries: deliveryQueuePayload[]) {
    const queue = getDeliveryQueue();
    const deliveriesBulk = deliveries.map(delivery => (
        {
            name: 'delivery',
            data: delivery,
            opts: {
                jobId: `delivery-${delivery.eventId}-${delivery.endpointId}`,
                attempts: 5,
                backoff: {
                    delay: 30000,
                    type: "exponential"
                },
                removeOnComplete: true,
                removeOnFail: false
            }
        }));
    queue.addBulk(deliveriesBulk)
}