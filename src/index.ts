import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders';
import { ButtonStyle, Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { startDispatcher } from './dispatch';

dotenv.config();

const client = new Client({ 
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ],
});

client.once('ready', () => {
    console.log(`Client is ready! Logged in as ${client.user?.tag}`);
}); 

startDispatcher(client);

// this is a temporary 'command' to test the bot's functionality
client.on('messageCreate', async (message) => {
    if (message.content === '!verify') {
        await message.reply({
            content: 'Verify!',
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents([
                new ButtonBuilder()
                    .setCustomId('flow:connect:0')
                    .setLabel('Connect sNumber')
                    .setStyle(ButtonStyle.Secondary),
            ])],
        });
    }
})

client.login(process.env.DISCORD_TOKEN);