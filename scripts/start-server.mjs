import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from 'serve-handler';
import { issueFirebaseCustomToken } from './firebase-token-bridge.mjs';

const port = Number(process.env.PORT || 3000);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  const biAppUrl = process.env.BI_APP_URL || 'https://bi.ugurgurses.com.tr';
  if (
    url.pathname === '/Birimistatistic' ||
    url.pathname === '/Birimistatistic/' ||
    url.pathname === '/Birimistatistic/index.html' ||
    url.pathname.startsWith('/Birimistatistic/dist')
  ) {
    const suffix = url.pathname.startsWith('/Birimistatistic/dist')
      ? url.pathname.replace(/^\/Birimistatistic\/dist/, '') || '/'
      : '/';
    // index.html → kök (temiz URL)
    let target = biAppUrl.replace(/\/$/, '') + (suffix.startsWith('/') ? suffix : `/${suffix}`);
    if (target.endsWith('/index.html')) target = target.replace(/\/index\.html$/, '/') || `${biAppUrl.replace(/\/$/, '')}/`;
    // 302: eski 301 önbelleği (birimistatistic-production…) tarayıcıda kalmasın
    res.statusCode = 302;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', target);
    res.end();
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/firebase-custom-token') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (process.env.FIREBASE_BRIDGE_ENABLED === 'false') {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'Firebase köprüsü geçici olarak kapalı' }));
      return;
    }
    try {
      const body = await readJsonBody(req);
      const result = await issueFirebaseCustomToken(body.accessToken);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (e) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Token üretilemedi' }));
    }
    return;
  }

  await handler(req, res, {
    public: root,
    // Match `serve` CLI defaults: resolve index.html for directories, hide listings.
    cleanUrls: true,
    directoryListing: false,
    trailingSlash: false
  });
});

server.listen(port, () => {
  console.log(`Serving ${root} on port ${port}`);
});
