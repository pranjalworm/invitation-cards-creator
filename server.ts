import express, { type Request, type Response } from "express";
import { Queue } from "bullmq";
import path from "path";
import fs from "fs";

interface RenderRequestBody {
  guests?: string[];
  templatePath?: string;
  templateHtml?: string;
}

interface RenderJobData {
  templateHtml: string;
  guestName: string;
  outputDir: string;
}

const app = express();
app.use(express.json());

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const PORT = parseInt(process.env.PORT || "3000", 10);
const TEMPLATE_PATH = process.env.TEMPLATE_PATH || "sample-template.html";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "output";

const connection = { host: REDIS_HOST, port: REDIS_PORT };
const renderQueue = new Queue<RenderJobData>("render", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

// POST /render — queue render jobs for each guest
app.post("/render", async (req: Request, res: Response) => {
  const { guests, templatePath, templateHtml } = req.body as RenderRequestBody;

  if (!guests || !Array.isArray(guests) || guests.length === 0) {
    res.status(400).json({ error: "guests must be a non-empty array of names" });
    return;
  }

  let html = templateHtml;
  if (!html) {
    const tplPath = path.resolve(templatePath || TEMPLATE_PATH);
    if (!fs.existsSync(tplPath)) {
      res.status(400).json({ error: `Template not found: ${tplPath}` });
      return;
    }
    html = fs.readFileSync(tplPath, "utf-8");
  }

  const jobs: { id: string | undefined; guestName: string }[] = [];
  for (const guestName of guests) {
    const job = await renderQueue.add("render-card", {
      templateHtml: html,
      guestName,
      outputDir: OUTPUT_DIR,
    });
    jobs.push({ id: job.id, guestName });
  }

  res.status(202).json({
    message: `Queued ${jobs.length} render job(s)`,
    jobs,
  });
});

// GET /jobs/:id — check job status
app.get("/jobs/:id", async (req: Request, res: Response) => {
  const job = await renderQueue.getJob(req.params.id as string);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const state = await job.getState();
  res.json({
    id: job.id,
    guestName: job.data.guestName,
    state,
    result: job.returnvalue,
    failedReason: job.failedReason || null,
  });
});

// GET /health
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Redis connection: ${REDIS_HOST}:${REDIS_PORT}`);
});
