import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('reverify')
    .setDescription('Reverifies all users.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    await interaction.deferReply({ withResponse: true, flags: MessageFlags.Ephemeral });
    
    if (!guild) return await interaction.editReply({ content: 'This command can only be used in a server.' });

    const members = await guild.members.list({ cache: false, limit: 1000 });

    await interaction.editReply({ content: `Messaging \`${members.size}\` Members.`})

    members.forEach(async (member) => {
        if (member.user.bot) return;
        await member.send({ embeds: [new EmbedBuilder()
            .setTitle('Verify using Griffith Connect')
            .setColor(0x2b2d31)
            .setThumbnail('https://i.postimg.cc/mrpv4Mqx/temp-Imagep-ZGw-L0.avif')
            .setFooter({
                text: 'Griffith Connect • Powered by Griffith ICT Club <https://wwwgriffithict.com/>'
            })
            .setDescription(`Heyo <@${member.id}>! 👋\n\nI've brought bad news... You've been unverified in the **Griffith ICT Discord Server**.\n> We're moving over to a better verification system for Griffith Students, and you'll be back up and running in less than 5 minutes.\n\nYou'll need to verify to re-gain access. Click the button below to get started.`)
        ], components: [new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
                .setLabel('Verify in Server')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/channels/1214387742293626940/1257896790934421535/1343070846276730960')
        )]}).catch((error) => {console.log('failed to reverify', member.user.id, error)});
    });

    await interaction.editReply({ content: 'Reverified all users.' });
}