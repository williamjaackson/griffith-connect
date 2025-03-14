import { Client, Events, MessageFlags } from "discord.js";
import fs from "fs";
import path from "path";

export function startDispatcher(client: Client) {
  // cache all the imported flows.
  const flowDir = path.join(__dirname, "flow");
  const flowCache = new Map<string, any>();
  fs.readdirSync(flowDir).forEach((file) => {
    if (file.endsWith(".ts") || file.endsWith(".js")) {
      const flowName = file.split(".")[0];
      flowCache.set(flowName, import(path.join(flowDir, file)));
    }
  });

  // call the correct flow for an interaction.
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isMessageComponent() && !interaction.isModalSubmit())
      return;

    if (!interaction.guild) return;

    const [system, action, step] = interaction.customId.split(":");
    if (system !== "flow") return;

    try {
      const flow = await flowCache.get(action);
      await flow["handler"](interaction, parseInt(step));
    } catch (err: any) {
      console.error(err);
      await interaction.reply({
        content: `An error occurred while processing your request.`,
        flags: [MessageFlags.Ephemeral],
      });
    }
  });

  console.log("Dispatcher started!");
}
