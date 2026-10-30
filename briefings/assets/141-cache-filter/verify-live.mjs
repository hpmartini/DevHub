/* global URL, console, process, fetch */
// AC-3/4/5 check against the running worktree build (vite :3177 -> real backend :3099).
// Picks a real cache, freezes the browser clock 11 min before it expires, then advances it.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3177';
const OUT = process.argv[2];
const WARN = 10 * 60_000;
const { contexts } = await (await fetch('http://localhost:3099/api/agents/context')).json();
const { sessions } = await (await fetch('http://localhost:3099/api/agents')).json();
const ids = new Set(sessions.map((s) => s.id));
const caches = Object.entries(contexts)
  .filter(([id, c]) => ids.has(id) && c?.cache)
  .map(([id, c]) => ({ id, expiry: c.cache.lastActivityAt + c.cache.ttlMs }));
const expected = (now) =>
  caches.filter((c) => c.expiry - now > 0 && c.expiry - now <= WARN).length;
const target = caches.sort((a, b) => b.expiry - a.expiry)[0];
const t0 = target.expiry - 11 * 60_000;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
// read-only run: view all agents (context "Alle") without switching Hape's live context,
// and block every write to the real backend
await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (req.method() !== 'GET') return route.abort();
  if (new URL(req.url()).pathname === '/api/contexts') {
    const res = await route.fetch();
    return route.fulfill({ response: res, json: { ...(await res.json()), activeContextId: 'all' } });
  }
  return route.continue();
});
await page.clock.install({ time: t0 });
await page.goto(`${BASE}/#/agents`);
const header = page.getByRole('button', { name: /^\d+ cache expiring$/ });
await header.waitFor({ timeout: 30_000 });
// let contexts load (polled), then read
await page.clock.runFor(3_000);
await page.waitForTimeout(1500);
const count = async () => Number((await header.textContent()).split(' ')[0]);
const results = [];
const check = async (label, now) => {
  const got = await count();
  results.push({ label, got, expected: expected(now), ok: got === expected(now) });
};
await check('t0 = expiry-11min', t0);

// AC-5: 2 min later the target enters the window without new data
await page.clock.runFor(2 * 60_000);
await page.waitForTimeout(500);
await check('t0+2min', t0 + 2 * 60_000);

// AC-3: header click filters the list
await header.click();
const pressed = await header.getAttribute('aria-pressed');
results.push({ label: 'header aria-pressed after click', got: pressed, ok: pressed === 'true' });
const chip = page.getByRole('button', { name: /^Cache expiring \d+$/ });
const chipPressed = await chip.getAttribute('aria-pressed');
results.push({ label: 'chip pressed in sync', got: chipPressed, ok: chipPressed === 'true' });
const shown = await page.getByText(/^\d+ of \d+$/).first().textContent();
results.push({ label: 'list shows "N of M"', got: shown, ok: shown.startsWith(`${await count()} of`) });
await page.screenshot({ path: `${OUT}/header-filter-active.png`, clip: { x: 0, y: 0, width: 1500, height: 420 } });

// AC-4: chip toggles the same filter off
await chip.click();
results.push({ label: 'header unpressed after chip click', got: await header.getAttribute('aria-pressed'), ok: (await header.getAttribute('aria-pressed')) === 'false' });

// AC-4: palette command
await page.keyboard.press('Meta+p');
await page.getByRole('listbox', { name: 'Commands' }).waitFor({ timeout: 5000 });
await page.keyboard.type('filter cache expiring');
const first = page.getByRole('listbox', { name: 'Commands' }).getByRole('option').first();
const firstText = (await first.textContent()).trim();
await page.screenshot({ path: `${OUT}/palette.png` });
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const afterPalette = await header.getAttribute('aria-pressed');
results.push({ label: 'palette: top hit is "Add filter: Cache expiring", Enter sets filter', got: { firstText, afterPalette }, ok: firstText.startsWith('Add filter: Cache expiring') && afterPalette === 'true' });
await page.screenshot({ path: `${OUT}/after-palette.png`, clip: { x: 0, y: 0, width: 1500, height: 420 } });

// AC-5: 12 min later the target has expired and leaves the count
await page.clock.runFor(12 * 60_000);
await page.waitForTimeout(500);
await check('t0+14min (target expired)', t0 + 14 * 60_000);

console.log(JSON.stringify({ target: target.id, t0: new Date(t0).toISOString(), results }, null, 2));
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
