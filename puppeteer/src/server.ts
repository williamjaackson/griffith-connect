import express from 'express';
import { updateMembers } from './members';
import { getRedisClient } from './lib/redis';

const app  = express();
const port = 3000;

app.get('/update-members', async (req, res) => {
    await updateMembers();
    res.send('Members updated');
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

async function ready() {
    // const redis = await getRedisClient();
    // await redis.subscribe('update-members', async () => {
    //     await updateMembers();
    // });

    console.log('Starting pinging...')
    // every 10 minutes
    await updateMembers();
    setInterval(updateMembers, 10 * 60 * 1000);
}

ready();