import {
    ChannelType,
    GuildScheduledEventStatus,
    GuildScheduledEventEntityType,
} from "discord.js";
import type { FastifyBaseLogger } from "fastify";

import { discordClient } from "../lib/discord.js";
/**
 * Service for handling server information logic.
 */

// Scheduled-event interface
export interface ScheduledEvent {
    name: string;
    description: string | null;
    startTimestamp: string;
    userCount: number;
    location: string | null;
    locationType: string;
    status: string;
    coverImageURL: string | null;
    creatorId: string | null;
}

// server-info data interface
export interface ServerInfoData {
    guildName: string;
    guildId: string;
    guildIconURL: string | null;
    guildBannerURL: string | null;
    vanityURL: string | null;
    ownerId: string;
    memberCount: {
        total: number;
        online: number;
        human: number;
        bot: number;
        activeVoice: number;
    };
    channels: {
        categories: number;
        totalChannel: number;
        textChannel: number;
        voiceChannel: number;
        stage: number;
        announcement: number;
        forum: number;
    };
    created: {
        timestamp: string;
        ageInDays: number;
    };
    scheduledEvents: ScheduledEvent[];
    boost: {
        count: number;
        tier: number;
    };
    assets: {
        role: number;
        emoji: number;
        sticker: number;
    };
    features: string[] | null;
}

export interface FetchDiscordData {
    success: boolean;
    data?: ServerInfoData;
}

export interface ServerInfoService {
    success: boolean;
    data?: ServerInfoData;
}

/**
 * Retrieves server details.
 *
 * @returns {Promise<ServerInfoService>} Server metadata and status
 */
export async function getServerInfoService(
    logger: FastifyBaseLogger,
): Promise<ServerInfoService> {
      if(!discordClient){
      logger.warn("Cannot fetch discord server data while no discord client is present.");
      return {
        success: false
      };
    }

    async function fetchDiscordData(): Promise<FetchDiscordData> {
        if(!discordClient){
            logger.warn("Cannot fetch discord server data while no discord client is present.");
            return {
              success: false
            };
        }

        const guildId = process.env.DISCORD_GUILD_ID;
        if (!guildId) {
            logger.error(`No guild id provided in .env file.`);
            return {
                success: false,
            };
        }

        try {
            const guild = await discordClient.guilds.fetch(guildId);
            if (!guild) {
                logger.error(
                    `Guild with ID ${guildId} not found or bot is not in guild.`,
                );
                return {
                    success: false,
                };
            }

            const createdTimestamp = guild.createdTimestamp;
            const ageInDays = Math.floor(
                (Date.now() - createdTimestamp) / (1000 * 60 * 60 * 24),
            );
            const [
                members,
                fetchedEvents,
                fetchedChannels,
                fetchedRoles,
                fetchedEmojis,
                fetchedStickers,
            ] = await Promise.all([
                guild.members.fetch(),
                guild.scheduledEvents.fetch(),
                guild.channels.fetch(),
                guild.roles.fetch(),
                guild.emojis.fetch(),
                guild.stickers.fetch(),
            ]);
            const events = Array.from(fetchedEvents.values());
            const channels = Array.from(fetchedChannels.values()).filter(
                c => c !== null,
            );

            const scheduledEvents: ScheduledEvent[] = events.map(e => {
                let location: string | null = null;
                if (e.entityType === GuildScheduledEventEntityType.External) {
                    location = e.entityMetadata?.location ?? null;
                } else if (e.channel) {
                    location = e.channel.id;
                } else if (e.channelId) {
                    location = e.channelId;
                }

                let locationType = "EXTERNAL";
                if (
                    e.entityType === GuildScheduledEventEntityType.StageInstance
                ) {
                    locationType = "STAGE_INSTANCE";
                } else if (
                    e.entityType === GuildScheduledEventEntityType.Voice
                ) {
                    locationType = "VOICE";
                }

                let status = "UNKNOWN";
                switch (e.status) {
                    case GuildScheduledEventStatus.Scheduled:
                        status = "SCHEDULED";
                        break;
                    case GuildScheduledEventStatus.Active:
                        status = "ACTIVE";
                        break;
                    case GuildScheduledEventStatus.Completed:
                        status = "COMPLETED";
                        break;
                    case GuildScheduledEventStatus.Canceled:
                        status = "CANCELED";
                        break;
                }

                return {
                    name: e.name,
                    description: e.description ?? null,
                    startTimestamp: e.scheduledStartTimestamp
                        ? e.scheduledStartTimestamp.toString()
                        : "",
                    userCount: e.userCount ?? 0,
                    location,
                    locationType,
                    status,
                    coverImageURL: e.coverImageURL({ extension: "png" }),
                    creatorId: e.creatorId ?? null,
                };
            });

            const data: ServerInfoData = {
                guildName: guild.name,
                guildId: guild.id,
                guildIconURL: guild.iconURL({ extension: "png" }),
                guildBannerURL: guild.bannerURL({ extension: "png" }),
                vanityURL: guild.vanityURLCode
                    ? `https://discord.gg/${guild.vanityURLCode}`
                    : null,
                ownerId: guild.ownerId,
                memberCount: {
                    total: guild.memberCount,
                    online: members.filter(
                        m =>
                            m.presence?.status !== undefined &&
                            m.presence.status !== "offline",
                    ).size,
                    human: members.filter(m => !m.user.bot).size,
                    bot: members.filter(m => m.user.bot).size,
                    activeVoice: guild.voiceStates.cache.size,
                },
                channels: {
                    categories: channels.filter(
                        c => c.type === ChannelType.GuildCategory,
                    ).length,
                    totalChannel: channels.filter(
                        c => c.type !== ChannelType.GuildCategory,
                    ).length,
                    textChannel: channels.filter(
                        c => c.type === ChannelType.GuildText,
                    ).length,
                    voiceChannel: channels.filter(
                        c => c.type === ChannelType.GuildVoice,
                    ).length,
                    stage: channels.filter(
                        c => c.type === ChannelType.GuildStageVoice,
                    ).length,
                    announcement: channels.filter(
                        c => c.type === ChannelType.GuildAnnouncement,
                    ).length,
                    forum: channels.filter(
                        c => c.type === ChannelType.GuildForum,
                    ).length,
                },
                created: {
                    timestamp: createdTimestamp.toString(),
                    ageInDays,
                },
                scheduledEvents,
                boost: {
                    count: guild.premiumSubscriptionCount ?? 0,
                    tier: guild.premiumTier,
                },
                assets: {
                    role: fetchedRoles.size,
                    emoji: fetchedEmojis.size,
                    sticker: fetchedStickers.size,
                },
                features: guild.features.length > 0 ? guild.features : null,
            };

            return {
                success: true,
                data,
            };
        } catch (err) {
            logger.error(
                err,
                "Something went wrong when fetching data from discord.",
            );
            return {
                success: false,
            };
        }
    }

    const discordData = await fetchDiscordData();
    if (!discordData.success) {
        return {
            success: false,
        };
    }
    return {
        success: true,
        ...(discordData.data !== undefined && { data: discordData.data }),
    };
}
