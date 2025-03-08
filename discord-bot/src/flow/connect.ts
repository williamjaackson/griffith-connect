import { ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder } from "@discordjs/builders";
import { ButtonInteraction, ButtonStyle, CommandInteraction, MessageFlags, ModalSubmitInteraction, TextInputStyle } from "discord.js";

const FLOW = __filename.split('/').pop()?.split('.')[0];

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
                .setMinLength(7)
                .setMaxLength(8)
        ])
    ])

const codeModal = new ModalBuilder()
    .setCustomId(`flow:${FLOW}:3`)
    .setTitle('Verification Code')
    .addComponents([
        new ActionRowBuilder<TextInputBuilder>().addComponents([
            new TextInputBuilder()
                .setCustomId('code')
                .setLabel('Enter the verification code from your email.')
                .setPlaceholder('123456')
                .setStyle(TextInputStyle.Short)
                .setMinLength(6)
                .setMaxLength(6)
        ])
    ])

// entry. called when a /verify commad or verify button is pressed.
// -> open a modal to prompt the user to enter their student number.
async function entry(interaction: ButtonInteraction | CommandInteraction) {
    await interaction.showModal(sNumberModal);
}

// step1. called when the user has entered their student number.
// -> send an email to the user, and offer resend.
async function step1(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({
        withResponse: true,
        flags: [MessageFlags.Ephemeral],
    })
    
    // verify sNumber
    const sNumber = interaction.fields.getTextInputValue('sNumber');
    if (!sNumber.match(/^s\d{6,7}$/)) { // sNumber with s + 6 or 7 digits.
        return await interaction.editReply({
            content: `Invalid student number. Please enter a valid Griffith Student Number (s1234567).`,
        });
    }

    // send email
    // TODO

    await interaction.editReply({
        content: `A verification code has been sent to your Griffith email address.\n\`\`\`${sNumber}@griffithuni.edu.au\`\`\``,
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder()
                .setLabel('Enter Code')
                .setCustomId(`flow:${FLOW}:2`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder() // call the entry again.
                .setLabel('Resend Code')
                .setCustomId(`flow:${FLOW}:0`)
                .setStyle(ButtonStyle.Secondary),
        ])],
    });
}

// step2. called when the user clicks the 'Enter Code' button.
// -> open a modal to prompt the user to enter the verification code.
async function step2(interaction: ButtonInteraction) {
    await interaction.showModal(codeModal);
}

export async function handler(interaction: any, stage: number) {
    if (stage === 0) return entry(interaction);
    if (stage === 1) return step1(interaction);
    if (stage === 2) return step2(interaction);
    throw new Error('Invalid flow stage.');
}