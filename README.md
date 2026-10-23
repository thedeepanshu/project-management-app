<div align="center">

<img src="client/public/icon-192.png" width="88" alt="Twillboard logo" />

# Twillboard

**Clients and projects, woven into one board.**

A calm, fast project manager for freelancers and small studios — built with React 19, GraphQL, Express 5 and MongoDB.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-Yoga-e10098?logo=graphql&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47a248?logo=mongodb&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)

<br />

<img src="docs/screenshots/dashboard-light.png" alt="Twillboard dashboard" width="100%" />

</div>

## Features

- **Dashboard** — greeting, completion ring, stat tiles, pipeline breakdown, upcoming deadlines, recent projects and top clients.
- **Kanban board** — drag cards between *Not started → In progress → Completed*. Updates are optimistic (instant) and roll back if the server rejects them.
- **Grid view with filters** — full-text search, status / priority filters and sorting. Every filter lives in the URL, so views are shareable and survive a refresh.
- **Projects** — priority, due dates with “due in 3 days” / overdue tracking, and a one-click status switcher.
- **Clients** — profiles with contact links, company, and a progress thread showing how their projects are going. Deleting a client tells you exactly how many projects go with them.
- **Validation everywhere** — instant client-side checks that mirror the server's Mongoose rules, with server errors mapped back onto the right field.
- **Light & dark themes** — follows your OS, remembers your choice, no flash on load.
- **AI writing help** — *Enhance* polishes a project description (or drafts one from the title) and *Suggest* offers clearer titles. Text streams in live and is only applied when you click *Use this*.
- **Twillboard Assistant** — a chat that answers questions about the app and your own projects and clients (“what's overdue?”, “what's due this week for Halcyon?”). Read-only by design.
- **Attachments** — drag images, videos, PDFs and Office documents onto a project. Uploads go straight to Cloudinary with live progress; images, videos and PDFs preview in-app, Office files open in Microsoft's online viewer.
- **Client photos** — upload from the device or paste an image URL; falls back to coloured initials.
- **Keyboard shortcuts** — <kbd>N</kbd> new project, <kbd>C</kbd> new client, <kbd>A</kbd> ask the assistant.
- **Responsive** — sidebar on desktop, top bar + floating tab bar on mobile.
- **Accessible** — native `<dialog>` modals (focus trap, <kbd>Esc</kbd>), labelled controls, `aria-invalid` errors, reduced-motion support.

<table>
  <tr>
    <td><img src="docs/screenshots/board-light.png" alt="Kanban board" /></td>
    <td><img src="docs/screenshots/dashboard-dark.png" alt="Dashboard in dark mode" /></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/new-project-modal.png" alt="New project dialog" /></td>
    <td><img src="docs/screenshots/project-detail-dark.png" alt="Project detail in dark mode" /></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/clients-light.png" alt="Clients" /></td>
    <td align="center"><img src="docs/screenshots/mobile-dark.png" alt="Mobile" width="45%" /></td>
  </tr>
</table>

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router 8 (data router, lazy-loaded routes), Apollo Client 4, Tailwind CSS 4, lucide icons, sonner toasts |
| Build | Vite 8, ESLint 10 |
| API | GraphQL Yoga on Express 5, schema-first SDL, DataLoader batching (no N+1 queries) |
| Database | MongoDB Atlas via Mongoose 9 with schema validation, timestamps and indexes |
| AI | Provider-agnostic layer: Google Gemini (free tier), Anthropic Claude or a local Ollama model, chosen in `.env` |
| Files | Cloudinary signed direct uploads, on-the-fly thumbnails, automatic cleanup on delete |
| Runtime | Node.js 24 LTS (built-in `--watch` and `--env-file`, no nodemon/dotenv) |

### Architecture notes

