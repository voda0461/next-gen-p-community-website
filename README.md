# NEXT-GEN Programmers — Community Website

[![CI Checks](https://github.com/NEXT-GEN-PROGRAMMING/community-website/actions/workflows/ci.yml/badge.svg)](https://github.com/NEXT-GEN-PROGRAMMING/community-website/actions/workflows/ci.yml)
[![Docker CI](https://github.com/NEXT-GEN-PROGRAMMING/community-website/actions/workflows/docker.yml/badge.svg)](https://github.com/NEXT-GEN-PROGRAMMING/community-website/actions/workflows/docker.yml)
[![PR Checks](https://github.com/NEXT-GEN-PROGRAMMING/community-website/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/NEXT-GEN-PROGRAMMING/community-website/actions/workflows/pr-checks.yml)

> [!WARNING] 
> **Legacy Code — Draft v0.1**
> This is the initial commit and foundational draft of the NEXT-GEN Programmers website. Everything here is a starting point. Contributors and participants are free — and encouraged — to improve, refactor, and expand upon this codebase.

---

## 🧭 About

This is the official website for the **NEXT-GEN Programmers** Discord community. It serves as the public face of the community — a place where anyone can explore what the server is, discover member projects, learn about the team, and eventually contribute.

The website is designed to be **modern, interactive, and developer-focused** while staying **performant and easy to navigate**.

### Goals

- Showcase the community and what it stands for
- Highlight projects built by members
- Recognize core contributors, moderators, and admins
- Display live community activity and statistics
- Improve discoverability of the community outside Discord
- Create a central hub that complements the Discord server

---

## 🏗️ Tech Stack

### Frontend (`/client`)

| Technology | Purpose |
|---|---|
| [Nuxt 4](https://nuxt.com) | Vue-based framework — SSR/SSG, file-based routing, auto-imports |
| [TypeScript](https://typescriptlang.org) | Type safety across the entire codebase |
| [Tailwind CSS v4](https://tailwindcss.com) | Utility-first CSS framework |
| [Nuxt UI](https://ui.nuxt.com) | Pre-built accessible component library for Nuxt |
| [Motion for Vue](https://motion.vueuse.org) | Declarative animations and transitions |
| [Pinia](https://pinia.vuejs.org) | State management for Vue |
| [VueUse](https://vueuse.org) | Collection of essential Vue composition utilities |
| [Iconify](https://iconify.design) | Universal icon framework — thousands of icons |

### Backend (`/server`)

| Technology | Purpose |
|---|---|
| [Fastify v5](https://fastify.dev) | High-performance Node.js web framework |
| [TypeScript](https://typescriptlang.org) | Type safety for the API layer |
| [Prisma v7](https://prisma.io) | Type-safe ORM using native JS driver-adapter |
| [PostgreSQL 18](https://postgresql.org) | Primary relational database |
| [Redis 8](https://redis.io) | Caching, sessions, and rate limiting |

### Infrastructure

| Technology | Purpose |
|---|---|
| [Docker Compose](https://docs.docker.com/compose) | Local database orchestration (Postgres + Redis) |

---

## 📂 Project Structure

```
NEXTGEN/
├── client/                  # Frontend (Nuxt 4)
│   ├── app/
│   │   ├── components/      # Reusable Vue components
│   │   ├── composables/     # Vue composables (shared logic)
│   │   ├── layouts/         # Page layouts
│   │   ├── pages/           # File-based routing
│   │   ├── plugins/         # Nuxt plugins
│   │   └── assets/          # Static assets (images, fonts)
│   ├── public/              # Public static files
│   ├── nuxt.config.ts       # Nuxt configuration
│   ├── tailwind.config.ts   # Tailwind CSS configuration
│   ├── tsconfig.json        # TypeScript configuration
│   └── package.json
│
├── server/                  # Backend (Fastify)
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── plugins/         # Fastify plugins
│   │   ├── services/        # Business logic
│   │   ├── middleware/       # Request middleware
│   │   ├── utils/           # Utility functions
│   │   └── index.ts         # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Database migrations
│   ├── tsconfig.json
│   └── package.json
│
├── docker/                  # Docker configuration
│   ├── client.Dockerfile    # Frontend container
│   ├── server.Dockerfile    # Backend container
│   └── redis.conf           # Redis configuration (optional)
│   > **Note:** Not currently wired up. `docker-compose.yml` runs `client`
│   > and `server` directly from the `node:26-alpine` image with source
│   > mounted as a volume, rather than building from these Dockerfiles.
│   > This folder is reserved for a future production-style multi-stage
│   > build; it's not required for local development via Docker Compose.
│
├── docker-compose.yml       # Full stack orchestration
├── .env.example             # Environment variable template
├── .gitignore
├── CONTRIBUTING.md          # Contribution guidelines
├── LICENSE
└── README.md                # You are here
```

---

## 📄 Pages

| Page | Route | Description |
|---|---|---|
| **Home** | `/` | Landing page — intro, Discord join CTA, community stats, server rules |
| **Members** | `/members` | Team showcase — owner, admins, moderators, core contributors |
| **Projects** | `/projects` | Community project showcase with filters |
| **Community** | `/community` | Server structure, announcements, shared resources |
| **FAQ** | `/faq` | Frequently asked questions |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 26.x
- [pnpm](https://pnpm.io) >= 11.x (required)
- [Docker Compose](https://docs.docker.com/compose) (for databases)

### Method 1: Automated Setup (Docker — Recommended)

With this method, Docker will automatically download Node, install all frameworks, synchronize the database schema, and hot-reload your code.

```bash
# 1. Clone the repository
git clone https://github.com/NEXT-GEN-PROGRAMMING/community-website
cd community-website

# 2. Start the entire full-stack environment
docker compose up --build

# Wait a minute for the automated installations to finish!
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000
```

### Method 2: Manual Setup (Local — Recommended for Core Contributors)

With this method, Docker is only used for the databases, giving you maximum native performance and control over your frontend/backend servers.

```bash
# 1. Clone the repository
git clone https://github.com/NEXT-GEN-PROGRAMMING/community-website
cd community-website

# 2. Boot up the local databases (Postgres 18 & Redis 8)
docker compose up postgres redis -d

# 3. Setup and start Backend (in Terminal 1)
cd server
cp ../.env.example .env
pnpm install
pnpm prisma generate
ls src/generated/prisma # Check if src/generated/prisma/client.ts exists
pnpm prisma db push # Automatically pushes schema and generates client
pnpm dev             # → http://localhost:8000

# 4. Setup and start Frontend (in Terminal 2)
cd client
cp ../.env.example .env
pnpm install
pnpm dev             # → http://localhost:3000
```

---

## 🐳 Docker Services

We use Docker to manage the environments. You can either run the entire stack via Docker (Method 1) or just the databases (Method 2).

| Service | Image | Port | Description |
|---|---|---|---|
| `client` | `node:26-alpine` | `3000` | Frontend application (Hot-reloads code from `./client`) |
| `server` | `node:26-alpine` | `8000` | Backend API (Hot-reloads code from `./server`) |
| `postgres` | `postgres:18-alpine` | `5432` | PostgreSQL database |
| `redis` | `redis:8.0-alpine` | `6379` | Redis cache |

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Database (PostgreSQL)
POSTGRES_USER=nextgen
POSTGRES_PASSWORD=nextgen_secret
POSTGRES_DB=nextgen_db
DATABASE_URL=postgresql://nextgen:nextgen_secret@localhost:5432/nextgen_db?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Server (Fastify)
PORT=8000
HOST=0.0.0.0
NODE_ENV=development
API_PREFIX=/api/v1

# Client (Nuxt)
NUXT_PUBLIC_API_BASE=http://localhost:8000/api/v1

# Discord
DISCORD_INVITE_URL=https://discord.gg/knwK9ZtpDP
# DISCORD_BOT_TOKEN=         # Future: for live stats integration
# DISCORD_GUILD_ID=          # Future: for live stats integration

# Auth 
# JWT_SECRET=your-secret-key-here
# JWT_EXPIRES_IN=7d
```

---

## 🤝 Contributing

We welcome contributions from everyone! Please read our **[Contributing Guide](CONTRIBUTING.md)** before submitting pull requests.

**Quick summary:**
- Fork → Branch → Code → Test → Open Issue → PR → Link PR to Issue
- All PRs must pass CI tests (lint, typecheck, unit tests)
- Follow the commit convention
- Be respectful and constructive

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

## 📌 Final Note

This document — and this codebase — is intended as a **starting point for discussion** rather than a fixed specification. Every member is encouraged to suggest improvements, challenge ideas, and contribute to the design and development process.

**This is legacy code. Make it better.** 🚀

---

*Built with ❤️ by the NEXT-GEN Programmers community.*