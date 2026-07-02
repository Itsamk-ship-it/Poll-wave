# 🌊 PollWave — Real-Time Poll & Voting Platform

A production-ready, full-stack poll & voting platform inspired by StrawPoll, Poll Everywhere, and Google Forms. Create interactive polls, share them anywhere, collect votes from anonymous or logged-in users, and watch results update **live** over WebSockets.

Everything runs **locally and for free** — no paid APIs or third-party services.

```bash
docker compose up
```

Then open **http://localhost:3000** (app) and **http://localhost:4000/docs** (Swagger API).

---

## ✨ Features

- **Auth** — register, login, logout, JWT access + refresh tokens (with rotation & blacklist), bcrypt hashing, profile, change password. Anonymous voting for public polls.
- **Polls** — create, edit, delete, duplicate, archive, pin, share. Six poll types: single choice, multiple choice, yes/no, rating (1–5), emoji reaction, image choice. Public / private / unlisted visibility, categories, tags, cover images, expiration.
- **Voting** — anonymous, logged-in, one-vote-per-user, optional one-vote-per-IP, multiple selections. Instant confirmation + live results.
- **Live results** — animated progress bars, pie & bar charts, vote timeline, updating in real time via **Socket.IO**.
- **Sharing** — unique URLs, copy link, QR code, social buttons, iframe embed.
- **Engagement** — comments (with likes, edit/delete, owner can disable), favorites/bookmarks, followers.
- **Discovery** — global debounced search across polls, categories, tags, users; filters, sorting, pagination, infinite scroll.
- **Notifications** — new votes, comments, milestones (100/500/1000…), expirations — pushed live.
- **Dashboard & analytics** — totals, active/closed, votes received, views, conversion rate, daily activity, top voting times, device & browser breakdown.
- **UI/UX** — modern SaaS interface, responsive sidebar + top nav, dark/light mode, loading skeletons, toasts, confirmation dialogs, empty/error states, optimistic updates.

---

## 🧱 Tech Stack

| Layer     | Technologies |
|-----------|--------------|
| Frontend  | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, React Hook Form, Zod, Recharts |
| Backend   | Node.js, Express, Prisma ORM, JWT, bcrypt, Socket.IO, Zod, Swagger |
| Database  | PostgreSQL 16 |
| Cache     | Redis 7 |
| Infra     | Docker & Docker Compose |

---

## 🗂 Project Structure

```
pollwave/
├── docker-compose.yml        # frontend + backend + postgres + redis
├── .env.example
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # all tables, relations, indexes
│   │   └── seed.ts            # demo data generator
│   └── src/
│       ├── config/            # env, prisma, redis (keys + cache helpers)
│       ├── middleware/        # auth, error, rate limit, validate
│       ├── realtime/          # Socket.IO
│       ├── docs/              # Swagger spec
│       ├── modules/           # feature modules (routes/controller/service/repository/schema)
│       │   ├── auth  users  polls  votes  comments  favorites
│       │   ├── search  notifications  dashboard  analytics
│       │   └── categories  health
│       ├── utils/             # http, jwt, crypto, request, slug, duration
│       ├── app.ts  routes.ts  index.ts
│       └── Dockerfile
└── frontend/
    └── src/
        ├── app/               # App Router pages
        ├── components/        # ui/ (shadcn) + layout/ + poll/ + common/
        ├── hooks/             # reusable hooks
        ├── lib/               # api client, services, socket, types, utils
        └── store/             # Zustand stores
```

---

## 🚀 Getting Started (Docker — recommended)

**Prerequisites:** Docker & Docker Compose.

```bash
git clone <repo> && cd pollwave
docker compose up --build
```

Configuration comes from the single [`.env`](.env) file at the repo root. On first start the backend runs `prisma db push` to create the schema and (because `SEED_ON_START=true`) seeds demo data automatically.

- App: http://localhost:3000
- API: http://localhost:4000
- API docs: http://localhost:4000/docs
- Health: http://localhost:4000/api/health

**Demo credentials** (from the seed):

| Role  | Email                 | Password       |
|-------|-----------------------|----------------|
| Admin | `admin@pollwave.dev`  | `Admin123!`    |
| User  | `user1@pollwave.dev`  | `Password123!` |

(`user1` … `user20` all use `Password123!`.)

---

## 🛠 Local Development (without Docker)

You still need Postgres and Redis. The quickest way is to run just those via Docker:

```bash
docker compose up postgres redis -d
```

All configuration lives in the single [`.env`](.env) file at the repo root — both the backend (via dotenv) and the frontend (via `next.config.mjs`) load it, and Docker Compose reads it too. Its defaults already point at `localhost`, so no copying is needed.

**Backend**

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed                   # optional: load demo data
npm run dev                    # http://localhost:4000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                    # http://localhost:3000
```

---

## 🔌 API Overview

Full interactive documentation is served at **`/docs`** (Swagger UI). Highlights:

| Resource       | Endpoints |
|----------------|-----------|
| Auth           | `POST /api/auth/register` · `/login` · `/refresh` · `/logout` · `GET /me` · `POST /change-password` |
| Users          | `GET /api/users/:username` · `/:username/polls` · `PATCH /me` · follow/unfollow |
| Polls          | `GET/POST /api/polls` · `GET /api/polls/mine` · `GET/PATCH/DELETE /api/polls/:idOrSlug` · duplicate/archive/pin/close/share/results |
| Voting         | `POST /api/votes` · `GET /api/votes/:pollId/status` |
| Comments       | `GET/POST /api/comments/poll/:pollId` · edit/delete/like |
| Favorites      | `GET /api/favorites` · add/remove/status |
| Search         | `GET /api/search?q=` |
| Notifications  | `GET /api/notifications` · unread-count · read · read-all |
| Dashboard      | `GET /api/dashboard` |
| Analytics      | `GET /api/analytics/poll/:pollId` |
| Categories     | `GET/POST /api/categories` |
| Health         | `GET /api/health` |

All responses use a consistent envelope: `{ success, data }` or `{ success, data, meta }` for paginated lists, and `{ success: false, error: { message } }` on failure.

---

## ⚡ How Redis is used

Redis is a first-class part of the architecture, not a bolt-on:

- **Live vote counters** — per-poll Redis hashes (`poll:<id>:votes`) incremented atomically on every vote.
- **Poll result cache** — computed result payloads cached with short TTLs, invalidated on write.
- **Trending polls** — a sorted set (`polls:trending`) scored by vote activity.
- **Dashboard & search caches** — expensive aggregates cached per-user / per-query.
- **Session/token storage** — refresh-token whitelist with rotation.
- **JWT blacklist** — revoked access tokens on logout.
- **Rate limiting** — sliding windows backed by `rate-limit-redis`.
- **Vote & view de-duplication** — guard keys enforce one-vote-per-user/IP and dedupe views.

---

## 🔐 Security

Helmet security headers · CORS allow-list · bcrypt password hashing · JWT access/refresh with rotation & blacklist · Zod input validation on every endpoint · Prisma parameterized queries (SQL-injection safe) · rate limiting on API / auth / voting · IP hashing for privacy.

---

## 🧪 Seed Data

`npm run seed` (or automatic on first Docker start) generates: 1 admin, 20 users, 100 polls, ~500 options, 5,000 votes, ~300 comments, likes, favorites, follows, ~150 notifications, and ~2,000 poll views — with vote/view counts reconciled to the actual rows.

---

## 📄 License

MIT — free to use for learning, portfolios, and testing deployments.
