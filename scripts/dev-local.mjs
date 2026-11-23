import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const site = resolve(root, 'site');
const functions = resolve(root, 'netlify/functions');

function loadDotEnv(source) {
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const split = line.indexOf('=');
    if (split < 1) continue;
    const key = line.slice(0, split).trim();
    let value = line.slice(split + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

try { loadDotEnv(await readFile(resolve(root, '.env'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!process.env.APP_BASE_URL) process.env.APP_BASE_URL = 'http://localhost:8888';

await import('./build-app.mjs');

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon' };
const handlers = new Map();

function functionFor(pathname) {
  if (pathname === '/mcp/v1') return 'mcp';
  if (pathname === '/.well-known/oauth-authorization-server') return 'oauth-metadata';
  if (pathname === '/.well-known/oauth-protected-resource') return 'oauth-resource';
  if (pathname.startsWith('/api/')) return pathname.slice('/api/'.length);
  if (pathname.startsWith('/oauth/')) return `oauth-${pathname.slice('/oauth/'.length)}`;
  if (pathname.startsWith('/.netlify/functions/')) return pathname.slice('/.netlify/functions/'.length);
  return null;
}

async function serveFunction(name, req, res, targetUrl) {
  if (!/^[a-z0-9-]+$/.test(name)) return false;
  let handler = handlers.get(name);
  if (!handler) {
    try {
      const module = await import(pathToFileURL(resolve(functions, `${name}.js`)).href);
      handler = module.default;
      if (typeof handler !== 'function') return false;
      handlers.set(name, handler);
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND') return false;
      throw error;
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const method = req.method || 'GET';
  const request = new Request(targetUrl, { method, headers: req.headers, ...(!['GET', 'HEAD'].includes(method) && chunks.length ? { body: Buffer.concat(chunks) } : {}) });
  const response = await handler(request);
  res.statusCode = response.status;
  for (const [key, value] of response.headers) res.setHeader(key, value);
  res.end(method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
  return true;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost:8888'}`);
  try {
    const functionName = functionFor(url.pathname);
    if (functionName) {
      if (await serveFunction(functionName, req, res, url)) return;
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Function not found.' }));
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
      res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
    }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    if (pathname === '/dashboard' || pathname === '/dashboard/') pathname = '/dashboard.html';
    const target = resolve(site, `.${pathname}`);
    if (target !== site && !target.startsWith(`${site}${sep}`)) { res.writeHead(400); res.end(); return; }
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    if (error.code === 'ENOENT') { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 Not Found'); return; }
    console.error('Local request failed:', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Local server error.' }));
  }
});

const port = Number(process.env.PORT || 8888);
server.listen(port, '127.0.0.1', () => console.log(`Overworld local server ready at http://localhost:${port}`));
