import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    ChannelType,
    GuildScheduledEventStatus,
    GuildScheduledEventEntityType,
    type Guild,
    type Client,
} from "discord.js";
import type { FastifyBaseLogger } from "fastify";
import { getServerInfoService } from "./server-info.service.js";

// Mock the discordClient module
vi.mock("../lib/discord.js", () => ({
    discordClient: {
      isReady: vi.fn().mockReturnValue(true),
        guilds: {
            fetch: vi.fn(),
        },
    },
}));

import * as discordModule from "../lib/discord.js";
const mockDiscordClient = discordModule.discordClient!;

describe("getServerInfoService", () => {
    let mockLogger: FastifyBaseLogger;
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };

        mockLogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            debug: vi.fn(),
            fatal: vi.fn(),
            trace: vi.fn(),
            silent: vi.fn(),
            level: "info",
            child: vi.fn(),
        } as unknown as FastifyBaseLogger;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should return success: false if DISCORD_GUILD_ID is not set", async () => {
        delete process.env.DISCORD_GUILD_ID;

        const result = await getServerInfoService(mockLogger);

        expect(result).toEqual({ success: false });
    });

    it("should return success: false if guild is not found", async () => {
        process.env.DISCORD_GUILD_ID = "123456789";
        vi.mocked(
            mockDiscordClient.guilds.fetch as (id: string) => Promise<Guild>,
        ).mockResolvedValueOnce(null as unknown as Guild);

        const result = await getServerInfoService(mockLogger);

        expect(result).toEqual({ success: false });
        expect(mockLogger.error).toHaveBeenCalledWith(
            "Guild with ID 123456789 not found or bot is not in guild.",
        );
    });

    it("should handle error thrown by discord client fetch", async () => {
        process.env.DISCORD_GUILD_ID = "123456789";
        const fetchError = new Error("Discord API Rate Limit");
        vi.mocked(mockDiscordClient.guilds.fetch).mockRejectedValueOnce(fetchError);

        const result = await getServerInfoService(mockLogger);

        expect(result).toEqual({ success: false });
        expect(mockLogger.error).toHaveBeenCalledWith(
            fetchError,
            "Something happened wrong when fetching data from discord.",
        );
    });

    it("should successfully fetch and map guild information", async () => {
        process.env.DISCORD_GUILD_ID = "123456789";

        interface MockMember {
            user: { bot: boolean };
            presence?: { status?: string };
        }

        const mockMembersCollection = {
            filter: vi
                .fn()
                .mockImplementation(
                    (predicate: (member: MockMember) => boolean) => {
                        const list: MockMember[] = [
                            {
                                user: { bot: false },
                                presence: { status: "online" },
                            },
                            {
                                user: { bot: false },
                                presence: { status: "offline" },
                            },
                            {
                                user: { bot: false },
                                presence: { status: "idle" },
                            },
                            {
                                user: { bot: false },
                                presence: { status: "dnd" },
                            },
                            {
                                user: { bot: true },
                                presence: { status: "online" },
                            },
                        ];
                        const filtered = list.filter(predicate);
                        return { size: filtered.length };
                    },
                ),
        };

        const mockChannelsCollection = {
            values: () => [
                { type: ChannelType.GuildCategory },
                { type: ChannelType.GuildText },
                { type: ChannelType.GuildVoice },
                { type: ChannelType.GuildStageVoice },
                { type: ChannelType.GuildAnnouncement },
                { type: ChannelType.GuildForum },
            ],
        };

        const mockEventsCollection = {
            values: () => [
                {
                    name: "Community Hangout",
                    description: "Weekly chat",
                    scheduledStartTimestamp: 1700000000000,
                    userCount: 2,
                    entityType: GuildScheduledEventEntityType.External,
                    entityMetadata: { location: "https://discord.gg" },
                    status: GuildScheduledEventStatus.Active,
                    coverImageURL: () => "https://cdn.discord.com/cover.png",
                    creatorId: "9999999",
                },
            ],
        };

        const mockGuild = {
            id: "123456789",
            name: "NextG Build",
            createdTimestamp: Date.now() - 86400000 * 5, // 5 days ago
            ownerId: "45678910",
            memberCount: 5,
            vanityURLCode: "ngb",
            premiumSubscriptionCount: 4,
            premiumTier: 2,
            features: ["COMMUNITY", "VANITY"],
            iconURL: () => "https://cdn.discord.com/icon.png",
            bannerURL: () => "https://cdn.discord.com/banner.png",
            voiceStates: { cache: { size: 2 } },
            members: {
                fetch: vi.fn().mockResolvedValue(mockMembersCollection),
            },
            scheduledEvents: {
                fetch: vi.fn().mockResolvedValue(mockEventsCollection),
            },
            channels: {
                fetch: vi.fn().mockResolvedValue(mockChannelsCollection),
            },
            roles: {
                fetch: vi.fn().mockResolvedValue({ size: 10 }),
            },
            emojis: {
                fetch: vi.fn().mockResolvedValue({ size: 15 }),
            },
            stickers: {
                fetch: vi.fn().mockResolvedValue({ size: 5 }),
            },
        };

        vi.mocked(
            mockDiscordClient.guilds.fetch as (id: string) => Promise<Guild>,
        ).mockResolvedValueOnce(mockGuild as unknown as Guild);

        const result = await getServerInfoService(mockLogger);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();

        if (result.data) {
            expect(result.data.guildName).toBe("NextG Build");
            expect(result.data.vanityURL).toBe("https://discord.gg/ngb");
            expect(result.data.created.ageInDays).toBe(5);

            expect(result.data.memberCount).toEqual({
                total: 5,
                online: 4,
                human: 4,
                bot: 1,
                activeVoice: 2,
            });

            expect(result.data.channels).toEqual({
                categories: 1,
                totalChannel: 5,
                textChannel: 1,
                voiceChannel: 1,
                stage: 1,
                announcement: 1,
                forum: 1,
            });

            expect(result.data.scheduledEvents).toHaveLength(1);
            expect(result.data.scheduledEvents[0]).toEqual({
                name: "Community Hangout",
                description: "Weekly chat",
                startTimestamp: "1700000000000",
                userCount: 2,
                location: "https://discord.gg",
                locationType: "EXTERNAL",
                status: "ACTIVE",
                coverImageURL: "https://cdn.discord.com/cover.png",
                creatorId: "9999999",
            });
        }
    });

    it("should return success: false when discordClient is null", async () => {
      vi.spyOn(discordModule, "discordClient", "get").mockReturnValue(
        null as unknown as Client,
      );

      const result = await getServerInfoService(mockLogger);

      expect(result).toEqual({ success: false });
      expect(mockLogger.warn).toHaveBeenCalledWith(
          "Cannot fetch discord server data while no discord client is present.",
      );
    });

});
