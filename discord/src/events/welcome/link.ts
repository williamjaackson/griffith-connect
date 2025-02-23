import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Events, Interaction, MessageFlags, ModalBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { generateOTP, validateOTP } from "../../lib/otp";
import { emailTemplate } from "../../lib/resend";
import { checkCooldown } from "../../lib/cooldown";
import { config } from "../../lib/config";
import axios from "axios";
import { getDatabaseClient } from "../../lib/database";
import { getRedisClient } from "../../lib/redis";

export const event = Events.InteractionCreate;
export const once = false;

// <flow>/<path>:<stage>:<subidentifier>

async function linkButtonPressed(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'welcome/link:0') return;
    if (!await checkCooldown(interaction)) return;

    const sql = await getDatabaseClient();
    const [discordMember] = await sql('SELECT * FROM discord_members WHERE id = $1', [interaction.user.id]);
    if (discordMember) {
        await interaction.reply({
            content: `<@${interaction.user.id}> has been connected to \`${discordMember.student_number}\`.`,
            flags: MessageFlags.Ephemeral
        });

        if (interaction.guild && interaction.member) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            await member.roles.add(config.ROLES.STUDENT);
        }

        const [campusUser] = await sql('SELECT * FROM campus_users WHERE student_number = $1', [discordMember.student_number]);

        if (campusUser) {
            // Give the user the club member role
            if (interaction.guild && interaction.member) {
                const member = await interaction.guild.members.fetch(interaction.user.id);
                await member.roles.add(config.ROLES.CLUB_MEMBER);
            }
        }

        return;
    }

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
    
    if (!studentNumber) {
        return await interaction.editReply({
            content: 'You entered an incorrect OTP.'
        })
    }

    const sql = await getDatabaseClient();
    await sql('INSERT INTO griffith_students (student_number) VALUES ($1) ON CONFLICT DO NOTHING', [studentNumber]);

    // remove any existing connections between either account.
    await sql('DELETE FROM discord_members WHERE id = $1 OR student_number = $2', [interaction.user.id, studentNumber]);
    await sql('INSERT INTO discord_members (id, student_number) VALUES ($1, $2)', [interaction.user.id, studentNumber]);

    // give user role config.ROLES.STUDENT
    if (interaction.guild && interaction.member) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.roles.add(config.ROLES.STUDENT);
    }

    await interaction.editReply({
        content: `<@${interaction.user.id}> has been connected to \`${studentNumber}\`.`
    })

    
    const redis = await getRedisClient();
    
    const dispatchList = JSON.parse(await redis.get('welcome:dispatch-list') || '[]')
    dispatchList.push(interaction.user.id)
    await redis.set('welcome:dispatch-list', JSON.stringify(dispatchList))
    
    await redis.publish('update-members', '1');
}

async function clubMemberButtonPressed(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'welcome/link/club-invite:0') return;

    await interaction.reply({
        content: 'Please contact a Club Executive to rectify.',
        flags: MessageFlags.Ephemeral
    });
}

export async function execute(interaction: Interaction) {
    await linkButtonPressed(interaction);
    await studentNumberModalSubmission(interaction);
    await OTPButtonPressed(interaction);
    await OTPModalSubmission(interaction);
    await clubMemberButtonPressed(interaction);
}