- **One deployable.** In production, Express serves both `/graphql` and the built React app.
- **Same-origin in development.** Vite proxies `/graphql` to the API, so there's no CORS setup to fight.
- **Typed enums end to end.** `ProjectStatus` / `ProjectPriority` are GraphQL enums mapped to the strings stored in MongoDB.
- **Safe errors.** Validation, bad IDs and duplicate emails become `BAD_USER_INPUT` errors with per-field messages; unexpected errors are masked in production.
- **Fail fast.** The server validates its environment and database connection at startup with clear messages, and shuts down gracefully.
- **Optional features degrade gracefully.** `GET /api/config` tells the client what's enabled; with no AI key or storage configured, those controls simply don't appear.
- **Streaming AI.** `/api/ai/*` streams newline-delimited JSON so text appears word by word; a closed tab or *Stop* aborts the upstream request. Rate-limited per IP (12/min, 200/day) to protect the free quota.
- **Uploads never touch the API.** The server signs a short-lived Cloudinary upload restricted to its own folder; the browser uploads directly, and GraphQL only accepts metadata for files in that folder.
- **Prompt-injection aware.** The assistant reads a plain-text workspace snapshot fenced as data, and has no tools that can change anything.

## Getting started

**Requirements:** Node.js 24+ and a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or a local MongoDB).

```bash
git clone https://github.com/thedeepanshu/project-management-app.git
cd project-management-app
npm install                 # installs the API and the client (npm workspaces)
cp .env.example .env        # then set MONGO_URI
npm run db:setup            # creates collections & indexes
npm run seed                # optional: demo clients & projects
npm run dev                 # API on :5000 + app on :5173
```

Open **http://localhost:5173**. The GraphQL playground (GraphiQL) is at **http://localhost:5000/graphql** in development.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Runs the API (auto-restarts on changes) and the Vite dev server together |
| `npm run build` | Builds the client into `client/dist` |
| `npm start` | Starts the API; with `NODE_ENV=production` it also serves the built app |
| `npm run db:setup` | Creates the collections and indexes (safe to re-run) |
| `npm run seed` | Adds demo data to an empty database (`npm run seed -- --reset` wipes it first) |
| `npm run lint` | Lints the client |

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `PORT` | | API port (default `5000`) |
| `NODE_ENV` | | `production` disables GraphiQL and serves the built client |
| `CLIENT_ORIGIN` | | Comma-separated origins allowed by CORS, if the app is hosted on a separate domain |
| `GEMINI_API_KEY` | | Enables AI features. Free key at [aistudio.google.com](https://aistudio.google.com) |
| `AI_PROVIDER` | | `gemini` (default when its key is set), `anthropic`, `ollama` or `none` |
| `AI_MODEL` | | Override the model (defaults: `gemini-flash-latest`, `claude-opus-5-5`, `llama3.2`) |
| `ANTHROPIC_API_KEY` / `OLLAMA_URL` | | For the Claude or local Ollama providers |
| `CLOUDINARY_URL` | | Enables attachments and photo uploads. Free account at [cloudinary.com](https://cloudinary.com) |

> **Cloudinary tip:** free accounts block PDF delivery by default. To preview PDFs, enable *Settings → Security → "Allow delivery of PDF and ZIP files"*.

## GraphQL API

```graphql
query Dashboard {
  stats { totalProjects completionRate overdue byStatus { status count } }
  projects(status: IN_PROGRESS) { name priority dueDate isOverdue client { name } }
}

mutation {
  addProject(input: {
    name: "Website redesign"
    description: "New marketing site"
    clientId: "…"
    priority: HIGH
    dueDate: "2026-12-01"
  }) { id status }
}
```

Full schema: [`server/graphql/typeDefs.js`](server/graphql/typeDefs.js).

## Project structure

```
├── server/
│   ├── ai/            # provider layer (Gemini / Claude / Ollama), prompts, workspace snapshot
│   ├── config/        # env validation, MongoDB connection
│   ├── graphql/       # typeDefs, resolvers, DataLoaders, error mapping
│   ├── models/        # Mongoose schemas with validation
│   ├── routes/api.js  # /api: feature config, streaming AI, upload signatures
│   ├── services/      # Cloudinary signing, thumbnails, cleanup
│   ├── scripts/       # db:setup, seed
│   └── index.js       # Express + GraphQL Yoga entry point
└── client/
    ├── public/        # favicon, app icons, manifest, social image
    └── src/
        ├── components/  # ui primitives, layout, projects, clients, attachments, ai, brand
        ├── graphql/     # queries, mutations, fragments
        ├── hooks/       # useForm, useTheme, useProjectAI, useAppConfig…
        ├── lib/         # Apollo client, REST/streaming helpers, uploads, formatting, validation
        └── pages/       # Dashboard, Projects, ProjectDetail, Clients, ClientDetail
```

---

<div align="center">Built by <a href="https://github.com/thedeepanshu">Deepanshu Saini</a></div>
