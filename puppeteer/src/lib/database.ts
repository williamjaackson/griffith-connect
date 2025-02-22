import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;

export async function getDatabaseClient() {
    if (client) return client;

    client = neon(process.env.NEON_URL!);
    
    return client;
}