const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

async function renderAllCards(templatePath, guestsPath, outputDir) {
  const absoluteTemplatePath = path.resolve(templatePath);
  const templateHtml = fs.readFileSync(absoluteTemplatePath, "utf-8");

  // Parse guest names from CSV (skip header row)
  const csv = fs.readFileSync(path.resolve(guestsPath), "utf-8");
  const names = csv
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1); // skip "name" header

  // Ensure output directory exists
  const absOutputDir = path.resolve(outputDir);
  fs.mkdirSync(absOutputDir, { recursive: true });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 3 });

  for (const name of names) {

    const html = templateHtml.replace("{{guestName}}", name);

    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluateHandle("document.fonts.ready");

    const filename = name.toLowerCase().replace(/\s+/g, "-") + ".png";
    const outputPath = path.join(absOutputDir, filename);

    const cardElement = await page.$(".card");
    if (cardElement) {
      await cardElement.screenshot({ path: outputPath, type: "png" });
    } else {
      await page.screenshot({ path: outputPath, fullPage: true });
    }

    console.log(`Saved: ${outputPath}`);
  }

  await browser.close();
  console.log(`\nDone! Generated ${names.length} invitation cards in ${absOutputDir}`);
}

const template = process.argv[2] || "sample-template.html";
const guests = process.argv[3] || "guests.csv";
const outputDir = process.argv[4] || "output";

renderAllCards(template, guests, outputDir);
