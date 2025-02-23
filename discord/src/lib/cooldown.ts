import { MessageFlags } from "discord.js";
import { config } from "./config";
import { getRedisClient } from "./redis";

export async function checkCooldown(interaction: any) {
    const redis = await getRedisClient();

    const key = `cooldown:${interaction.user.id}:${interaction.customId}`;
    const cooldown = config.COOLDOWN[interaction.customId]

    const lastRequest = await redis.get(key);
    if (lastRequest) {
        const lastRequestTime = parseInt(lastRequest, 10);
        await interaction.reply({
            content: `You are on cooldown! You can do that again <t:${Math.ceil(lastRequestTime/1000) + cooldown}:R>.`,
            flags: MessageFlags.Ephemeral
        }).catch(() => {})
        return false;
    }
    await redis.setEx(key, cooldown, Date.now().toString());

    return true;
}