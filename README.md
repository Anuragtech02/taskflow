<div align="center">

# 🔨 TaskForge

**The open-source project management platform**

An open-source alternative to ClickUp, built with modern web technologies.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)

<!-- Screenshot placeholder -->
<!-- ![TaskForge Dashboard](./docs/screenshot.png) -->

</div>

---

## ✨ Features

- **Workspace Hierarchy** — Workspaces → Spaces → Folders → Lists → Tasks (just like ClickUp)
- **Task Management** — Create, assign, prioritize, and track tasks with rich descriptions
- **Custom Fields** — Define custom fields per list (text, number, date, select, checkbox, URL, email)
- **Multiple Views** — Board, List, Gantt, Calendar, and Workload views
- **Sprint Planning** — Plan and track sprints with goals and task assignments
- **Time Tracking** — Log time entries against tasks
- **Labels & Priorities** — Organize with color-coded labels and priority levels (Urgent → None)
- **Activity Feed** — Full audit trail of all task changes
- **Comments** — Discuss tasks with your team
- **Authentication** — Email/password + Google & GitHub OAuth
- **Self-Hosted** — Run on your own infrastructure with Docker

## 🚀 Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/apsimbiot/taskflow.git
cd taskflow

# Copy environment variables
cp .env.example .env.local

# Start all services (Postgres, MinIO, Next.js)
docker compose up -d

# Run database migrations
docker compose exec app npm run db:push

# Seed with sample data
docker compose exec app npm run db:seed

# Open in your browser
open http://localhost:3000
```

**Demo credentials:**
- Email: `demo@taskflow.dev`
- Password: `password123`

## 🛠️ Manual Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/apsimbiot/taskflow.git
cd taskflow

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) |
| **Auth** | [NextAuth.js v5](https://authjs.dev/) |
| **Validation** | [Zod](https://zod.dev/) |
| **State** | [TanStack Query v5](https://tanstack.com/query) |
| **File Storage** | [MinIO](https://min.io/) (S3-compatible) |
| **Reverse Proxy** | [Traefik](https://traefik.io/) |
| **Container** | [Docker](https://www.docker.com/) |

## 📁 Project Structure

```
taskflow/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # API Route Handlers
│   │   │   ├── auth/         # Auth endpoints (register, NextAuth)
│   │   │   ├── workspaces/   # Workspace CRUD
│   │   │   ├── spaces/       # Space CRUD
│   │   │   ├── folders/      # Folder CRUD
│   │   │   ├── lists/        # List + Task CRUD
│   │   │   ├── tasks/        # Task operations
│   │   │   └── health/       # Health check
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── auth.ts               # NextAuth.js configuration
│   ├── middleware.ts          # Auth middleware
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   ├── schema/           # Drizzle ORM schema
│   │   └── seed.ts           # Database seeder
│   ├── lib/
│   │   └── utils.ts          # Utility functions
│   └── types/
│       └── next-auth.d.ts    # Type augmentations
├── drizzle/                  # Generated migrations
├── docker-compose.yml        # Docker services
├── Dockerfile                # Multi-stage build
├── drizzle.config.ts         # Drizzle Kit config
└── package.json
```

## 🗄️ Database Schema

TaskForge mirrors the ClickUp hierarchy:

```
Workspace
  ├── Space
  │   ├── Folder
  │   │   └── List
  │   │       └── Task
  │   │           ├── Subtasks
  │   │           ├── Comments
  │   │           ├── Assignees
  │   │           ├── Labels
  │   │           ├── Time Entries
  │   │           └── Activity Log
  │   └── List (folderless)
  ├── Labels
  └── Sprints
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read our contributing guidelines (coming soon) before submitting PRs.

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [apsimbiot](https://github.com/apsimbiot)**

</div>
