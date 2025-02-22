import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Events, Interaction, MessageFlags, ModalBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { generateOTP, validateOTP } from "../../lib/otp";
import { emailTemplate } from "../../lib/resend";
import { checkCooldown } from "../../lib/cooldown";
import { config } from "../../lib/config";
import axios from "axios";
import { getDatabaseClient } from "../../lib/database";

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
        content: `<@${interaction.user.id}> has been linked to \`${studentNumber}\`.`
    })

    const response = await axios.get('http://puppeteer:3000/update-members');
    if (response.status !== 200) {
        console.error('Failed to update members:', response.status, response.statusText);
    }

    // check if user is in campus.
    const [campusUser] = await sql('SELECT * FROM campus_users WHERE student_number = $1', [studentNumber]);
    if (campusUser) return;

    await interaction.user.send({
        embeds: [new EmbedBuilder()
            .setTitle('Become a Club Member')
            .setColor(0x2b2d31)
            .setThumbnail('https://i.postimg.cc/mrpv4Mqx/temp-Imagep-ZGw-L0.avif')
            .setFooter({
                text: 'Griffith Connect • Powered by Griffith ICT Club <https://wwwgriffithict.com/>'
            })
            .setDescription(`Heyo <@${interaction.user.id}>! 👋\n\nI noticed you aren't a Club Member yet! We'd love to have you as a member.`)
            .addFields([{
                name: 'Why should I join?',
                value: `- Exclusive club-only chat channels; and\n- Exciting events like hackathons and CTF competitions; and\n- A great community where you can meet and connect with like-minded people; and\n- it's FREE!`
            },{
                name: 'Ready to join?',
                value: `You can sign up through Griffith CampusGroups - just select your campus:`
            }])
        ],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('Gold Coast')
                .setStyle(ButtonStyle.Link)
                .setURL('https://griffith.campusgroups.com/GIC/club_signup'),
            new ButtonBuilder()
                .setLabel('Brisbane/Online')
                .setStyle(ButtonStyle.Link)
                .setURL('https://griffith.campusgroups.com/GICT/club_signup'),
            new ButtonBuilder()
                .setCustomId('welcome/link/club-invite:0')
                .setLabel(`I'm already a Club Member`)
                .setStyle(ButtonStyle.Danger)
        )]
    }).catch(() => {});
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