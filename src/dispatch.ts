import { Client, MessageFlags } from "discord.js";
import fs from 'fs';
import path from 'path';

export function startDispatcher(client: Client) {
    const flowDir = path.join(__dirname, 'flow');

    fs.readdirSync(flowDir).forEach(file => {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
            import(path.join(flowDir, file));
        }
    });

    // call the correct flow for an interaction.
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isMessageComponent() && 
            !interaction.isModalSubmit()) return;
        
        const [ system, action, step ] = interaction.customId.split(':');
        if (system !== 'flow') return console.log(system, action, step);
        
        try {
            const flow = await import(`./flow/${action}`);
            await flow['handler'](interaction, parseInt(step));
        } catch (err: any) {
            console.error(err);
            await interaction.reply({ 
                content: `An error occurred while processing your request.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    });

    console.log('Dispatcher started!');
}