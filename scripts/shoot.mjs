import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const OUT = '.shots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pg = await ctx.newPage();
pg.on('pageerror', (e) => console.log('PAGE EXCEPTION:', e.message));
await pg.goto(`${BASE}/login`);
await pg.fill('input[type=email]', 'castellan@vorhast.dev');
await pg.fill('input[type=password]', 'cogitator');
await Promise.all([
	pg.waitForResponse((r) => r.url().includes('/api/auth') && r.request().method() === 'POST').catch(() => null),
	pg.click('button[type=submit]')
]);
await pg.waitForTimeout(1500);
await pg.goto(`${BASE}/campaigns/vorhast`);
await pg.waitForTimeout(2500);
await pg.screenshot({ path: `${OUT}/01-map-tilt.png` });
await pg.click('button:has-text("Top-down")');
await pg.waitForTimeout(1400);
await pg.screenshot({ path: `${OUT}/02-map-flat.png` });
await browser.close();
console.log('done');
