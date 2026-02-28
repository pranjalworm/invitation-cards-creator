import { Worker, type Job } from "bullmq";
import { renderCard, closeBrowser } from "./render.js";
import { RenderJobData, RenderJobResult } from "./interfaces";


const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const CONCURRENCY = 1

const connection = { host: REDIS_HOST, port: REDIS_PORT };

// Track batch completion: batchId -> { completed, failed, total, startedAt }
const batchTracker = new Map<string, { completed: number; failed: number; total: number; startedAt: number }>();

function trackBatchCompletion(batchId: string, batchSize: number, batchEnqueuedAt: number, success: boolean): void {
  if (!batchTracker.has(batchId)) {
    batchTracker.set(batchId, { completed: 0, failed: 0, total: batchSize, startedAt: Date.now() });
  }
  const batch = batchTracker.get(batchId)!;
  if (success) {
    batch.completed++;
  } else {
    batch.failed++;
  }

  const processed = batch.completed + batch.failed;
  if (processed === batch.total) {
    const workerDuration = Date.now() - batch.startedAt;
    const totalDuration = Date.now() - batchEnqueuedAt;
    console.log(
      `[${new Date().toISOString()}] Batch ${batchId} finished: ${batch.completed} succeeded, ${batch.failed} failed out of ${batch.total} | worker time: ${workerDuration}ms | total time (enqueue to done): ${totalDuration}ms`
    );
    batchTracker.delete(batchId);
  }
}

const worker = new Worker<RenderJobData, RenderJobResult>(
  "render",
  async (job: Job<RenderJobData>) => {
    const jobStart = Date.now();
    const queueWait = jobStart - job.data.batchEnqueuedAt;
    console.log(`[${new Date().toISOString()}] Job ${job.id} started: ${job.data.guestName} (waited ${queueWait}ms in queue)`);

    const outputPath = await renderCard(job.data);

    const jobDuration = Date.now() - jobStart;
    console.log(`[${new Date().toISOString()}] Job ${job.id} completed: ${job.data.guestName} in ${jobDuration}ms`);

    trackBatchCompletion(job.data.batchId, job.data.batchSize, job.data.batchEnqueuedAt, true);
    return { outputPath };
  },
  { connection, concurrency: CONCURRENCY }
);

worker.on("failed", (job, err) => {
  console.error(`[${new Date().toISOString()}] Job ${job?.id} failed: ${err.message}`);
  if (job) {
    trackBatchCompletion(job.data.batchId, job.data.batchSize, job.data.batchEnqueuedAt, false);
  }
});

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log("Shutting down worker...");
  await worker.close();
  await closeBrowser();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(`Worker started (concurrency: ${CONCURRENCY})`);
console.log(`Redis connection: ${REDIS_HOST}:${REDIS_PORT}`);
