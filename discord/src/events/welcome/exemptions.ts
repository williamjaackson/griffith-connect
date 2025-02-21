import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Events, Interaction, MessageFlags, TextChannel, time } from "discord.js";
import { config } from "../../lib/config";
import { checkCooldown } from "../../lib/cooldown";

export const event = Events.InteractionCreate;
export const once = false;

async function exemptionButtonPressed(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'welcome/exemption:0') return;

    await interaction.reply({
        content: 'Applying for an exemption is a manually approved process and may take a while to complete.\nMaking fake or repeated exemptions will result in punishment.\nAre you sure you want to request an exemption?',
        flags: MessageFlags.Ephemeral,
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('welcome/exemption:1')
                .setLabel('I am sure I want to request an exemption.')
                .setStyle(ButtonStyle.Danger)
        )]
    })
}

async function confirmButtonPressed(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'welcome/exemption:1') return;
    if (!await checkCooldown(interaction)) return;
    if (interaction.channel?.type !== ChannelType.GuildText) return;

    await interaction.deferReply({
        withResponse: true,
        flags: MessageFlags.Ephemeral
    });

    const thread = await interaction.channel.threads.create({
        name: `Exemption Request - @${interaction.user.username}`,
        reason: `Exemption request created by @${interaction.user.tag} (${interaction.user.id})`,
        type: ChannelType.PrivateThread,
        invitable: false
    });

    await thread.send({
        content: `# Exemption Application\n> Reviewers: <@&${config.ROLES.STAFF_EXEMPTION_PING}>\n> User: <@${interaction.user.id}>\nPlease provide any additional details/explaination below.`
    });

    await interaction.editReply({
        content: `Created request channel <#${thread.id}>.`
    });
}

export async function execute(interaction: Interaction) {
    await exemptionButtonPressed(interaction);
    await confirmButtonPressed(interaction)
}