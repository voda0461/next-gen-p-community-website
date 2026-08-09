import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { PrismaClient } from './generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

import { connectRedis } from "./lib/redis.js";
import { connectDiscord, disconnectDiscord } from "./lib/discord.js";

import serverInfoRoute from "./routes/server-info.route.js"

const fastify = Fastify({ logger: true, pluginTimeout: 30000 })
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// connect and destroy discord bot automaticly
fastify.addHook("onReady", async () => {
    await connectRedis(fastify.log);
    await connectDiscord(fastify.log);
});

fastify.addHook("onClose", async () => {
    await disconnectDiscord(fastify.log);
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
