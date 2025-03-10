import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders';
import { ButtonStyle, Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { startDispatcher } from './dispatch';
import { redisClient } from './lib/redis';
import config from '../config.json';
import { deployCommands } from './commands';

dotenv.config();

const client = new Client({ 
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages ],
});

client.once(Events.ClientReady, async () => {
    console.log(`Client is ready! Logged in as ${client.user?.tag}`);
    await redisClient.connect().catch(err => {
        console.error('Failed to connect to Redis:', err);
    });
}); 

startDispatcher(client);

client.on(Events.GuildMemberAdd, async (member) => {
    await member.send({
        content: 'Thanks for joining! Before you can do anything you need to connect your __Griffith sNumber__.',
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder()
                .setLabel('Go to Connect')
                .setStyle(ButtonStyle.Link)
                .setURL(config.connectMessageLink),
        ])],
    })
});

deployCommands(client);

client.login(process.env.DISCORD_TOKEN);