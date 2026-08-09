import { Redis } from "ioredis";
import type { FastifyBaseLogger } from "fastify";

/**
 * Connect to redis.
 * Attaches Fastify logger.
 * Call this after initializing Fastify.
 *
 * @param {FastifyBaseLogger} log
 */

export let redis: Redis | null = null;

export async function connectRedis(log: FastifyBaseLogger): Promise<void> {
    if (!process.env.REDIS_URL || process.env.REDIS_URL.trim() === "") {
        log.warn(
            "Skipping Redis because REDIS_URL is empty. It can cause rate limit or other errors.",
        );
        return;
    }

    // connect to REDIS
    const redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        enableReadyCheck: true,
    });

    redisClient.on("connect", () => {
        log.info("Connected to Redis successfully");
    });

    redisClient.on("error", err => {
        log.error(err, "Redis Connection Error.");
    });
    redis = redisClient;
}
