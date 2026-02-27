# Invitation Cards Creator

Generate personalized invitation card PNGs from HTML templates and a guest list. Uses Puppeteer to render each card in a headless browser and screenshot it. Render jobs are processed asynchronously via a BullMQ + Redis queue.

## How it works

1. Pick a template from `templates/` — each is an HTML/CSS invitation card with placeholders (`{{guestName}}`, `{{message}}`, `{{eventDate}}`, `{{time}}`, `{{venue}}`, `{{hostName}}`)
2. Send a POST request to `/render` with the template path and guest names
3. The server queues a render job per guest; the worker picks them up and generates PNGs

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v10+)
- [Docker](https://www.docker.com/) + Docker Compose

## Getting started

```bash
docker compose up --build
```

This starts three services:
- **redis** — job queue backend
- **api** — Express server on port 3000 (BullMQ producer)
- **worker** — BullMQ worker (processes render jobs with Puppeteer)

### Submit render jobs

```bash
curl -X POST http://localhost:3000/render \
  -H "Content-Type: application/json" \
  -d '{
    "templatePath": "templates/kids-birthday.html",
    "guests": ["Aarav Sharma", "Priya Patel", "Rohan Gupta"]
  }'
```

Response (HTTP 202):

```json
{
  "message": "Queued 3 render job(s)",
  "jobs": [
    { "id": "1", "guestName": "Aarav Sharma" },
    { "id": "2", "guestName": "Priya Patel" },
    { "id": "3", "guestName": "Rohan Gupta" }
  ]
}
```

### Check job status

```bash
curl http://localhost:3000/jobs/1
```

### Health check

```bash
curl http://localhost:3000/health
```

### Stop

```bash
docker compose down
```

## Available templates

| Template | Background | Theme |
|---|---|---|
| `templates/kids-birthday.html` | Dinosaurs | Dino Birthday Bash |
| `templates/baby-shower.html` | Woodland animals | Baby Shower |
| `templates/jungle-party.html` | Flowers & butterflies | Garden Party |
| `templates/aquarium-outing.html` | Underwater ocean | Aquarium Adventure |

## Template placeholders

| Placeholder | Description |
|---|---|
| `{{guestName}}` | Guest's name (per-card) |
| `{{message}}` | Invitation message |
| `{{eventDate}}` | Event date |
| `{{time}}` | Event time |
| `{{venue}}` | Event venue |
| `{{hostName}}` | Host's name |

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `PORT` | `3000` | API server port |
| `WORKER_CONCURRENCY` | `2` | Max simultaneous render jobs |
| `OUTPUT_DIR` | `output` | Directory for generated PNGs |

## Project structure

```
.
├── render.ts              # Puppeteer rendering logic
├── server.ts              # Express API server (BullMQ producer)
├── worker.ts              # BullMQ worker (processes render jobs)
├── templates/
│   ├── kids-birthday.html
│   ├── baby-shower.html
│   ├── jungle-party.html
│   ├── aquarium-outing.html
│   └── assets/
│       ├── backgrounds/   # Template background images
│       └── fonts/         # Local font files (woff2)
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml     # Orchestrates api + worker + Redis
├── .env.example
├── .dockerignore
└── output/                # Generated PNGs (git-ignored)
```
