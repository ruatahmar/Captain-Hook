import { Queue } from 'bullmq';
import { getRedisConnection } from '../infra/redis';

let deliveryQueue: Queue | null = null
let endpointVerificationQueue: Queue | null = null
let scheduleDeliveriesQueue: Queue | null = null

// export const connection = {
//     host: process.env.REDIS_HOST,
//     port: Number(process.env.REDIS_PORT),
// };

export function getScheduleDeliveriesQueue() {
    const connection = getRedisConnection()
    if (!scheduleDeliveriesQueue) {
        scheduleDeliveriesQueue = new Queue('schedule-deliveries', { connection });
        scheduleDeliveriesQueue.on("error", (err) => {
            console.error("Schedule deliveries queue error:", err.message);
        });
    }
    return scheduleDeliveriesQueue;
}

export function getEndpointVerificationQueue() {
    const connection = getRedisConnection()
    if (!endpointVerificationQueue) {
        endpointVerificationQueue = new Queue('endpoint-verifications', { connection });
        endpointVerificationQueue.on("error", (err) => {
            console.error("Endpoint verification queue error:", err.message);
        });
    }
    return endpointVerificationQueue;
}

export function getDeliveryQueue() {
    const connection = getRedisConnection()
    if (!deliveryQueue) {
        deliveryQueue = new Queue('delivery', { connection });
        deliveryQueue.on("error", (err) => {
            console.error("Delivery queue error:", err.message);
        });
    }
    return deliveryQueue;
}