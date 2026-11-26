#!/usr/bin/env node
/**
 * Capturas reproducibles de la UI de ISPMAX para el manual.
 *
 *   node capture.mjs                    # todas las capturas del manifiesto
 *   node capture.mjs --only clientes/   # solo las cuyo id empiece por "clientes/"
 *   node capture.mjs --list             # lista los ids
 *   node capture.mjs --manifest otro.json   # usa otro manifiesto (por defecto manifest.json)
 *
 * Requiere la instancia aislada en marcha (frontend :8080, backend :3004; ver notes/entorno.md).
 * Salida: ../../assets/imgs/<id>.webp  (el id lleva carpeta: "clientes/crear/01-formulario").
 *
 * Variables:
 *   ISPMAX_URL         base del frontend           (def. http://localhost:8080)
 *   ISPMAX_USER/PASS   cuenta de pruebas           (def. admin@manual.local / DemoManual-2026!)
 *   EDGE_PATH          ejecutable de Edge/Chrome/Brave (def. Edge; en macOS p. ej. "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser")
 */
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '..', 'assets', 'imgs');
const BASE = process.env.ISPMAX_URL ?? 'http://localhost:8080';
const USER = process.env.ISPMAX_USER ?? 'admin@manual.local';
const PASS = process.env.ISPMAX_PASS ?? 'DemoManual-2026!';
const EDGE =
  process.env.EDGE_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    : process.platform === 'darwin'
      ? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
      : 'google-chrome');

// Solo instancias locales: nunca capturar un entorno real por accidente.
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`Rechazado: ISPMAX_URL debe ser localhost (recibido: ${BASE}).`);
  process.exit(2);
}

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const manifestFile = path.resolve(HERE, args.includes('--manifest') ? args[args.indexOf('--manifest') + 1] : 'manifest.json');
const shots = JSON.parse(readFileSync(manifestFile, 'utf8')).filter(s => !only || s.id.startsWith(only));

if (args.includes('--list')) {
  shots.forEach(s => console.log(s.id));
  process.exit(0);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
// `{{EXP15}}` en una ruta: marca de tiempo (ms) de dentro de 14:40, para el contador de /restablecer-password.
const sub = r => r.replace('{{EXP15}}', String(Date.now() + 14 * 60000 + 40000));

/** Devuelve un handle al primer elemento visible cuyo texto contiene `text` (opcional: dentro de `within`). */
async function byText(page, text, { tag = '*', within, exact = false } = {}) {
  const h = await page.evaluateHandle(
    (text, tag, within, exact) => {
      const root = within ? document.querySelector(within) ?? document : document;
      const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
      const t = norm(text);
      const els = [...root.querySelectorAll(tag)].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (exact ? norm(el.textContent ?? '') === t : norm(el.textContent ?? '').includes(t));
      });
      // el más específico: el que no tiene hijos que también contengan el texto
      const leafs = els.filter(el => ![...el.children].some(c => els.includes(c)));
      return leafs[0] ?? null;
    },
    text,
    tag,
    within,
    exact,
  );
  const el = h.asElement();
  if (!el) throw new Error(`No se encontró elemento con texto "${text}"`);
  return el;
}

async function resolve(page, sel) {
  if (sel.css) {
    const all = await page.$$(sel.css);
    const el = all[sel.index ?? 0];
    if (!el) throw new Error(`No existe el selector ${sel.css}[${sel.index ?? 0}]`);
    return el;
  }
  if (sel.text) return byText(page, sel.text, { tag: sel.tag ?? '*', within: sel.within, exact: sel.exact === true });
  throw new Error(`Selector inválido: ${JSON.stringify(sel)}`);
}

async function annotate(page, marks) {
  const boxes = [];
  for (const m of marks) {
    const el = await resolve(page, m);
    const box = await el.boundingBox();
    if (!box) throw new Error(`Sin caja para la anotación ${m.n}`);
    boxes.push({ n: m.n, ...box, outline: m.outline !== false });
  }
  await page.evaluate(boxes => {
    for (const b of boxes) {
      if (b.outline) {
        const o = document.createElement('div');
        o.className = '__ispmax_ann';
        o.style.cssText = `position:fixed;left:${b.x - 3}px;top:${b.y - 3}px;width:${b.width + 6}px;height:${b.height + 6}px;
          border:2px solid #ff7a1a;border-radius:6px;z-index:2147483646;pointer-events:none;box-shadow:0 0 0 2px rgba(255,255,255,.7)`;
        document.body.appendChild(o);
      }
      const n = document.createElement('div');
      n.className = '__ispmax_ann';
      n.textContent = String(b.n);
      n.style.cssText = `position:fixed;left:${Math.max(2, b.x - 32)}px;top:${b.y + b.height / 2 - 12}px;width:24px;height:24px;border-radius:50%;
        background:#ff7a1a;color:#fff;font:700 14px/24px Arial,sans-serif;text-align:center;z-index:2147483647;
        pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.45)`;
      document.body.appendChild(n);
    }
  }, boxes);
}

