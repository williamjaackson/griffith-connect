// puppeteer/src/server.ts
import express from 'express';
import { memberList, updateMemberList } from './memberList'; // your existing function

const app = express();
const port = process.env.PORT || 3000;

app.get('/members', async (req, res) => {
  try {
    const members = await memberList();
    res.json(members);
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to fetch member list' });
  }
});

app.get('/update-members', async (req, res) => {
  try {
    const members = await updateMemberList();
    res.json(members);
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Failed to fetch member list' });
  }
});

app.listen(port, () => {
  console.log(`Puppeteer service listening on port ${port}`);
});