// 성능 패치: ①아래폴드 CSS 배경이미지 → data-bg 지연 로드 ②폰트 CSS 비동기화
// node _tools/patch-perf.js
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

  // 1) 히어로(첫 화면)가 아닌 배경이미지를 data-bg로 전환
  //    <div|section class="..." style="background-image:url('X')"> 꼴만 대상,
  //    class에 hero가 들어간 요소(home-hero/page-hero)는 즉시 로드 유지
  h = h.replace(
    /class="([^"]*)" style="background-image:url\('([^']+)'\)"/g,
    (m, cls, url) => /hero/.test(cls) ? m : `class="${cls}" data-bg="${url}"`
  );

  // 2) jsdelivr 폰트 CSS 비동기화 (렌더 차단 해제, 시스템폰트 → Pretendard 스왑)
  h = h.replace(
    /<link rel="stylesheet" href="(https:\/\/cdn\.jsdelivr\.net[^"]+)">/,
    `<link rel="stylesheet" href="$1" media="print" onload="this.media='all'">\n<noscript><link rel="stylesheet" href="$1"></noscript>`
  );

  if (h !== before) {
    fs.writeFileSync(f, h);
    const n = (before.match(/style="background-image/g) || []).length - (h.match(/style="background-image/g) || []).length;
    console.log('patched', rel, `(bg지연 ${n}개)`);
  } else {
    console.log('skip   ', rel);
  }
}
