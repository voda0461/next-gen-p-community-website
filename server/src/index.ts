import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { PrismaClient } from './generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { Client, GatewayIntentBits } from 'discord.js';
import { Redis } from "ioredis";

import serverInfoRoute from "./routes/server-info.route.js"

// discord client setup
export const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildScheduledEvents,
    ],
});

const fastify = Fastify({ logger: true })
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
// connect and destroy discord bot automaticly
fastify.addHook("onReady", async () => {
    fastify.log.info("Connecting Discord Bot Client to Gateway...");
    await discordClient.login(process.env.DISCORD_BOT_TOKEN);
    fastify.log.info(`Discord Bot logged in as ${discordClient.user?.tag}`);
});

fastify.addHook("onClose", async () => {
    fastify.log.info("Disconnecting Discord Bot Client...");
    discordClient.destroy();
    fastify.log.info("Discord Bot Client disconnected.");
});

// redis setup
export const redis = new Redis(
    process.env.REDIS_URL ?? "redis://localhost:6379",
    {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        enableReadyCheck: true,
    },
);

redis.on("connect", () => {
    fastify.log.info("Connected to Redis successfully");
});

redis.on("error", err => {
    fastify.log.error(err, "Redis Connection Error.");
});

// Register Plugins
await fastify.register(cors, { origin: '*' })
await fastify.register(swagger, {
  swagger: {
    info: { title: 'NEXT-GEN API', version: '1.0.0' }
  }
})
await fastify.register(swaggerUi, { routePrefix: '/docs' })
await fastify.register(serverInfoRoute, { prefix: "/api/v1" });

// Basic Health Route
fastify.get('/api/v1/health', async () => {
  return { status: 'ok', timestamp: new Date() }
})

// Example Database Route
fastify.get('/api/v1/users', async () => {
  const users = await prisma.user.findMany()
  return { status: 'success', users }
})

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8000')
    await fastify.listen({ port, host: '0.0.0.0' })
    fastify.log.info(`Server running on http://localhost:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
