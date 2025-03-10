import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonInteraction, ButtonStyle, ChannelType, MessageFlags } from "discord.js";
import config from '../../config.json';
import { log } from "../lib/logging";
import { redisClient } from "../lib/redis";

const FLOW = __filename.split('/').pop()?.split('.')[0];

async function entry(interaction: ButtonInteraction) {
    await interaction.reply({
        content: 'Applying for an exemption is a manually approved process and may take a while to complete.\nMaking fake or repeated exemptions will result in punishment.\nAre you sure you want to request an exemption?',
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder()
                .setCustomId(`flow:${FLOW}:1`)
                .setLabel('I am sure I want to request an exemption.')
                .setStyle(ButtonStyle.Danger),
        ])],
        flags: [MessageFlags.Ephemeral],
    });
}

async function step1(interaction: ButtonInteraction) {
    if (interaction.channel?.type !== ChannelType.GuildText) return;

    await interaction.deferReply({
        withResponse: true,
        flags: [MessageFlags.Ephemeral],
    });

    // check if the user is on cooldown.
    const COOLDOWN_LENGTH = 60 * 5;
    const cooldown = await redisClient.get(`cooldown:${interaction.user.id}:${FLOW}`);

    if (cooldown) {
        return await interaction.editReply({
            content: `You're on cooldown. Try again <t:${Math.ceil(parseInt(cooldown)/1000) + COOLDOWN_LENGTH}:R>.`,
        });
    }
    await redisClient.setEx(`cooldown:${interaction.user.id}:${FLOW}`, COOLDOWN_LENGTH, Date.now().toString());

    const thread = await interaction.channel?.threads.create({
        name: `Exemption Request - @${interaction.user.username}`,
        reason: `Exemption request created by @${interaction.user.tag} (${interaction.user.id})`,
        type: ChannelType.PrivateThread,
        invitable: false
    })

    await thread.send({
        content: `# Exemption Application\n> Reviewers: <@&${config.exemptPingRole}>\n> User: ${interaction.user}\nPlease provide any additional details/explaination below.`
    });

    await interaction.editReply({
        content: `Created request channel <#${thread.id}>.`
    });

    await log(interaction.client, `User ${interaction.user.tag} opened an exemption request <#${thread.id}>`);
}

export async function handler(interaction: any, stage: number) {
    if (stage === 0) return entry(interaction);
    if (stage === 1) return step1(interaction);
    throw new Error('Invalid flow stage.');
}