# Invitation Cards Creator

Generate personalized invitation card PNGs from an HTML template and a guest list. Uses Puppeteer to render each card in a headless browser and screenshot it. Supports both batch CLI mode and a queue-based server mode with BullMQ + Redis.

## How it works

1. **`sample-template.html`** — an HTML/CSS invitation card with a `{{guestName}}` placeholder
2. **`guests.csv`** — a CSV file with a `name` column (one guest per row)
3. **`render.js`** — renders cards using Puppeteer (used by both CLI and worker modes)

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v10+)
- [Docker](https://www.docker.com/) + Docker Compose (for queue mode)

## CLI mode (batch)

Renders all guests from the CSV in one shot:

```bash
pnpm install
pnpm render
```

Custom paths:

```bash
node render.js <template-path> <guests-csv-path> <output-dir>
```

## Queue mode (Docker Compose)

Runs an Express server + BullMQ worker + Redis. Render jobs go through a queue so too many requests don't overwhelm the system.

```bash
docker compose up --build
```

### Submit render jobs

```bash
curl -X POST http://localhost:3000/render \
  -H "Content-Type: application/json" \
  -d '{"guests": ["Aarav Sharma", "Priya Patel", "Rohan Gupta"]}'
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

### Stop

```bash
docker compose down
```

## Customization

- **Template** — edit `sample-template.html` or create your own. Use `{{guestName}}` where the guest's name should appear.
- **Guest list** — edit `guests.csv`. The first row must be the header `name`.
- **Worker concurrency** — set `WORKER_CONCURRENCY` env var (default: 2).

## Project structure

```
.
├── sample-template.html   # HTML/CSS invitation card template
├── guests.csv             # Guest names (CSV)
├── render.js              # Puppeteer rendering logic (shared by CLI + worker)
├── server.js              # Express API server (BullMQ producer)
├── worker.js              # BullMQ worker (processes render jobs)
├── start.js               # Entry point (runs server + worker together)
├── package.json
├── Dockerfile
├── docker-compose.yml     # Orchestrates app + Redis
├── .dockerignore
└── output/                # Generated PNGs (git-ignored)
```
