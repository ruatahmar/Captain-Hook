import IORedis from 'ioredis';
import 'dotenv/config'
import ApiError from '../utils/apiError'
import type { ConnectionOptions } from 'bullmq'

const REDIS_URL = process.env.REDIS_URL
if (!REDIS_URL) throw new ApiError(400, "Provide Redis connection")

let connection: IORedis | null = null

export async function checkRedisConnection() {
    if (!connection) connection = new IORedis(`${REDIS_URL}`);
    try {
        await connection.ping()
        console.log('[redis] Connection verified')
    } catch (err) {
        console.error('[redis] Could not connect:', err)
        process.exit(1)
    }
    return connection;
}

export function getRedisConnection(): ConnectionOptions {
    const url = new URL(REDIS_URL!)
    return {
        host: url.hostname,
        port: Number(url.port),
        password: url.password,
        tls: {},
    }
}