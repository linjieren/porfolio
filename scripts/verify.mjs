import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.PORTFOLIO_URL || "http://127.0.0.1:4173/porfolio/";
const outDir = process.env.SHOTS || "/tmp/portfolio-shots";
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--autoplay-policy=no-user-gesture-required"],
});

const page = await browser.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

const results = [];
const shot = async (name) => {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
};

async function overflow() {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth - doc.clientWidth,
    };
  });
}

await page.goto(base, { waitUntil: "load", timeout: 30000 });
console.log("first load");

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
];

for (const viewport of viewports) {
  await page.setViewport(viewport);
  await page.goto(base, { waitUntil: "load", timeout: 30000 });
  console.log("viewport", viewport.name);
  const hero = await overflow();
  results.push({ viewport: viewport.name, where: "hero", ...hero });
  await shot(`${viewport.name}-hero`);

  for (const id of ["index", "suunto", "diagnostic", "hyperspot", "shan-hai", "films", "contact"]) {
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), id);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const box = await overflow();
    results.push({ viewport: viewport.name, where: id, ...box });
    if (["index", "suunto", "diagnostic", "hyperspot", "films", "contact"].includes(id)) {
      await shot(`${viewport.name}-${id}`);
    }
  }
}

await page.setViewport({ width: 1440, height: 1000 });
await page.goto(base, { waitUntil: "load", timeout: 30000 });
console.log("media pass");
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

const media = await page.evaluate(async () => {
  const images = [...document.images];
  for (const img of images) {
    img.scrollIntoView({ block: "center" });
    if (img.complete && img.naturalWidth) continue;
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 4000);
      img.addEventListener("load", () => { clearTimeout(timer); resolve(); }, { once: true });
      img.addEventListener("error", () => { clearTimeout(timer); resolve(); }, { once: true });
    });
  }
  return {
    images: images.map((img) => ({
      src: img.getAttribute("src"),
      ok: img.naturalWidth > 0,
      w: img.naturalWidth,
      h: img.naturalHeight,
    })),
    mirrors: [...document.querySelectorAll("img")].some((img) => {
      const transform = getComputedStyle(img).transform;
      return transform.includes("-1");
    }),
  };
});
results.push({ media });

const videos = await page.evaluate(async () => {
  const nodes = [...document.querySelectorAll("video")];
  const report = [];
  for (const video of nodes) {
    video.scrollIntoView({ block: "center" });
    const started = performance.now();
    while (!video.querySelector("source") && performance.now() - started < 4000) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const source = video.querySelector("source")?.getAttribute("src") || "";
    try {
      await Promise.race([
        video.play(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("play timeout")), 8000)),
      ]);
    } catch (error) {
      report.push({ source, error: String(error), duration: video.duration, paused: video.paused, readyState: video.readyState });
      continue;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    report.push({
      source,
      paused: video.paused,
      currentTime: video.currentTime,
      duration: video.duration,
      readyState: video.readyState,
      controls: video.controls,
      autoplay: video.autoplay,
    });
    video.pause();
  }
  return report;
});
results.push({ videos });

await page.evaluate(() => document.getElementById("suunto")?.scrollIntoView());
await page.locator("[data-group='suunto']").click();
await page.waitForSelector("dialog[open]");
await page.keyboard.press("ArrowRight");
const lightbox = await page.evaluate(() => {
  const dialog = document.querySelector("dialog");
  const img = dialog.querySelector("img");
  return {
    open: dialog.open,
    alt: img.alt,
    caption: document.querySelector("#lightbox-caption")?.textContent,
    src: img.getAttribute("src"),
  };
});
await shot("desktop-lightbox");
await page.keyboard.press("Escape");
const closed = await page.evaluate(() => !document.querySelector("dialog").open);
results.push({ lightbox, closed });

await page.evaluate(() => document.getElementById("diagnostic")?.scrollIntoView());
await page.locator("[data-panel='panel-diagnosis']").click();
const concept = await page.evaluate(() => {
  const panel = document.querySelector("#panel-diagnosis");
  const hiddenContext = document.querySelector("#panel-context").hidden;
  return {
    diagnosisHidden: panel.hidden,
    text: panel.innerText.slice(0, 180),
    contextHidden: hiddenContext,
  };
});
results.push({ concept });
await shot("desktop-diagnosis-open");

await page.setViewport({ width: 390, height: 844 });
await page.goto(base, { waitUntil: "load", timeout: 30000 });
console.log("mobile menu");
await page.locator(".nav-toggle").click();
const menu = await page.evaluate(() => {
  const nav = document.querySelector("#site-nav");
  const toggle = document.querySelector(".nav-toggle");
  return {
    expanded: toggle.getAttribute("aria-expanded"),
    open: nav.classList.contains("is-open"),
  };
});
await shot("mobile-menu");
await page.locator(".site-nav a[href='#contact']").click();
await new Promise((resolve) => setTimeout(resolve, 400));
const contact = await page.evaluate(() => location.hash);
await page.keyboard.press("Escape");
results.push({ menu, contact });

const failedOverflow = results.filter((item) => typeof item.overflow === "number" && item.overflow > 1);
const summary = {
  base,
  errors,
  failedOverflow,
  media,
  videos,
  lightbox,
  closed,
  concept,
  menu,
  contactHash: contact,
};

await writeFile(path.join(outDir, "report.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();

if (errors.length || failedOverflow.length) process.exitCode = 1;
const badImages = media.images.filter((img) => img.src && !img.ok);
const badVideos = videos.filter((video) => video.paused || video.autoplay || !(video.currentTime > 0) || !(video.duration > 10));
if (badImages.length || badVideos.length || !closed || concept.diagnosisHidden || !concept.contextHidden || menu.expanded !== "true") {
  process.exitCode = 1;
}
