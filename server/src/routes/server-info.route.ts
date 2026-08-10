import type { FastifyPluginAsync, FastifySchema } from "fastify";
import { redis } from "../lib/redis.js";
import { getServerInfoService } from "../services/server-info.service.js";

/**
 * JSON Schema for request/response validation.
 */
const getServerInfoSchema: FastifySchema = {
    description:
        "Fetch discord guild information from the guild id provided in .env and cache it for 5 mins.",
    tags: ["Server Info"],
    response: {
        200: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                data: {
                    type: "object",
                    nullable: true,
                    properties: {
                        guildName: { type: "string" },
                        guildId: { type: "string" },
                        guildIconURL: { type: "string", nullable: true },
                        guildBannerURL: { type: "string", nullable: true },
                        vanityURL: { type: "string", nullable: true },
                        ownerId: { type: "string" },
                        memberCount: {
                            type: "object",
                            properties: {
                                total: { type: "integer" },
                                online: { type: "integer" },
                                human: { type: "integer" },
                                bot: { type: "integer" },
                                activeVoice: { type: "integer" },
                            },
                            required: [
                                "total",
                                "online",
                                "human",
                                "bot",
                                "activeVoice",
                            ],
                        },
                        channels: {
                            type: "object",
                            properties: {
                                categories: { type: "integer" },
                                totalChannel: { type: "integer" },
                                textChannel: { type: "integer" },
                                voiceChannel: { type: "integer" },
                                stage: { type: "integer" },
                                announcement: { type: "integer" },
                                forum: { type: "integer" },
                            },
                            required: [
                                "categories",
                                "totalChannel",
                                "textChannel",
                                "voiceChannel",
                                "stage",
                                "announcement",
                                "forum",
                            ],
                        },
                        created: {
                            type: "object",
                            properties: {
                                timestamp: { type: "string" },
                                ageInDays: { type: "integer" },
                            },
                            required: ["timestamp", "ageInDays"],
                        },
                        scheduledEvents: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: {
                                        type: "string",
                                        nullable: true,
                                    },
                                    startTimestamp: { type: "string" },
                                    userCount: { type: "integer" },
                                    location: {
                                        type: "string",
                                        nullable: true,
                                    },
                                    locationType: { type: "string" },
                                    status: { type: "string" },
                                    coverImageURL: {
                                        type: "string",
                                        nullable: true,
                                    },
                                    creatorId: {
                                        type: "string",
                                        nullable: true,
                                    },
                                },
                                required: [
                                    "name",
                                    "startTimestamp",
                                    "userCount",
                                    "location",
                                    "locationType",
                                    "status",
                                ],
                            },
                        },
                        boost: {
                            type: "object",
                            properties: {
                                count: { type: "integer" },
                                tier: { type: "integer" },
                            },
                            required: ["count", "tier"],
                        },
                        assets: {
                            type: "object",
                            properties: {
                                role: { type: "integer" },
                                emoji: { type: "integer" },
                                sticker: { type: "integer" },
                            },
                            required: ["role", "emoji", "sticker"],
                        },
                        features: {
                            type: "array",
                            nullable: true,
                            items: { type: "string" },
                        },
                    },
                    required: [
                        "guildName",
                        "guildId",
                        "ownerId",
                        "memberCount",
                        "channels",
                        "created",
                        "scheduledEvents",
                        "boost",
                        "assets",
                    ],
                },
            },
            required: ["success"],
        },
        500: {
            type: "object",
            properties: {
                success: { type: "boolean" },
                statusCode: { type: "number" },
                message: { type: "string" },
            },
            required: ["success", "statusCode", "message"],
        },
    },
};

/**
 * Fastify plugin registering the 'server-info' endpoint.
 *
 * @param fastify - Fastify instance
 */

const serverInfoRoutes: FastifyPluginAsync = async fastify => {
    fastify.get(
        "/server-info",
        { schema: getServerInfoSchema },
        async (request, reply) => {
            try {
                // redis system

                const cacheTTL: number = 5 * 60; // in seconds
                const cacheKey: string = "server:info";

                let cachedData: string | null = null;
                if (redis && redis.status === "ready") {
                  try {
                      cachedData = await redis.get(cacheKey);
                  } catch (err) {
                      request.log.warn(
                        err,
                      "Redis cache read failed, falling back to service execution",
                    );
                }
                }

                if (cachedData) {
                    reply.header("X-Cache", "HIT");
                    return reply.status(200).send({
                        success: true,
                        data: JSON.parse(cachedData),
                    });
                } else {
                    const info = await getServerInfoService(request.log);
                    if (!info.success) {
                        return reply.status(500).send({
                            success: false,
                            statusCode: 500,
                            message: "Something went wrong.",
                        });
                    }

                    const data = info.data;

                    if (redis && redis.status === "ready") {
                        try {
                            await redis.set(
                                cacheKey,
                                JSON.stringify(data),
                                "EX",
                                cacheTTL,
                            );
                        } catch (err) {
                            request.log.warn(
                                err,
                                "Failed to write response to Redis cache",
                            );
                        }
                    }

                    reply.header("X-Cache", "MISS");
                    return reply.status(200).send(info);
                }
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    statusCode: 500,
                    message: "Internal Server Error",
                });
            }
        },
    );
};

export default serverInfoRoutes;
