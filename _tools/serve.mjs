// kfesta 새 사이트 정적 서버
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');
const PORT = parseInt(process.argv[2] || '5775', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

async function tryFiles(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const safe = path.normalize(clean).replace(/^(\.\.[\\/])+/, '');
  const base = path.join(SITE, safe);
  const cands = [base, base + '.html', path.join(base, 'index.html')];
  for (const c of cands) {
    if (!c.startsWith(SITE)) continue;
    try { const st = await fsp.stat(c); if (st.isFile()) return c; } catch {}
  }
  return null;
}

http.createServer(async (req, res) => {
  const file = await tryFiles(req.url || '/');
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p><a href="/">홈</a></p>');
    return;
  }
  const st = await fsp.stat(file);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;
  // 영상 재생·루프에 필요한 Range 응답 (GitHub Pages는 기본 지원)
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (isNaN(start) || start >= st.size) start = 0;
    if (isNaN(end) || end >= st.size) end = st.size - 1;
    res.writeHead(206, {
      'content-type': type,
      'content-range': `bytes ${start}-${end}/${st.size}`,
      'accept-ranges': 'bytes',
      'content-length': end - start + 1,
      'cache-control': 'no-cache',
    });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, {
    'content-type': type,
    'content-length': st.size,
    'accept-ranges': 'bytes',
    'cache-control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('kfesta  →  http://localhost:' + PORT + '/'));
