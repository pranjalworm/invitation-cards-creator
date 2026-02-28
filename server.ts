import express, { type Request, type Response } from "express";
import { Queue } from "bullmq";
import path from "path";
import fs from "fs";
import { RenderJobData } from "./interfaces";

interface RenderRequestBody {
  guests?: string[]
  title: string
  eventDate: string
  time: string
  venue: string
  hostName: string
  message: string
  templatePath: string
}

const app = express();
app.use(express.json());

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const PORT = parseInt(process.env.PORT || "3000", 10);
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
  const { guests, templatePath, title, eventDate, time, venue, hostName, message } = req.body as RenderRequestBody;

  if (!guests || !Array.isArray(guests) || guests.length === 0) {
    res.status(400).json({ error: "guests must be a non-empty array of names" });
    return;
  }

  if (!templatePath) {
    res.status(400).json({ error: "templatePath is required" });
    return;
  }

  const tplPath = path.resolve(templatePath);
  if (!fs.existsSync(tplPath)) {
    res.status(400).json({ error: `Template not found: ${tplPath}` });
    return;
  }
  const html = fs.readFileSync(tplPath, "utf-8");

  const batchId = `batch-${Date.now()}`;
  const batchEnqueuedAt = Date.now();
  console.log(`[${new Date().toISOString()}] Batch ${batchId}: enqueueing ${guests.length} job(s)`);

  const jobs: { id: string | undefined; guestName: string }[] = [];
  for (const guestName of guests) {
    const job = await renderQueue.add("render-card", {
      templateHtml: html,
      title,
      guestName,
      eventDate,
      message,
      time,
      venue,
      hostName,
      outputDir: OUTPUT_DIR,
      batchId,
      batchSize: guests.length,
      batchEnqueuedAt,
    });
    jobs.push({ id: job.id, guestName });
  }

  console.log(`[${new Date().toISOString()}] Batch ${batchId}: all ${jobs.length} job(s) enqueued`);
  res.status(202).json({
    message: `Queued ${jobs.length} render job(s)`,
    batchId,
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
