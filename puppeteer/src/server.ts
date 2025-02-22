import express from 'express';
import { updateMembers } from './members';

const app  = express();
const port = 3000;

app.get('/update-members', async (req, res) => {
    await updateMembers();
    res.send('Members updated');
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

// every minute
async function updateMembersInt() {
    console.log('Updating members...')
    await updateMembers();
}
console.log('Starting member listner.')

// run updatemembersint then run every 10 minutes
updateMembersInt();
// setInterval(updateMembersInt, 10 * 60 * 1000);