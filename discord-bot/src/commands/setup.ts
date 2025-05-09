import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import config from "../../config.json";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Hidden Setup Options (ADMIN ONLY)")
  .setContexts([InteractionContextType.Guild])
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("welcome-channel")
      .setDescription("Set the welcome channel")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("The channel to set")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({
    withResponse: true,
    flags: MessageFlags.Ephemeral,
  });

  const channel: TextChannel = interaction.options.getChannel("channel", true);

  const btn_link = new ButtonBuilder()
    .setCustomId("flow:connect:0")
    .setLabel("Connect sNumber")
    .setEmoji(config.emoji)
    .setStyle(ButtonStyle.Secondary);

  const btn_exempt = new ButtonBuilder()
    .setCustomId("flow:exempt:0")
    .setLabel("Request Exemption")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(btn_link, btn_exempt);

  const embed = new EmbedBuilder()
    .setTitle("Connect your Griffith sNumber")
    .setDescription(
      "To access the rest of this server,\nYou need to connect your __Griffith sNumber__.\nClick the button below to get started.",
    )
    .addFields({
      name: "Don't Have an sNumber?",
      value:
        "You can apply for an exemption if:\n" +
        "• You are a student of a different university,\n" +
        "• You are a past student of Griffith University,\n" +
        "• You need access to this server for another reason.",
    })
    .setThumbnail(interaction.client.user?.displayAvatarURL())
    .setColor(0x2b2d31)
    .setFooter({
      text: "Griffith Connect • Powered by Griffith ICT Club <https://www.griffithict.com/>",
    });

  await channel.send({
    embeds: [embed],
    components: [row as ActionRowBuilder<ButtonBuilder>],
  });

  await interaction.editReply({
    content: "Setup complete!",
  });
}
