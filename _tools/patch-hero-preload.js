// 서브페이지 히어로 배경 preload 주입 (LCP 가속)
// node _tools/patch-hero-preload.js
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PAGES = [
  'INFO/index.html', 'BEAUTY/index.html', 'MARKET/index.html',
  '33/index.html', 'projects/index.html', 'projects/export2026/index.html',
];

for (const rel of PAGES) {
  const f = path.join(ROOT, rel);
  let h = fs.readFileSync(f, 'utf8');
  if (h.includes('rel="preload" as="image"')) { console.log('skip   ', rel); continue; }
  // page-hero의 배경 이미지 URL 추출
  const m = h.match(/class="page-hero" style="background-image:url\('([^']+)'\)"/);
  if (!m) { console.log('no-hero', rel); continue; }
  h = h.replace(
    /<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net" crossorigin>/,
    `<link rel="preload" as="image" href="${m[1]}">\n<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>`
  );
  fs.writeFileSync(f, h);
  console.log('patched', rel, '->', m[1].split('/').pop());
}
