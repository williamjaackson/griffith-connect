import { createClient } from 'redis';

// Redis client instance
let client: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
    if (client) return client;

    // Create a new Redis client
    client = createClient({
        url: process.env.REDIS_URL || 'redis://redis:6379',
        socket: {
            reconnectStrategy: (retries) => {
                // Maximum retry delay of 3 seconds
                const delay = Math.min(retries * 50, 3000);
                return delay;
            }
        }
    });

    // Error handling
    client.on('error', (err) => {
        console.error('Redis Client Error:', err);
    });

    // Connection handling
    client.on('connect', () => {
        console.log('Redis Client Connected');
    });

    client.on('reconnecting', () => {
        console.log('Redis Client Reconnecting...');
    });

    // Connect to Redis
    await client.connect();

    return client;
}