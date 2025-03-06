import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ 
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages ],
});

client.once('ready', () => {
    console.log(`Client is ready! Logged in as ${client.user?.tag}`);
}); 

client.login(process.env.DISCORD_TOKEN);