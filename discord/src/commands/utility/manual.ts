import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import { getDatabaseClient } from "../../lib/database";
import { getRedisClient } from "../../lib/redis";
import { config } from "../../lib/config";

export const data = new SlashCommandBuilder()
    .setName('manual')
    .setDescription('Manually interface with the database')
    .setContexts([InteractionContextType.Guild])
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(subcommand =>
            subcommand.setName('student')
                .setDescription('(sNumber) Add a student to the database and role them.')
                .addUserOption(option =>
                    option.setName('user')
                   .setDescription('The user to add')
                   .setRequired(true))
               .addStringOption(option =>
                    option.setName('snumber')
                  .setDescription('The student number to add (s1234567)')
                  .setRequired(false))
    ).addSubcommand(subcommand =>
            subcommand.setName('club')
                .setDescription('(ClubMember) Add a student to the database and role them.')
                .addUserOption(option =>
                    option.setName('user')
                   .setDescription('The user to add')
                   .setRequired(true))
                // .addStringOption(option => 
                    // option.setName('club-acronym')
                    // .setDescription('The club acronym to add (e.g. GIC/GICT)')
                    // .setRequired(true))
                .addStringOption(option =>
                    option.setName('email')
                    .setDescription('The student\'s campusgroups email.')
                    .setRequired(true)))

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ 
        withResponse: true,
        flags: MessageFlags.Ephemeral
    })

    if (interaction.options.getSubcommand() === 'student') {
        const user = interaction.options.getUser('user', true);
        const sNumber = interaction.options.getString('sNumber', false);
        const sql = await getDatabaseClient();
        if (sNumber) {
            const [discordMember] = await sql('SELECT * FROM discord_members WHERE student_number = $1', [sNumber]);
            if (discordMember) {
                await interaction.editReply({
                    content: 'User already connected.'
                })
                return;
            }
        
            await sql('INSERT INTO griffith_students (student_number) VALUES ($1) ON CONFLICT DO NOTHING', [sNumber]);
        }
        
        await sql('INSERT INTO discord_members (id, student_number) VALUES ($1, $2)', [user.id, sNumber]);
        const member = await interaction.guild?.members.fetch(user.id);
        await member?.roles.add(config.ROLES.STUDENT);
        await interaction.editReply({
            content: `User <@${user.id}> connected to ${sNumber}.`
        })
        await member?.send({
            content: `You have been manually connected to ${sNumber}.`,
        })
        return;
    } else if (interaction.options.getSubcommand() ==='club') {
        await interaction.editReply('Club command not implemented.')
        return;
        const user = interaction.options.getUser('user', true);
        // const clubAcronym = interaction.options.getString('club-acronym', true);
        const email = interaction.options.getString('email', true);
        const sql = await getDatabaseClient();
        
        // const [club] = await sql('SELECT * FROM clubs WHERE acronym = $1', [clubAcronym]);
        // if (!club) {
        //     await interaction.editReply({
        //         content: `Club \`${clubAcronym}\` not found.`
        //     })
        //     return;
        // }

        const [discordMember] = await sql('SELECT * FROM discord_members WHERE id = $1', [user.id]);
        if (!discordMember) {
            await interaction.editReply({
                content: `User has not yet verified a Griffith sNumber.`
            })
            return;
        }

        const [campusUser] = await sql('SELECT * FROM campus_users WHERE email = $1', [email]);
        if (!campusUser) {
            await interaction.editReply({
                content: `You must enter the user's campusgroups email, and they must already be in the club.`
            })
            return;
        }

        // await sql('INSERT INTO griffith_students (student_number, first_name, last_name, email) VALUES ($1) ON CONFLICT DO NOTHING', []);

        // await sql('INSERT INTO club_members (id, club_id, email) VALUES ($1, $2, $3)', [user.id, club.id, email]);
        // NEED TODO ALOT HERE STILL TODO
    }

    

    await interaction.editReply({
        content: 'Setup complete!'
    }) 
}