import puppeteer, { type Browser } from "puppeteer";
import path from "path";
import fs from "fs";

// Shared browser instance
let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!_browser) {
    _browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

/**
 * Render a single invitation card PNG.
 */
export async function renderCard(
  templateHtml: string,
  guestName: string,
  outputDir: string
): Promise<string> {
  const absOutputDir = path.resolve(outputDir);
  fs.mkdirSync(absOutputDir, { recursive: true });

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 3 });

  const html = templateHtml.replace("{{guestName}}", guestName);
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.evaluateHandle("document.fonts.ready");

  const filename = guestName.toLowerCase().replace(/\s+/g, "-") + ".png";
  const outputPath = path.join(absOutputDir, filename);

  const cardElement = await page.$(".card");
  if (cardElement) {
    await cardElement.screenshot({ path: outputPath, type: "png" });
  } else {
    await page.screenshot({ path: outputPath, fullPage: true });
  }

  await page.close();
  console.log(`Saved: ${outputPath}`);
  return outputPath;
}
