import { getRedisClient } from "./lib/redis";
import { updateMembers } from "./members";

async function main() {
    let redis = await getRedisClient();
    redis = await redis.duplicate();
    await redis.connect();

    await redis.flushAll()
    await redis.del('lock:updating_members');

    await redis.subscribe('update-members', async (arg) => {
        await updateMembers()
    })
}

main();
// updateMembers();
setInterval(updateMembers, 1000 * 60 * 30) // 30 minutes