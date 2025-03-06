import { ButtonInteraction, CommandInteraction } from "discord.js";

export async function verificationFlow(interaction: ButtonInteraction | CommandInteraction) {
    if (interaction.isButton()) console.log('Button interaction!');
    if (interaction.isCommand()) console.log('Command interaction!');
}