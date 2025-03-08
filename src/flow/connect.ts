import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from "@discordjs/builders";
import { ButtonInteraction, CommandInteraction, ModalSubmitInteraction, TextInputStyle } from "discord.js";

const FLOW = __filename.split('/').pop()?.split('.')[0];
console.log(`Flow: ${FLOW}`);

console.log('building modal...')
const sNumberModal = new ModalBuilder()
    .setCustomId(`flow:${FLOW}:1`)
    .setTitle('Griffith Student Number')
    .addComponents([
        new ActionRowBuilder<TextInputBuilder>().addComponents([
            new TextInputBuilder()
                .setCustomId('sNumber')
                .setLabel('Enter your Griffith Student Number (s1234567)')
                .setPlaceholder('s1234567')
                .setStyle(TextInputStyle.Short)
        ])
    ])

// entry. called when a /verify commad or verify button is pressed.
// -> open a modal to prompt the user to enter their student number.
async function entry(interaction: ButtonInteraction | CommandInteraction) {
    if (interaction.isButton()) console.log('Button interaction!');
    if (interaction.isCommand()) console.log('Command interaction!');

    await interaction.showModal(sNumberModal);
}

// step1. called when the user has entered their student number.
// -> send an email to the user, and offer resend.
async function step1(interaction: ModalSubmitInteraction) {
    if (interaction.isButton()) console.log('Button interaction!');
    if (interaction.isCommand()) console.log('Command interaction!');

    await interaction.reply('Step 1');
}

export async function handler(interaction: any, stage: number) {
    if (stage === 0) return entry(interaction);
    if (stage === 1) return step1(interaction);
    throw new Error('Invalid flow stage.');
}