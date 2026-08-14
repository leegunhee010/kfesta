// KFESTA 로컬 관리 서버: 정적 서빙 + 관리자 저장 API + 굽기 실행
// node _tools/admin-server.mjs 5775
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');
const DATA = path.join(SITE, 'data', 'site.json');
const PORT = parseInt(process.argv[2] || '5775', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.cm': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

function json(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => { chunks.push(c); if (chunks.reduce((s, x) => s + x.length, 0) > 30e6) reject(new Error('too big')); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// 접수 데이터 저장 (data/applications.json·inquiries.json — .gitignore 대상)
async function loadList(name) {
  try { return JSON.parse(await fsp.readFile(path.join(SITE, 'data', name + '.json'), 'utf8')); }
  catch { return []; }
}
async function saveList(name, list) {
  await fsp.mkdir(path.join(SITE, 'data'), { recursive: true });
  await fsp.writeFile(path.join(SITE, 'data', name + '.json'), JSON.stringify(list, null, 2));
}

async function api(req, res, p) {
  // 로컬 전용 관리 API — 배포 환경(GitHub Pages)에는 존재하지 않음
  if (p === '/api/ping') return json(res, 200, { ok: true, mode: 'local' });

  // ── 폼 접수 (공개) ──
  if ((p === '/api/submit/apply' || p === '/api/submit/inquiry') && req.method === 'POST') {
    const name = p.endsWith('apply') ? 'applications' : 'inquiries';
    const body = JSON.parse((await readBody(req)).toString('utf8'));
    const list = await loadList(name);
    const row = { id: Date.now(), ...body, status: '신규', memo: '', created_at: new Date().toISOString() };
    list.unshift(row);
    await saveList(name, list);
    return json(res, 200, { ok: true, id: row.id });
  }

  // ── 접수 조회·수정 (관리자) ──
  if (p === '/api/apps' && req.method === 'GET') return json(res, 200, await loadList('applications'));
  if (p === '/api/inqs' && req.method === 'GET') return json(res, 200, await loadList('inquiries'));
  if ((p === '/api/apps' || p === '/api/inqs') && req.method === 'POST') {
    const name = p === '/api/apps' ? 'applications' : 'inquiries';
    const patch = JSON.parse((await readBody(req)).toString('utf8'));
    const list = await loadList(name);
    const row = list.find((r) => r.id === patch.id);
    if (!row) return json(res, 404, { ok: false, error: 'not found' });
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.memo !== undefined) row.memo = patch.memo;
    await saveList(name, list);
    return json(res, 200, { ok: true });
  }

  if (p === '/api/data' && req.method === 'GET') {
    const t = await fsp.readFile(DATA, 'utf8');
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    return res.end(t);
  }

  if (p === '/api/data' && req.method === 'POST') {
    const body = await readBody(req);
    JSON.parse(body.toString('utf8')); // 유효성 검증
    await fsp.mkdir(path.dirname(DATA), { recursive: true });
    await fsp.writeFile(DATA, body);
    return json(res, 200, { ok: true });
  }

  if (p === '/api/upload' && req.method === 'POST') {
    // 바디 = 바이너리, 파일명은 쿼리 ?name=
    const u = new URL(req.url, 'http://x');
    const raw = (u.searchParams.get('name') || 'file').replace(/[^\w.\-가-힣]/g, '_');
    const stamped = Date.now().toString(36) + '-' + raw;
    const dir = path.join(SITE, 'assets', 'img', 'uploads');
    await fsp.mkdir(dir, { recursive: true });
    const body = await readBody(req);
    await fsp.writeFile(path.join(dir, stamped), body);
    return json(res, 200, { ok: true, path: 'assets/img/uploads/' + stamped });
  }

  if (p === '/api/bake' && req.method === 'POST') {
    return new Promise((resolve) => {
      execFile('node', [path.join(__dirname, 'bake.mjs')], { cwd: SITE, timeout: 120000 }, (err, stdout, stderr) => {
        if (err) json(res, 500, { ok: false, log: String(stderr || err.message) });
        else json(res, 200, { ok: true, log: String(stdout) });
        resolve();
      });
    });
  }

  return json(res, 404, { ok: false, error: 'unknown api' });
}

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
  const p = req.url.split('?')[0];
  try {
    if (p.startsWith('/api/')) return await api(req, res, p);
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e.message || e) });
  }

  const file = await tryFiles(p);
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    return res.end('<h1>404</h1><p>' + p + '</p>');
  }
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const st = await fsp.stat(file);
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (isNaN(start) || start >= st.size) start = 0;
    if (isNaN(end) || end >= st.size) end = st.size - 1;
    res.writeHead(206, {
      'content-type': type, 'content-range': `bytes ${start}-${end}/${st.size}`,
      'accept-ranges': 'bytes', 'content-length': end - start + 1, 'cache-control': 'no-cache',
    });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('kfesta admin-server → http://localhost:' + PORT + '  (관리자: /admin/)'));
