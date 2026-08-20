#!/usr/bin/env node
/**
 * Capture Tripwire dashboard screenshots into docs/screenshots/.
 * Usage: node scripts/capture-screenshots.mjs [baseUrl]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outRoot = path.join(root, "docs/screenshots");
const baseUrl = process.argv[2] || "http://127.0.0.1:8765/Tripwire.dc.html";
const chrome =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickButtonByText(page, text) {
  const clicked = await page.evaluate((label) => {
    const buttons = [...document.querySelectorAll("button")];
    const exactBtn = buttons.find((b) => b.textContent.trim() === label);
    if (exactBtn) {
      exactBtn.click();
      return true;
    }
    const partialBtn = buttons.find((b) =>
      b.textContent.replace(/\s+/g, " ").trim().includes(label),
    );
    if (partialBtn) {
      partialBtn.click();
      return true;
    }
    // Overview stat cards are clickable divs (label is a child leaf).
    const leaves = [...document.querySelectorAll("*")].filter(
      (el) => el.children.length === 0 && el.textContent.trim() === label,
    );
    for (const leaf of leaves) {
      const clickable = leaf.closest("[style*='cursor:pointer']") || leaf.parentElement;
      if (clickable) {
        clickable.click();
        return true;
      }
    }
    return false;
  }, text);
  if (!clicked) throw new Error(`Clickable not found: ${text}`);
  await sleep(500);
}

async function listVisibleItemNames(page) {
  return page.evaluate(() => {
    // Cards typically have a name in a short leaf-ish text node
    const names = [];
    for (const el of document.querySelectorAll("*")) {
      if (el.children.length > 0) continue;
      const t = el.textContent.trim();
      if (
        t &&
        t.length > 3 &&
        t.length < 80 &&
        !t.includes("\n") &&
        /[a-z]/.test(t) &&
        (t.includes("-") || t.includes("_"))
      ) {
        names.push(t);
      }
    }
    return [...new Set(names)];
  });
}

async function clickItemByName(page, name) {
  const result = await page.evaluate((itemName) => {
    const candidates = [...document.querySelectorAll("*")].filter((e) => {
      const t = e.textContent.trim();
      return t === itemName || t.startsWith(itemName);
    });
    // Prefer the deepest (most specific) match
    candidates.sort(
      (a, b) => a.textContent.trim().length - b.textContent.trim().length,
    );
    const el = candidates[0];
    if (!el) return { ok: false, names: [] };
    let card = el;
    for (let i = 0; i < 8 && card; i++) {
      const style = window.getComputedStyle(card);
      if (style.cursor === "pointer" || card.onclick || card.getAttribute("role") === "button") {
        break;
      }
      card = card.parentElement;
    }
    (card || el).click();
    return { ok: true };
  }, name);
  if (!result.ok) {
    const names = await listVisibleItemNames(page);
    throw new Error(`Item not found: ${name}. Visible: ${names.join(", ")}`);
  }
  await sleep(800);
}

async function closeDetail(page) {
  await page.keyboard.press("Escape");
  await sleep(400);
  // If still open, try an explicit close control
  await page.evaluate(() => {
    const close = [...document.querySelectorAll("button")].find((b) => {
      const t = b.textContent.trim().toLowerCase();
      return t === "×" || t === "x" || t === "close" || t.includes("close");
    });
    close?.click();
  });
  await sleep(300);
}

async function shot(page, relPath) {
  const full = path.join(outRoot, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  await page.screenshot({
    path: full,
    type: "png",
    fullPage: true,
    captureBeyondViewport: true,
  });
  const size = fs.statSync(full).size;
  console.log(`✓ ${relPath} (${size} bytes)`);
}

async function resetFilters(page) {
  await clickButtonByText(page, "All items");
  await clickButtonByText(page, "Total items");
  await clickButtonByText(page, "Grid");
  await sleep(300);
}

async function main() {
  console.log(`Opening ${baseUrl}`);
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    // Gallery labels assume Mock fixture severities (Red/Amber/Green examples).
    await page.evaluateOnNewDocument(() => {
      sessionStorage.setItem("tripwire-data-source-mode", "mock");
      // Slice 41 intro — gallery captures assume dashboard chrome, not landing.
      sessionStorage.setItem("tripwire-intro-dismissed", "1");
    });
    await page.goto(baseUrl, { waitUntil: "networkidle0", timeout: 60000 });
    await sleep(1500);

    // Ensure we're on Dashboard with Grid (intro already dismissed via sessionStorage)
    try {
      await clickButtonByText(page, "Dashboard");
    } catch {
      await clickButtonByText(page, "Open Dashboard");
    }
    await resetFilters(page);

    // 02 — Dashboard
    await shot(page, "02-dashboard/02-dashboard-overview-grid.png");

    await clickButtonByText(page, "Red");
    await shot(page, "02-dashboard/03-filter-red.png");
    await clickButtonByText(page, "Total items");

    await clickButtonByText(page, "Amber");
    await shot(page, "02-dashboard/05-filter-amber.png");
    await clickButtonByText(page, "Total items");

    await clickButtonByText(page, "Green");
    await shot(page, "02-dashboard/07-filter-green.png");
    await clickButtonByText(page, "Total items");

    await clickButtonByText(page, "Escalated");
    await shot(page, "02-dashboard/14-filter-escalated.png");
    await clickButtonByText(page, "Total items");

    await clickButtonByText(page, "SIE-only");
    await shot(page, "02-dashboard/15-filter-sie-only.png");
    await clickButtonByText(page, "Total items");

    // Pathway strip on an escalated Mock card (open detail if strip is on card)
    await clickButtonByText(page, "Escalated");
    await sleep(500);
    await shot(page, "02-dashboard/16-pathway-escalated-grid.png");
    await clickButtonByText(page, "Total items");
    await clickButtonByText(page, "SIE-only");
    await sleep(500);
    await shot(page, "02-dashboard/17-pathway-sie-only-grid.png");
    await clickButtonByText(page, "Total items");

    await clickButtonByText(page, "MCP Servers");
    await shot(page, "02-dashboard/09-mcp-servers-all.png");
    await clickButtonByText(page, "All items");

    await clickButtonByText(page, "List");
    await shot(page, "02-dashboard/13-list-view-all-items.png");
    await clickButtonByText(page, "Grid");

    // 03 — Skills
    await resetFilters(page);
    await clickButtonByText(page, "Skills");
    await sleep(700);
    console.log("Skills visible:", (await listVisibleItemNames(page)).join(", "));
    await clickItemByName(page, "vuln-prompt-injection-notes");
    await shot(page, "03-skills/04-red-skill-detail-vuln-prompt-injection.png");
    await closeDetail(page);

    await clickItemByName(page, "disagreement-naive-domain-check");
    await shot(
      page,
      "03-skills/06-amber-skill-detail-disagreement-domain-check.png",
    );
    await closeDetail(page);

    await clickItemByName(page, "safe-csv-cleaner");
    await shot(page, "03-skills/08-green-skill-detail-safe-csv-cleaner.png");
    await closeDetail(page);

    // 04 — MCP servers
    await resetFilters(page);
    await clickButtonByText(page, "MCP Servers");
    await sleep(700);
    console.log("MCP visible:", (await listVisibleItemNames(page)).join(", "));
    await clickItemByName(page, "vuln-command-injection-server");
    await shot(
      page,
      "04-mcp-servers/10-red-mcp-detail-vuln-command-injection.png",
    );
    await closeDetail(page);

    await clickItemByName(page, "vuln-unauthenticated-http-server");
    await shot(
      page,
      "04-mcp-servers/11-amber-mcp-detail-vuln-unauthenticated-http.png",
    );
    await closeDetail(page);

    await clickItemByName(page, "safe-time-server");
    await shot(page, "04-mcp-servers/12-green-mcp-detail-safe-time-server.png");
    await closeDetail(page);

    console.log("Done — replaced all dashboard/skill/MCP screenshots.");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
