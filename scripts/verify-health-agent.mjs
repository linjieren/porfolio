import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const origin = process.env.PORTFOLIO_ORIGIN || "http://127.0.0.1:4173";
const base = `${origin}/porfolio/`;
const outDir = process.env.SHOTS || "/tmp/health-agent-shots";
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});

const failures = [];
const fail = (message) => {
  failures.push(message);
  console.error("FAIL", message);
};

const page = await browser.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

async function overflow() {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
}

async function shot(name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

const routes = ["/porfolio/health_agent/", "/porfolio/health_agent", "/porfolio/health_agent.html"];
for (const route of routes) {
  const response = await page.goto(`${origin}${route}`, { waitUntil: "load", timeout: 30000 });
  const status = response?.status() ?? 0;
  if (status !== 200) fail(`${route} status ${status}`);
  const title = await page.title();
  if (title !== "health_agent | Linjie Ren") fail(`${route} title ${title}`);
}

await page.setViewport({ width: 1024, height: 525, deviceScaleFactor: 1 });
await page.goto(`${base}health_agent/`, { waitUntil: "load", timeout: 30000 });
await new Promise((resolve) => setTimeout(resolve, 400));

const desktopOverflow = await overflow();
if (desktopOverflow > 1) fail(`desktop overflow ${desktopOverflow}`);
await shot("desktop-1024x525");
await page.screenshot({ path: path.join(outDir, "desktop-full.png"), fullPage: true });

const content = await page.evaluate(() => {
  const text = document.body.innerText;
  const link = document.querySelector(".personal-site a");
  const video = document.querySelector("video");
  const fileLink = document.querySelector(".player figcaption a");
  return {
    text,
    html: document.body.innerHTML,
    linkHref: link?.getAttribute("href") || "",
    linkText: link?.innerText || "",
    video: video
      ? {
          autoplay: video.autoplay,
          controls: video.controls,
          muted: video.muted,
          paused: video.paused,
          preload: video.getAttribute("preload"),
          playsInline: video.hasAttribute("playsinline"),
          poster: video.getAttribute("poster") || "",
          dataSrc: video.getAttribute("data-src") || "",
          source: video.querySelector("source")?.getAttribute("src") || "",
          label: video.getAttribute("aria-label") || "",
        }
      : null,
    fileHref: fileLink?.getAttribute("href") || "",
    hasNav: Boolean(document.querySelector(".site-nav, .site-header, .nav-toggle")),
    headings: [...document.querySelectorAll("h1,h2,h3")].map((node) => node.textContent.trim()),
    articles: document.querySelectorAll("article").length,
    posterOk: false,
  };
});

const banned = [
  "Product Manager / AI Product Manager",
  "Recorded prototype, about 84 seconds",
  "Cross-Border",
  "HyperSpot",
  "Shan Hai",
  "Hong Kong Heritage",
  "Wuxia",
];
for (const phrase of banned) {
  if (content.text.includes(phrase) || content.html.includes(phrase)) fail(`standalone contains ${phrase}`);
}
if (/\bRole\b/.test(content.text) || /\bForm\b/.test(content.text)) fail("standalone still shows Role or Form");
if (content.linkHref !== "https://linjieren.github.io/") fail(`personal link href ${content.linkHref}`);
if (!content.linkText.includes("Personal website")) fail(`personal link text ${content.linkText}`);
if (content.hasNav) fail("standalone has site navigation");
if (content.articles !== 1) fail(`article count ${content.articles}`);
if (content.headings.join(" | ") !== "Suunto AI Coach") fail(`headings ${content.headings.join(" | ")}`);
if (!/suunto\s*\/\s*product\s*&\s*agent experience/i.test(content.text)) fail("missing eyebrow");
if (!content.text.includes("A context-aware sports & health agent. From daily signals to practical next steps.")) {
  fail("missing subtitle");
}
if (!content.text.includes("Press play — it does not start on its own")) fail("missing manual-play note");
if (!content.video) fail("missing video");
if (content.video?.autoplay) fail("video autoplay is set");
if (!content.video?.controls) fail("video controls missing");
if (!content.video?.playsInline) fail("video playsinline missing");
if (content.video?.preload !== "none") fail(`video preload ${content.video?.preload}`);
if (content.video?.muted) fail("video is muted");
if (!content.video?.paused) fail("video is playing before a user gesture");
if (!content.video?.poster.endsWith("/porfolio/media/suunto-route.jpg")) fail(`poster ${content.video?.poster}`);
if (!content.video?.dataSrc.endsWith("/porfolio/media/suunto-ai-coach-prototype.mp4")) fail(`data-src ${content.video?.dataSrc}`);
if (!content.fileHref.endsWith("/porfolio/media/suunto-ai-coach-prototype.mp4")) fail(`file link ${content.fileHref}`);

const poster = await page.evaluate(async () => {
  const video = document.querySelector("video");
  if (!video) return { ok: false, w: 0, h: 0 };
  const img = new Image();
  img.src = video.getAttribute("poster");
  await img.decode().catch(() => {});
  return { ok: img.naturalWidth > 0, w: img.naturalWidth, h: img.naturalHeight };
});
if (!poster.ok) fail(`poster failed to load ${JSON.stringify(poster)}`);

const media = [];
for (const url of new Set([content.video.poster, content.video.dataSrc, content.fileHref])) {
  const absolute = new URL(url, `${base}health_agent/`).href;
  const response = await fetch(absolute);
  const type = response.headers.get("content-type") || "";
  media.push({ url: absolute, status: response.status, type });
  if (response.status !== 200) fail(`${absolute} status ${response.status}`);
  if (url.endsWith(".mp4") && !type.includes("video")) fail(`${absolute} type ${type}`);
  if (url.endsWith(".jpg") && !type.includes("image")) fail(`${absolute} type ${type}`);
}

await page.goto(`${base}health_agent/`, { waitUntil: "load", timeout: 30000 });
await page.evaluate(() => document.querySelector("video")?.scrollIntoView({ block: "center" }));
const playback = await page.evaluate(async () => {
  const video = document.querySelector("video");
  const before = { paused: video.paused, autoplay: video.autoplay, time: video.currentTime };
  const started = performance.now();
  while (!video.querySelector("source") && performance.now() - started < 4000) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  try {
    await video.play();
  } catch (error) {
    return { before, error: String(error), source: video.querySelector("source")?.getAttribute("src") || "" };
  }
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    before,
    paused: video.paused,
    currentTime: video.currentTime,
    duration: video.duration,
    source: video.querySelector("source")?.getAttribute("src") || "",
    autoplay: video.autoplay,
  };
});
if (playback.error) fail(`play failed ${playback.error}`);
if (!(playback.currentTime > 0)) fail(`play did not advance ${JSON.stringify(playback)}`);
if (!(playback.duration > 10)) fail(`unexpected duration ${playback.duration}`);
if (playback.autoplay || playback.before?.autoplay) fail("autoplay flag present during playback check");
if (!playback.before?.paused) fail("video was not paused before play()");
await page.screenshot({ path: path.join(outDir, "desktop-playing.png") });
await page.evaluate(() => document.querySelector("video")?.pause());

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.goto(`${base}health_agent/`, { waitUntil: "load", timeout: 30000 });
await new Promise((resolve) => setTimeout(resolve, 300));
const mobileOverflow = await overflow();
if (mobileOverflow > 1) fail(`mobile overflow ${mobileOverflow}`);
await shot("mobile-390x844");
await page.screenshot({ path: path.join(outDir, "mobile-full.png"), fullPage: true });

