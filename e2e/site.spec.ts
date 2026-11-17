import { test, expect } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

const root = path.resolve(__dirname, '..');
const types: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
let server: http.Server;
let base = '';

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/html' }).end(fs.readFileSync(path.join(root, '404.html')));
      return;
    }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.afterAll(() => server.close());

const PAGES = ['/', '/aws/iam-policy/'];

test('the policy on the page is aws/iam-policy.json, word for word', async ({ page }) => {
  await page.goto(`${base}/aws/iam-policy/`);
  const shown = JSON.parse((await page.locator('#policy-json').textContent()) ?? '');
  const file = JSON.parse(fs.readFileSync(path.join(root, 'aws/iam-policy.json'), 'utf8'));
  expect(shown).toEqual(file);
  // Every action in the policy has a row in the table that explains it.
  const actions: string[] = file.Statement.flatMap((s: { Action: string[] }) => s.Action);
  for (const action of actions) {
    await expect(page.locator('table td code', { hasText: action }).first()).toBeVisible();
  }
  expect(await page.locator('table tbody tr').count()).toBe(actions.length);
});

test('the policy JSON downloads from the site', async ({ request }) => {
  const res = await request.get(`${base}/aws/iam-policy.json`);
  expect(res.ok()).toBe(true);
  expect((await res.json()).Version).toBe('2012-10-17');
});

test('the docs home links to the AWS policy page', async ({ page }) => {
  await page.goto(`${base}/`);
  await page.getByRole('link', { name: /IAM policy for the AWS integration/ }).click();
  await expect(page).toHaveURL(/\/aws\/iam-policy\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IAM policy for the AWS integration');
});

test('pages never link to the private product repo', async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(`${base}${p}`);
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    for (const href of hrefs) expect(href).not.toContain('github.com/duskora-ai/duskora');
  }
});

test('internal links resolve', async ({ page, request }) => {
  for (const p of PAGES) {
    await page.goto(`${base}${p}`);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    for (const href of hrefs) {
      const res = await request.get(`${base}${href}`);
      expect(res.status(), href).toBe(200);
    }
  }
});

test('every page is in the sitemap', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const p of PAGES) expect(sitemap).toContain(`<loc>https://docs.duskora.ai${p}</loc>`);
});

test('pages fit a phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const p of PAGES) {
    await page.goto(`${base}${p}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, p).toBeLessThanOrEqual(0);
  }
});
