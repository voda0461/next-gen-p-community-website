import { Client, GatewayIntentBits } from "discord.js";
import type { FastifyBaseLogger } from "fastify";

/**
 * Connect to discord.
 * Attaches Fastify logger.
 * Call this after initializing Fastify.
 *
 * @param {FastifyBaseLogger} log
 */

export let discordClient: Client | null = null;

export async function connectDiscord(log: FastifyBaseLogger): Promise<void> {
    if (
        !process.env.DISCORD_BOT_TOKEN ||
        process.env.DISCORD_BOT_TOKEN.trim() === ""
    ) {
        log.warn(
            "Skipping Discord client because DISCORD_BOT_TOKEN is empty. It can cause errors and unexpected behaviours.",
        );
        return;
    }

    // connect to Discord
    const discord = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildScheduledEvents,
        ],
    });

    discord.on("error", err => {
        log.error(err, "Discord WebSocket Error");
    });

    try {
        log.info("Connecting Discord Bot Client to Gateway...");

        await new Promise<void>((resolve, reject) => {
            discord.once("clientReady", client => {
                log.info(`Discord Bot logged in as ${client.user.tag}`);
                discordClient = discord;
                resolve();
            });

            discord.login(process.env.DISCORD_BOT_TOKEN).catch(reject);
        });
    } catch (err) {
        log.error(err, "Failed to connect to Discord Gateway.");
        discordClient = null;
    }
}

export async function disconnectDiscord(log: FastifyBaseLogger): Promise<void> {
    if (discordClient) {
        log.info("Disconnecting Discord Bot Client...");
        await discordClient.destroy();
        discordClient = null;
        log.info("Discord Bot Client disconnected.");
    }
}