await page.setViewport({ width: 320, height: 700, deviceScaleFactor: 1 });
await page.goto(`${base}health_agent/`, { waitUntil: "load", timeout: 30000 });
const narrowOverflow = await overflow();
if (narrowOverflow > 1) fail(`narrow overflow ${narrowOverflow}`);

await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto(`${base}`, { waitUntil: "load", timeout: 30000 });
const home = await page.evaluate(() => {
  const facts = document.querySelector("#suunto .facts")?.innerText || "";
  return {
    title: document.title,
    hasNav: Boolean(document.querySelector(".site-nav")),
    facts,
    projects: ["diagnostic", "hyperspot", "shan-hai", "films", "contact"].map((id) => Boolean(document.getElementById(id))),
    healthLink: Boolean(document.querySelector("a[href*='health_agent']")),
  };
});
if (home.title !== "Ella Ren — Selected Work") fail(`home title ${home.title}`);
if (!home.hasNav) fail("home nav missing");
if (!home.facts.includes("Product Manager / AI Product Manager")) fail("home role metadata missing");
if (!home.facts.includes("Recorded prototype, about 84 seconds")) fail("home form metadata missing");
if (home.projects.some((present) => !present)) fail(`home projects ${home.projects.join(",")}`);
if (home.healthLink) fail("home page links to health_agent");
await page.evaluate(() => document.getElementById("suunto")?.scrollIntoView({ block: "start" }));
await new Promise((resolve) => setTimeout(resolve, 250));
await shot("home-suunto-unchanged");

const summary = {
  failures,
  errors,
  desktopOverflow,
  mobileOverflow,
  narrowOverflow,
  content: {
    linkHref: content.linkHref,
    video: content.video,
    fileHref: content.fileHref,
    headings: content.headings,
  },
  poster,
  playback,
  media,
  home,
};
await writeFile(path.join(outDir, "report.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
if (failures.length || errors.length) process.exitCode = 1;
