import { Queue } from 'bullmq';

// import { getRedis } from '../infra/redis';
// import type { Redis } from 'ioredis';

// let redisConnection: Redis | null = null
let deliveryQueue: Queue | null = null
let endpointVerificationQueue: Queue | null = null
// function getConnection() {
//     if (!redisConnection) {
//         redisConnection = getRedis()
//     }
//     return redisConnection;
// }
const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
};

export function getDeliveryQueue() {
    if (!deliveryQueue) {
        deliveryQueue = new Queue('deliveries', { connection });
        deliveryQueue.on("error", (err) => {
            console.error("Delivery queue error:", err.message);
        });
    }
    return deliveryQueue;
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

