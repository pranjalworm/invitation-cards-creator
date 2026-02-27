# Invitation Cards Creator

Generate personalized invitation card PNGs from an HTML template and a guest list CSV. Uses Puppeteer to render each card in a headless browser and screenshot it.

## How it works

1. **`sample-template.html`** — an HTML/CSS invitation card with a `{{guestName}}` placeholder
2. **`guests.csv`** — a CSV file with a `name` column (one guest per row)
3. **`render.js`** — reads the template, loops through each guest name, replaces the placeholder, and screenshots the card as a high-resolution PNG (3x device scale)

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v10+)
- Or [Docker](https://www.docker.com/)

## Quick start

### Run locally

```bash
pnpm install
pnpm render
```

### Run with Docker

```bash
docker build -t invitation-cards .
docker run --rm -v ./output:/app/output invitation-cards
```

Output PNGs will be written to the `output/` directory.

## Customization

- **Template** — edit `sample-template.html` or create your own. Use `{{guestName}}` where the guest's name should appear.
- **Guest list** — edit `guests.csv`. The first row must be the header `name`.
- **Custom paths** — pass arguments to the render script:
  ```bash
  node render.js <template-path> <guests-csv-path> <output-dir>
  ```

## Project structure

```
.
├── sample-template.html   # HTML/CSS invitation card template
├── guests.csv             # Guest names (CSV)
├── render.js              # Puppeteer rendering script
├── package.json
├── Dockerfile
├── .dockerignore
└── output/                # Generated PNGs (git-ignored)
```