// Edge arranca un proceso "lanzador" que termina enseguida y deja el navegador vivo, así que
// `puppeteer.launch` lo da por fallido: lo lanzamos nosotros y nos conectamos por el puerto de depuración.
const PROFILE = path.join(os.tmpdir(), `ispmax-capture-${process.pid}`);
const PORT = 9300 + (process.pid % 500);
// `webgl: true` en cualquier captura del manifiesto (o CAPTURE_WEBGL=1): WebGL por software (SwiftShader) para pantallas
// con mapa (Mapbox GL). Sin eso, el navegador headless no tiene WebGL y el mapa no se dibuja.
const WEBGL = process.env.CAPTURE_WEBGL === '1' || shots.some(s => s.webgl);
spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--lang=es-EC',
  '--force-color-profile=srgb', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  ...(WEBGL ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : []),
  'about:blank',
], { stdio: 'ignore', detached: true, windowsHide: true }).unref();

let browser;
for (let i = 0; i < 40 && !browser; i++) {
  await sleep(500);
  try {
    browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${PORT}`, defaultViewport: null });
  } catch {}
}
if (!browser) {
  console.error('No se pudo conectar con Edge (puerto de depuración).');
  process.exit(3);
}

const page = await browser.newPage();
await page.emulateTimezone('America/Guayaquil');
page.setDefaultTimeout(60000);

// Inicio de sesión (una vez)
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await page.waitForSelector('input[type=email]');
await page.type('input[type=email]', USER);
await page.type('input[type=password]', PASS);
await page.keyboard.press('Enter');
await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 60000 });
await sleep(1500);

let ok = 0;
const failed = [];
for (const s of shots) {
  let onMock;
  try {
    await page.setViewport({ width: s.width ?? 1440, height: s.height ?? 900, deviceScaleFactor: 1 });
    // `mock`: [{ url: "fragmento de la URL", json: {...} }] responde esa llamada de la API con datos ficticios
    // (para pantallas que dependen de un servicio externo que la instancia aislada no tiene).
    // `mockFile`: ruta (relativa a tools/capture) de un JSON con una lista de entradas `mock` compartidas entre capturas.
    if (s.mockFile) s.mock = [...(s.mock ?? []), ...JSON.parse(readFileSync(path.resolve(HERE, s.mockFile), 'utf8'))];
    if (s.mock?.length) {
      await page.setRequestInterception(true);
      // Opcionales por entrada (retrocompatibles): `method` ("POST"…), `exact: true` (la ruta, sin la consulta,
      // debe terminar en `url`; evita que "/smart-olt" atrape "/smart-olt/zonas") y `status` (def. 200).
      onMock = req => {
        const m = s.mock.find(x => {
          if (x.method && x.method.toUpperCase() !== req.method()) return false;
          if (x.exact) return req.url().split('?')[0].endsWith(x.url);
          return req.url().includes(x.url);
        });
        if (!m) return req.continue();
        // Más opciones (retrocompatibles): `abort: true` corta la petición; `body` (texto) o `bodyFile` (ruta relativa a
        // tools/capture) con `contentType` responden sin JSON; `replace: [[de, a], …]` pide la respuesta real y le cambia
        // texto (p. ej. para dar un token de Mapbox ficticio al módulo del mapa); `json` sigue funcionando igual.
        if (m.abort) return req.abort();
        // `cors: true`: añade las cabeceras CORS (para servicios de otro origen, como api.mapbox.com).
        const headers = m.cors ? { 'access-control-allow-origin': req.headers().origin ?? '*', 'access-control-allow-credentials': 'true' } : undefined;
        if (m.replace) {
          return fetch(req.url())
            .then(r => r.text())
            .then(t => req.respond({ status: 200, headers, contentType: m.contentType ?? 'text/javascript', body: m.replace.reduce((a, [de, a2]) => a.split(de).join(a2), t) }))
            .catch(() => req.continue());
        }
        // `seq: [json, …]`: respuestas distintas, una por llamada y en orden (da vida a lo que se consulta cada pocos segundos).
        if (m.seq?.length) {
          m._n ??= 0;
          return req.respond({ status: m.status ?? 200, headers, contentType: 'application/json', body: JSON.stringify(m.seq[m._n++ % m.seq.length]) });
        }
        const raw = m.bodyFile ? readFileSync(path.resolve(HERE, m.bodyFile)) : m.body;
        if (raw !== undefined) return req.respond({ status: m.status ?? 200, headers, contentType: m.contentType ?? 'text/plain', body: raw });
        req.respond({ status: m.status ?? 200, headers, contentType: 'application/json', body: JSON.stringify(m.json) });
      };
      page.on('request', onMock);
    }
    if (s.route) await page.goto(`${BASE}${sub(s.route)}`, { waitUntil: 'networkidle2' });
    if (s.waitFor) {
      // El servidor de desarrollo de Vite a veces deja la pantalla en blanco la primera vez (reoptimiza
      // dependencias): se recarga una vez antes de dar el selector por perdido.
      try {
        await page.waitForSelector(s.waitFor, { timeout: 15000 });
      } catch {
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForSelector(s.waitFor);
      }
    }
    await page.evaluate(() => document.fonts?.ready);
    await sleep(s.settle ?? 1200);

    for (const step of s.steps ?? []) {
      if (step.click) await (await resolve(page, step.click)).click();
      else if (step.type) {
        const el = await resolve(page, step.type);
        await el.click({ clickCount: 3 });
        await el.type(step.value ?? '');
      } else if (step.upload) await (await resolve(page, step.upload)).uploadFile(step.file);
      else if (step.hover) await (await resolve(page, step.hover)).hover();
      else if (step.key) await page.keyboard.press(step.key);
      else if (step.scroll) await page.evaluate(y => window.scrollTo(0, y), step.scroll);
      // `eval`: ejecuta JS en la página. `mouse`: clic en un punto de la pantalla; el punto es { x, y } o una expresión
      // JS (`eval`) que devuelve { x, y } (p. ej. para pulsar sobre un elemento dibujado en un canvas); `count: 2` = doble clic.
      else if (step.eval) await page.evaluate(code => (0, eval)(code), step.eval);
      else if (step.mouse) {
        const pt = step.mouse.eval ? await page.evaluate(code => (0, eval)(code), step.mouse.eval) : step.mouse;
        await page.mouse.move(pt.x, pt.y, { steps: 3 });
        await page.mouse.click(pt.x, pt.y, { clickCount: step.mouse.count ?? 1 });
      }
      else if (step.goto) await page.goto(`${BASE}${sub(step.goto)}`, { waitUntil: 'networkidle2' });
      await sleep(step.wait ?? 600);
    }

    for (const sel of s.hide ?? []) {
      await page.evaluate(css => document.querySelectorAll(css).forEach(e => (e.style.visibility = 'hidden')), sel);
    }
    if (s.annotate?.length) await annotate(page, s.annotate);

    let clip;
    if (s.clip?.css || s.clip?.text) {
      const el = await resolve(page, s.clip);
      clip = await el.boundingBox();
      const pad = s.clip.pad ?? 8;
      clip = { x: Math.max(0, clip.x - pad), y: Math.max(0, clip.y - pad), width: clip.width + pad * 2, height: clip.height + pad * 2 };
    } else if (s.clip) clip = s.clip;

    // `captureBeyondViewport: false` en el manifiesto: los gráficos de canvas (ECharts) salen en blanco con el valor por defecto (true).
    const png = await page.screenshot({ clip, fullPage: s.fullPage === true && !clip, type: 'png', captureBeyondViewport: s.captureBeyondViewport !== false });
    const file = path.join(OUT, `${s.id}.webp`);
    mkdirSync(path.dirname(file), { recursive: true });
    await sharp(png).resize({ width: s.maxWidth ?? 1600, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(file);
    await page.evaluate(() => document.querySelectorAll('.__ispmax_ann').forEach(e => e.remove()));
    if (onMock) {
      page.off('request', onMock);
      await page.setRequestInterception(false);
    }
    console.log(`✓ ${s.id}`);
    ok++;
  } catch (err) {
    if (onMock) {
      page.off('request', onMock);
      await page.setRequestInterception(false).catch(() => {});
    }
    console.log(`✗ ${s.id} — ${err.message}`);
    failed.push(s.id);
  }
}

try { await browser.close(); } catch {}
try {
  // Cierra cualquier proceso del navegador que siga usando nuestro perfil temporal.
  if (process.platform === 'win32')
    execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='msedge.exe'\\" | Where-Object { $_.CommandLine -like '*ispmax-capture-${process.pid}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"`, { stdio: 'ignore' });
  else execSync(`pkill -f ispmax-capture-${process.pid} || true`, { stdio: 'ignore' });
} catch {}
try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
console.log(`\n${ok}/${shots.length} capturas generadas${failed.length ? `; fallaron: ${failed.join(', ')}` : ''}.`);
process.exit(failed.length ? 1 : 0);
