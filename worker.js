import { Worker } from "bullmq";
import { renderCard, closeBrowser } from "./render.js";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "2", 10);

const connection = { host: REDIS_HOST, port: REDIS_PORT };

const worker = new Worker(
  "render",
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.data.guestName}`);
    const { templateHtml, guestName, outputDir } = job.data;
    const outputPath = await renderCard(templateHtml, guestName, outputDir);
    console.log(`Completed job ${job.id}: ${outputPath}`);
    return { outputPath };
  },
  { connection, concurrency: CONCURRENCY }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down worker...");
  await worker.close();
  await closeBrowser();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(`Worker started (concurrency: ${CONCURRENCY})`);
console.log(`Redis connection: ${REDIS_HOST}:${REDIS_PORT}`);
