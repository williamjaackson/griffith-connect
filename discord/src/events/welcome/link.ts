import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, Interaction, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { generateOTP, validateOTP } from "../../lib/otp";
import { emailTemplate } from "../../lib/resend";
import { checkCooldown } from "../../lib/cooldown";

export const event = Events.InteractionCreate;
export const once = false;

// <flow>/<path>:<stage>:<subidentifier>

async function linkButtonPressed(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'welcome/link:0') return;

    const studentNumberModal = new ModalBuilder()
        .setCustomId('welcome/link:1')
        .setTitle('Griffith Student Number')
        .setComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('studentNumber')
                    .setLabel('Enter your Griffith Student Number (s1234567)')
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(8)
                    .setMaxLength(8)
                    .setPlaceholder('s1234567')
                    .setRequired(true)
            )
        );
    
    await interaction.showModal(studentNumberModal);
}

async function studentNumberModalSubmission(interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== 'welcome/link:1') return;
    if (!await checkCooldown(interaction)) return;

    const studentNumber = interaction.fields.getTextInputValue('studentNumber')
    if (!/^s\d{7}$/.test(studentNumber)) 
        return await interaction.reply({
            content: `Invalid student number \`${studentNumber}\`. Please use the format: \`s1234567\`.`,
            flags: MessageFlags.Ephemeral
        })
    
    await interaction.deferReply({
        withResponse: true,
        flags: MessageFlags.Ephemeral
    })

    const otp = await generateOTP(studentNumber);
    await emailTemplate(
        `${studentNumber}@griffithuni.edu.au`,
        `Verification Code - Griffith ICT Club`,
        'otp',
        { otp, studentNumber }
    )

    await interaction.editReply({
        content: `A One Time Password (OTP) has been sent to your Griffith email address. (${studentNumber}@griffithuni.edu.au:${otp})\n-# One Time Passwords may take up to 5 minutes to arrive in your inbox. If you still haven't recieved one, click 'Resend OTP'.`,
        // flags: MessageFlags.Ephemeral,
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('welcome/link:2')
                    .setLabel('Enter OTP')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('welcome/link:0')
                    .setLabel('Resend OTP')
                    .setStyle(ButtonStyle.Secondary)
            )]
    })
}

async function OTPButtonPressed(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'welcome/link:2') return;

    const OTPModal = new ModalBuilder()
        .setCustomId('welcome/link:3')
        .setTitle('One Time Password (OTP)')
        .setComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('otp')
                    .setLabel('Enter your One Time Password')
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(6)
                    .setMaxLength(6)
                    .setPlaceholder('000123')
                    .setRequired(true)
            )
        )
    
    await interaction.showModal(OTPModal);
}

async function OTPModalSubmission(interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== 'welcome/link:3') return;

    await interaction.deferReply({
        withResponse: true,
        flags: MessageFlags.Ephemeral
    })

    const otp = interaction.fields.getTextInputValue('otp')
    const studentNumber = await validateOTP(otp)
    
    if (!studentNumber)
        return await interaction.editReply({
            content: 'You entered an incorrect OTP.'
        })
    
    await interaction.editReply({
        content: `<@${interaction.user.id}> has been linked to \`${studentNumber}\`.`
    })
}

export async function execute(interaction: Interaction) {
    await linkButtonPressed(interaction);
    await studentNumberModalSubmission(interaction);
    await OTPButtonPressed(interaction);
    await OTPModalSubmission(interaction);
}