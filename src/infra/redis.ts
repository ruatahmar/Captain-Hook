import Redis from 'ioredis'
import 'dotenv/config'

export async function checkRedisConnection() {
    const client = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        maxRetriesPerRequest: 1,
        connectTimeout: 10000,
        lazyConnect: true,
    })

    try {
        await client.connect()
        await client.ping()
        console.log('[redis] Connection verified')
    } catch (err) {
        console.error('[redis] Could not connect:', err)
        process.exit(1)
    } finally {
        //this is just for health check lol
        await client.quit()
    }
}