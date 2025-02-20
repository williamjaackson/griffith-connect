import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log('Bot is ready!');
  client.user?.setActivity('grimly doing work...', { type: 0 });
});

client.login(process.env.DISCORD_TOKEN);