import { Queue } from 'bullmq';

// import { getRedis } from '../infra/redis';
// import type { Redis } from 'ioredis';

// let redisConnection: Redis | null = null
let deliveryQueue: Queue | null = null
let endpointVerificationQueue: Queue | null = null
let scheduleDeliveriesQueue: Queue | null = null
// function getConnection() {
//     if (!redisConnection) {
//         redisConnection = getRedis()
//     }
//     return redisConnection;
// }
export const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
};

export function getScheduleDeliveriesQueue() {
    if (!scheduleDeliveriesQueue) {
        scheduleDeliveriesQueue = new Queue('schedule-deliveries', { connection });
        scheduleDeliveriesQueue.on("error", (err) => {
            console.error("Schedule deliveries queue error:", err.message);
        });
    }
    return scheduleDeliveriesQueue;
}

export function getEndpointVerificationQueue() {
    if (!endpointVerificationQueue) {
        endpointVerificationQueue = new Queue('endpoint-verifications', { connection });
        endpointVerificationQueue.on("error", (err) => {
            console.error("Endpoint verification queue error:", err.message);
        });
    }
    return endpointVerificationQueue;
}

export function getDeliveryQueue() {
    if (!deliveryQueue) {
        deliveryQueue = new Queue('delivery', { connection });
        deliveryQueue.on("error", (err) => {
            console.error("Delivery queue error:", err.message);
        });
    }
    return deliveryQueue;
}