export interface RenderJobData {
  templateHtml: string;
  title: string
  eventDate: string
  time: string
  venue: string
  hostName: string
  guestName: string;
  message: string
  outputDir: string;
  batchId: string;
  batchSize: number;
  batchEnqueuedAt: number;
}

export interface RenderJobResult {
  outputPath: string
}