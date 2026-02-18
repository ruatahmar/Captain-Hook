import { getDeliveryQueue, getEndpointVerificationQueue } from "./queues";

type endpointVerificationQueuePayload = {
    id: string,
    url: string,
    secret: string,
    events: string[]
}

type deliveryQueuePayload = {
    id: string,
    eventType: string
}

export function enqueueDeliveryQueue(payload: deliveryQueuePayload) {
    const queue = getDeliveryQueue();
    queue.add('delivery',
        payload,
        {
            jobId: `delivery-{}`,
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
            jobId: `endpoint-verification-${payload.id}`,
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