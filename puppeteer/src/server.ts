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