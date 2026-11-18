#!/usr/bin/env node
/**
 * Capture chaque page de la console LeannaAuto avec Microsoft Edge ou Chrome.
 * Prérequis : Node.js 22+, navigateur Chromium, serveur UI déjà démarré.
 * Variables : LEANNAAUTO_UI_TOKEN (obligatoire), LEANNAAUTO_UI_URL (optionnel),
 *             LEANNAAUTO_BROWSER (chemin du navigateur, optionnel).
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const baseUrl = (process.env.LEANNAAUTO_UI_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const token = process.env.LEANNAAUTO_UI_TOKEN;
const outputDir = path.resolve(process.argv[2] || "artifacts/screenshots/ui");
const pages = [
  ["overview", "vue-ensemble"], ["office", "bureau-ia"], ["agents", "agents"],
  ["missions", "missions"], ["tasks", "taches"], ["supervisor", "supervision"],
  ["lineage", "filiation"], ["logs", "logs-systeme"], ["audit", "audit"],
  ["usage", "quota-ia"], ["resources", "ressources"], ["workspace", "workspace"],
  ["settings", "securite-parametres"],
];

if (!token) {
  console.error("Définis d'abord LEANNAAUTO_UI_TOKEN avec un jeton administrateur.");
  process.exit(1);
}
if (typeof WebSocket === "undefined") {
  console.error("Ce script nécessite Node.js 22 ou supérieur (WebSocket natif).");
  process.exit(1);
}

async function findBrowser() {
  const candidates = [
    process.env.LEANNAAUTO_BROWSER,
    ...(process.platform === "win32" ? [
      path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
    ] : process.platform === "darwin" ? [
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ] : [
      "/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable",
      "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    ]),
  ].filter(Boolean);
  const found = candidates.find(candidate => existsSync(candidate));
  if (!found) throw new Error("Navigateur introuvable. Installe Edge/Chrome ou définis LEANNAAUTO_BROWSER.");
  return found;
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForJson(url, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error("Le navigateur n'a pas démarré son interface de débogage.");
}

class DevTools {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  async send(method, params = {}) {
    await this.ready;
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression, awaitPromise: true, returnByValue: true, userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result?.value;
  }
  close() { try { this.socket.close(); } catch {} }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitUntil(devtools, expression, label, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try { if (await devtools.evaluate(expression)) return; } catch {}
    await delay(250);
  }
  throw new Error("Délai dépassé : " + label);
}

let browser;
let devtools;
let profileDir;
try {
  const browserPath = await findBrowser();
  const port = await freePort();
  profileDir = await mkdtemp(path.join(os.tmpdir(), "leanna-capture-"));
  browser = spawn(browserPath, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--hide-scrollbars", "--disable-background-networking", "--disable-extensions",
    "--remote-allow-origins=*", "--remote-debugging-port=" + port,
    "--remote-debugging-address=127.0.0.1", "--user-data-dir=" + profileDir, "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  const targets = await waitForJson("http://127.0.0.1:" + port + "/json/list");
  const target = targets.find(item => item.type === "page");
  if (!target?.webSocketDebuggerUrl) throw new Error("Impossible d'ouvrir une page Chromium.");
  devtools = new DevTools(target.webSocketDebuggerUrl);
  await devtools.send("Page.enable");
  await devtools.send("Runtime.enable");
  await devtools.send("Emulation.setDeviceMetricsOverride", {
    width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false,
  });
  await devtools.send("Page.navigate", { url: baseUrl });
  await waitUntil(devtools, "document.readyState === 'complete' && !!document.getElementById('loginForm')", "chargement de la console");

  await devtools.evaluate("(() => { const form = document.getElementById('loginForm'); document.getElementById('authToken').value = " +
    JSON.stringify(token) + "; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); return true; })()");
  await waitUntil(devtools,
    "document.getElementById('authGate')?.style.display === 'none' && !!sessionStorage.getItem('leanna_ui_token')",
    "authentification (vérifie le jeton et le serveur UI)", 20000);
  await waitUntil(devtools, "document.getElementById('nAgents')?.textContent !== '—'", "chargement des données");
  await mkdir(outputDir, { recursive: true });

  const failures = [];
  for (const [id, filename] of pages) {
    try {
      await devtools.evaluate("(() => { const button = [...document.querySelectorAll('nav button')].find(item => item.getAttribute('onclick')?.includes(\"'" +
        id + "'\")); if (typeof page !== 'function' || !document.getElementById('" + id +
        "')) throw new Error('Page absente : " + id + "'); page('" + id + "', button); return true; })()");
      await delay(id === "resources" || id === "workspace" ? 1400 : 500);
      const result = await devtools.send("Page.captureScreenshot", {
        format: "png", fromSurface: true, captureBeyondViewport: true,
      });
      await writeFile(path.join(outputDir, filename + ".png"), Buffer.from(result.data, "base64"));
      console.log("OK  " + id + " -> " + filename + ".png");
    } catch (error) {
      failures.push({ id, error: error.message });
      console.error("ERR " + id + ": " + error.message);
    }
  }
  console.log("\nCaptures enregistrées dans : " + outputDir);
  console.log((pages.length - failures.length) + "/" + pages.length + " pages capturées.");
  if (failures.length) process.exitCode = 1;
} catch (error) {
  console.error("Capture impossible : " + error.message);
  process.exitCode = 1;
} finally {
  devtools?.close();
  if (browser && !browser.killed) browser.kill();
  if (profileDir) {
    await delay(300);
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}
