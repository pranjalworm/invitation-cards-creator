import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Shared browser instance
let _browser = null;

async function getBrowser() {
  if (!_browser) {
    _browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return _browser;
}

export async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

/**
 * Render a single invitation card PNG.
 */
export async function renderCard(templateHtml, guestName, outputDir) {
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

/**
 * Render cards for all guests in a CSV file (batch/CLI mode).
 */
export async function renderAllCards(templatePath, guestsPath, outputDir) {
  const absoluteTemplatePath = path.resolve(templatePath);
  const templateHtml = fs.readFileSync(absoluteTemplatePath, "utf-8");

  const csv = fs.readFileSync(path.resolve(guestsPath), "utf-8");
  const names = csv
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1);

  for (const name of names) {
    await renderCard(templateHtml, name, outputDir);
  }

  await closeBrowser();
  console.log(
    `\nDone! Generated ${names.length} invitation cards in ${path.resolve(outputDir)}`
  );
}

// CLI entry point
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const template = process.argv[2] || process.env.TEMPLATE_PATH || "sample-template.html";
  const guests = process.argv[3] || process.env.GUESTS_PATH || "guests.csv";
  const outputDir = process.argv[4] || process.env.OUTPUT_DIR || "output";
  renderAllCards(template, guests, outputDir);
}
