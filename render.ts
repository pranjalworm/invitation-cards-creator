import puppeteer, { type Page, type Browser } from "puppeteer";
import Handlebars from "handlebars";
import path from "path";
import fs from "fs";
import { RenderJobData } from "./interfaces";

// Shared browser instance
let _browser: Browser | null = null;

// Shared page instance
let _page: Page | null = null

async function getBrowser(): Promise<Browser> {
  if (!_browser) {
    _browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return _browser;
}

async function getPage(): Promise<Page> {
  const browser = await getBrowser()
  if (_page === null) {
    _page = await browser.newPage();
     await _page.setViewport({ width: 800, height: 600, deviceScaleFactor: 3 });
  }

  return _page
}

export async function closeBrowser(): Promise<void> {

  if (_page) {
    await _page.close();
  }
  
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

/**
 * Render a single invitation card PNG.
 */
export async function renderCard(
  data: RenderJobData
): Promise<string> {
  const { templateHtml, guestName, title, eventDate, time, venue, hostName, message, outputDir} = data
  const absOutputDir = path.resolve(outputDir);
  fs.mkdirSync(absOutputDir, { recursive: true });

  const renderStart = performance.now();

  const page = await getPage()
 
  const pageSetupMs = (performance.now() - renderStart).toFixed(1);

  const templateStart = performance.now();
  const template = Handlebars.compile(templateHtml);
  const html = template({ guestName, eventDate, time, venue, hostName, title, message });
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.evaluateHandle("document.fonts.ready");
  const templateMs = (performance.now() - templateStart).toFixed(1);

  const filename = guestName.toLowerCase().replace(/\s+/g, "-") + ".png";
  const outputPath = path.join(absOutputDir, filename);

  const screenshotStart = performance.now();

  await page.screenshot({ path: outputPath, fullPage: true });
  const screenshotMs = (performance.now() - screenshotStart).toFixed(1);

  const totalMs = (performance.now() - renderStart).toFixed(1);
  console.log(`[${new Date().toISOString()}] Rendered ${guestName}: page=${pageSetupMs}ms template=${templateMs}ms screenshot=${screenshotMs}ms total=${totalMs}ms -> ${outputPath}`);
  return outputPath;
}
