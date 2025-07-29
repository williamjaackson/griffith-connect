import {
  ActionRowBuilder,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
} from "@discordjs/builders";
import { randomInt } from "crypto";
import {
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  MessageFlags,
  ModalSubmitInteraction,
  TextInputStyle,
} from "discord.js";
import { redisClient } from "../lib/redis";
import { emailTemplate } from "../lib/resend";
import { supabase } from "../lib/database";
import config from "../../config.json";
import { log } from "../lib/logging";

const FLOW = __filename.split("/").pop()?.split(".")[0];

const sNumberModal = new ModalBuilder()
  .setCustomId(`flow:${FLOW}:1`)
  .setTitle("Griffith Student Number")
  .addComponents([
    new ActionRowBuilder<TextInputBuilder>().addComponents([
      new TextInputBuilder()
        .setCustomId("sNumber")
        .setLabel("Enter your Griffith Student Number (s1234567)")
        .setPlaceholder("s1234567")
        .setStyle(TextInputStyle.Short)
        .setMinLength(8)
        .setMaxLength(8),
    ]),
  ]);

const codeModal = new ModalBuilder()
  .setCustomId(`flow:${FLOW}:3`)
  .setTitle("Verification Code")
  .addComponents([
    new ActionRowBuilder<TextInputBuilder>().addComponents([
      new TextInputBuilder()
        .setCustomId("code")
        .setLabel("Enter the verification code from your email.")
        .setPlaceholder("123456")
        .setStyle(TextInputStyle.Short)
        .setMinLength(6)
        .setMaxLength(6),
    ]),
  ]);

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
  });

  // check if the user is on cooldown.
  const COOLDOWN_LENGTH = 60 * 5;
  const cooldown = await redisClient.get(
    `cooldown:${interaction.user.id}:${FLOW}`,
  );

  if (cooldown) {
    return await interaction.editReply({
      content: `You're on cooldown. Try again <t:${Math.ceil(parseInt(cooldown) / 1000) + COOLDOWN_LENGTH}:R>.`,
    });
  }
  await redisClient.setEx(
    `cooldown:${interaction.user.id}:${FLOW}`,
    COOLDOWN_LENGTH,
    Date.now().toString(),
  );

  // verify sNumber
  const sNumber = interaction.fields.getTextInputValue("sNumber");
  if (!sNumber.match(/^s\d{7}$/)) {
    // sNumber with s + 6 or 7 digits.
    return await interaction.editReply({
      content: `Invalid student number. Please enter a valid Griffith Student Number (s1234567).`,
    });
  }

  // check if this sNumber is already connected to this discord account.

  const { data: existingConnections } = await supabase
    .from("DiscordUser")
    .select("*")
    .eq("id", interaction.user.id)
    .eq("student_number", sNumber);

  if (existingConnections?.length) {
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    await member.roles.add(
      config.connectedRole,
      `Reconnected sNumber. (${sNumber})`,
    );

    await interaction.editReply({
      content: `You have been reconnected to \`${sNumber}\`.`,
    });

    await log(
      interaction.client,
      `${interaction.user} reconnected to ${sNumber}`,
    );

    return;
  }

  const otp = randomInt(0, 999999).toString().padStart(6, "0");
  await redisClient.setEx(`otp:${otp}`, 600, sNumber);

  await emailTemplate(
    `${sNumber}@griffithuni.edu.au`,
    `Verification Code - Griffith ICT Club`,
    "verification",
    { otp, sNumber },
  );

  await interaction.editReply({
    content: `A verification code has been sent to your Griffith email address.\n\`\`\`${sNumber}@griffithuni.edu.au\`\`\``,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder()
          .setLabel("Enter Code")
          .setCustomId(`flow:${FLOW}:2`)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder() // call the entry again.
          .setLabel("Resend Code")
          .setCustomId(`flow:${FLOW}:0`)
          .setStyle(ButtonStyle.Secondary),
      ]),
    ],
  });

  await log(
    interaction.client,
    `${interaction.user} has requested to connect to ${sNumber}`,
  );
}

// step2. called when the user clicks the 'Enter Code' button.
// -> open a modal to prompt the user to enter the verification code.
async function step2(interaction: ButtonInteraction) {
  await interaction.showModal(codeModal);
}

// step3. called when the user has entered the verification code.
// -> verify the code and sNumber, and grant the user the 'verified' role.
async function step3(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({
    withResponse: true,
    flags: [MessageFlags.Ephemeral],
  });

  const code = interaction.fields.getTextInputValue("code");

  const sNumber = await redisClient.getDel(`otp:${code}`);
  if (!sNumber) {
    await interaction.editReply({
      content: `Invalid verification code. Please enter the correct code.`,
    });

    await log(
      interaction.client,
      `${interaction.user} entered an invalid verification code.`,
    );

    return;
  }

  // existing connect, but different account or student number.
  const { data: existingConnections } = await supabase
    .from("DiscordUser")
    .select("*")
    .or(`id.eq.${interaction.user.id},student_number.eq.${sNumber}`);

  // const [existingConnection] = existingConnections ?? [];
  for (const existingConnection of existingConnections ?? []) {
    const prevConnectedMember = await interaction.guild!.members.fetch(
      existingConnection.id,
    ).catch((err: any) => {
      console.error("Failed to fetch member:", err);
      return null;
    });
    
    if (prevConnectedMember) {
      await prevConnectedMember.roles.remove(
        config.connectedRole,
        `Unconnected sNumber. (${existingConnection.student_number})`,
      );
    }

    await supabase
      .from("DiscordUser")
      .delete()
      .or(`student_number.eq.${sNumber},id.eq.${interaction.user.id}`);

    const pingMsg = prevConnectedMember ? `${prevConnectedMember.user}` : `<@${existingConnection.id}>`;

    await log(
      interaction.client,
      `${pingMsg} disconnected from ${existingConnection.student_number} by ${interaction.user}`,
    );
  }

  await supabase.from("Student").insert({
    student_number: sNumber,
  });

  await supabase.from("DiscordUser").insert({
    id: interaction.user.id,
    student_number: sNumber,
  });

  const member = await interaction.guild!.members.fetch(interaction.user.id);
  await member.roles.add(
    config.connectedRole,
    `Connected sNumber. (${sNumber})`,
  );

  await interaction.editReply({
    content: `${interaction.user} connected to \`${sNumber}\``,
  });

  await log(interaction.client, `${interaction.user} connected to ${sNumber}`);
}

export async function handler(interaction: any, stage: number, args: string[]) {
  if (stage === 0) return entry(interaction);
  if (stage === 1) return step1(interaction);
  if (stage === 2) return step2(interaction);
  if (stage === 3) return step3(interaction);
  throw new Error("Invalid flow stage.");
}
