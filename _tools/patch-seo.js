// 라이트하우스 감점 일괄 수리: preconnect + <main> 랜드마크
// node _tools/patch-seo.js
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const PAGES = [
  'index.html', 'INFO/index.html', 'BEAUTY/index.html', 'MARKET/index.html',
  '33/index.html', 'projects/index.html', 'projects/export2026/index.html',
];

for (const rel of PAGES) {
  const f = path.join(ROOT, rel);
  let h = fs.readFileSync(f, 'utf8');
  const before = h;

  // 1) jsdelivr preconnect (폰트 CSS 로딩 가속)
  if (!h.includes('rel="preconnect" href="https://cdn.jsdelivr.net"')) {
    h = h.replace(
      /<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net/,
      '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>\n<link rel="stylesheet" href="https://cdn.jsdelivr.net'
    );
  }

  // 2) <main> 랜드마크: 헤더 닫힌 직후 ~ 푸터 직전
  if (!h.includes('<main>')) {
    h = h.replace('</header>', '</header>\n\n<main>');
    h = h.replace('<footer class="ft">', '</main>\n\n<footer class="ft">');
  }

  if (h !== before) {
    fs.writeFileSync(f, h);
    console.log('patched', rel);
  } else {
    console.log('skip   ', rel);
  }
}
