import { Client, Collection, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import path from 'path';
import fs from 'fs';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

declare module 'discord.js' {
	interface Client {
		commands: Collection<string, any>;
	}
}

client.commands = new Collection();

// load events
const eventGroups = path.join(__dirname, 'events');

if (fs.existsSync(eventGroups)) {
    for (const group of fs.readdirSync(eventGroups)) {
        const groupPath = path.join(eventGroups, group);
        for (const file of fs.readdirSync(groupPath)) {
            const filePath = path.join(groupPath, file);

            // import event
            const event = require(filePath);

            if (event.once) {
                client.once(event.event, (...args) => event.execute(...args));
            } else {
                client.on(event.event, (...args) => event.execute(...args));
            }
        }
    }
}

// load commands
const commandGroups = path.join(__dirname, 'commands');

if (fs.existsSync(commandGroups)) {
    for (const group of fs.readdirSync(commandGroups)) {
        const groupPath = path.join(commandGroups, group);
        for (const file of fs.readdirSync(groupPath)) {
            const filePath = path.join(groupPath, file);

            // import command
            const command = require(filePath);
            client.commands.set(command.data.name, command);
        }
    }
}

// command handler
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
	}
});

// deploy commands
const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
	try {
		console.log(`Started refreshing ${client.commands.size} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data: any = await rest.put(
			Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_TEST_GUILD!),
			{ body: client.commands.map(command => command.data.toJSON()) },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();

client.once(Events.ClientReady, (readyClient: Client<true>) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);