#!/usr/bin/env node
/**
 * Vuelca el texto visible (o el resultado de un JS) de rutas de la instancia aislada.
 *   node dump-text.mjs ajustes clientes                 # sin "/" inicial (Git Bash lo convierte en ruta de Windows)
 *   node dump-text.mjs --clicks "Agregar Rol" roles-permisos
 *   node dump-text.mjs --eval "document.title" clientes
 */
import puppeteer from 'puppeteer-core';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const BASE = process.env.ISPMAX_URL ?? 'http://localhost:8080';
const USER = process.env.ISPMAX_USER ?? 'admin@manual.local';
const PASS = process.env.ISPMAX_PASS ?? 'DemoManual-2026!';
const EDGE = process.env.EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) process.exit(2);

const argv = process.argv.slice(2);
const clicks = [];
const routes = [];
let evalJs = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--clicks') clicks.push(argv[++i]);
  else if (argv[i] === '--eval') evalJs = argv[++i];
  else routes.push(argv[i]);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PROFILE = path.join(os.tmpdir(), `ispmax-dump-${process.pid}`);
const PORT = 9800 + (process.pid % 150);
spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore', detached: true, windowsHide: true }).unref();
let browser;
for (let i = 0; i < 40 && !browser; i++) {
  await sleep(500);
  try { browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${PORT}`, defaultViewport: { width: 1440, height: 900 } }); } catch {}
}
const page = await browser.newPage();
page.setDefaultTimeout(60000);
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await page.type('input[type=email]', USER);
await page.type('input[type=password]', PASS);
await page.keyboard.press('Enter');
await page.waitForFunction(() => !location.pathname.startsWith('/login'));
await sleep(1500);
for (const r of routes) {
  await page.goto(`${BASE}/${r.split('/').filter(Boolean).join('/')}`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  for (const c of clicks) {
    await page.evaluate(t => {
      const el = [...document.querySelectorAll('button,a,.q-item,.q-btn,[role=button],[role=tab]')].find(e => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase().includes(t.toLowerCase()));
      el?.click();
    }, c);
    await sleep(1200);
  }
  const out = evalJs
    ? JSON.stringify(await page.evaluate(evalJs), null, 1)
    : await page.evaluate(() => document.body.innerText.replace(/\n{3,}/g, '\n\n'));
  console.log(`\n=== ${r} ===\n${out}`);
}
try { await browser.close(); } catch {}
