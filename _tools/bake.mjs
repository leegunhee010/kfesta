// KFESTA 굽기: data/site.json → 정적 HTML 반영
// node _tools/bake.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'site.json'), 'utf8'));
const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(SITE, f)), { recursive: true }); fs.writeFileSync(path.join(SITE, f), s); };
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let changed = 0;

// ── 1) 카피 (data-ck 마커) ──────────────────────────
const byFile = {};
for (const [key, c] of Object.entries(data.copy || {})) {
  (byFile[c.file] = byFile[c.file] || []).push({ key, ...c });
}
for (const [file, items] of Object.entries(byFile)) {
  let h = read(file);
  const before = h;
  for (const c of items) {
    const re = new RegExp('(<' + c.tag + '[^>]* data-ck="' + escRe(c.key) + '"[^>]*>)[\\s\\S]*?(</' + c.tag + '>)');
    if (!re.test(h)) { console.log('⚠️ 마커 없음:', c.key, file); continue; }
    h = h.replace(re, '$1' + c.value + '$2');
  }
  if (h !== before) { write(file, h); changed++; }
  console.log('카피:', file, items.length + '개');
}

// ── 2) SEO (title·description·og) ───────────────────
for (const [file, s] of Object.entries(data.seo || {})) {
  let h;
  try { h = read(file); } catch { continue; }
  const before = h;
  h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>' + s.title + '</title>');
  h = h.replace(/(<meta name="description" content=")[^"]*(")/, '$1' + escAttr(s.description) + '$2');
  h = h.replace(/(<meta property="og:title" content=")[^"]*(")/, '$1' + escAttr(s.title) + '$2');
  h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, '$1' + escAttr(s.description) + '$2');
  if (h !== before) { write(file, h); changed++; }
}
console.log('SEO:', Object.keys(data.seo || {}).length, '페이지');

// ── 3) 홈 FAQ (화면 + JSON-LD 동기화) ────────────────
if ((data.faq_home || []).length) {
  let h = read('index.html');
  const faqHtml = data.faq_home.map((f) =>
    '      <details>\n        <summary>' + f.q + '</summary>\n        <p>' + f.a + '</p>\n      </details>'
  ).join('\n');
  h = h.replace(/(<div class="faq">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/,
    '$1\n' + faqHtml + '\n    $2');
  // JSON-LD의 FAQPage 교체
  const ldm = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (ldm) {
    const ld = JSON.parse(ldm[1]);
    const strip = (s) => s.replace(/<[^>]+>/g, '');
    const faqNode = {
      '@type': 'FAQPage',
      mainEntity: data.faq_home.map((f) => ({
        '@type': 'Question', name: strip(f.q),
        acceptedAnswer: { '@type': 'Answer', text: strip(f.a) },
      })),
    };
    if (ld['@graph']) {
      const i = ld['@graph'].findIndex((n) => n['@type'] === 'FAQPage');
      if (i >= 0) ld['@graph'][i] = faqNode; else ld['@graph'].push(faqNode);
    }
    h = h.replace(ldm[0], '<script type="application/ld+json">\n' + JSON.stringify(ld, null, 2) + '\n</script>');
  }
  write('index.html', h); changed++;
  console.log('FAQ:', data.faq_home.length, '문항 (화면+스키마)');
}

// ── 4) 프로젝트 허브 카드 (게시판형 items) ────────────
const items = (data.projects?.items || []).filter((it) => it.hidden !== true);
if (items.length) {
  let h = read('projects/index.html');
  const cards = items.map((c) => {
    const href = c.type === 'link' ? c.href : c.slug + '/';
    const thumb = c.type === 'link' ? '../' + c.thumb : '../' + c.thumb;
    const style = c.thumb_mode === 'logo'
      ? ' style="background-size:62%;background-color:#F6F6F8;background-repeat:no-repeat;background-position:center"' : '';
    const badgeCls = c.badge === '종료' ? 'badge done' : 'badge';
    return '      <a class="prj-card" href="' + href + '">\n' +
      '        <div class="ph" data-bg="' + thumb + '"' + style + '></div>\n' +
      '        <div class="tx">\n' +
      '          <span class="' + badgeCls + '">' + c.badge + '</span>\n' +
      '          <h3>' + c.title + '</h3>\n' +
      '          <div class="meta">' + c.meta + '</div>\n' +
      '          <p class="desc">' + c.desc + '</p>\n' +
      '        </div>\n      </a>';
  }).join('\n\n');
  h = h.replace(/(<div class="prj-grid">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/,
    '$1\n' + cards + '\n    $2');
  write('projects/index.html', h); changed++;
  console.log('허브 카드:', items.length, '장');
}

// ── 5) 템플릿형 프로젝트 페이지 재생성 ────────────────
const TPL = (slug, d) => {
  const rel = (p) => '../../' + p;
  const desc = (d.lead || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const rows = d.rows.map((r) => '        <tr><th>' + r.k + '</th><td>' + r.v + '</td></tr>').join('\n');
  let gallery = '';
  if (d.wide || (d.photos || []).length) {
    const parts = ['\n<!-- 현장 -->\n<section class="sec" style="padding-top:0">\n  <div class="article">\n    <div class="tc">\n      <div class="sec-kicker">On-site</div>\n      <h2 class="sec-title">현장</h2>\n    </div>'];
    if (d.wide) parts.push('    <div class="photo" style="margin-top:30px"><img src="' + rel(d.wide) + '" alt="현장" loading="lazy"></div>');
    if ((d.photos || []).length) {
      const cols = d.photos.length === 3 ? ';grid-template-columns:repeat(3,1fr)' : '';
      parts.push('    <div class="photo-grid" style="margin-top:24px' + cols + '">\n' +
        d.photos.map((p) => '      <div class="pgi" style="aspect-ratio:6/5" data-bg="' + rel(p.src) + '" role="img" aria-label="' + escAttr(p.alt || '') + '"></div>').join('\n') +
        '\n    </div>');
    }
    parts.push('  </div>\n</section>\n');
    gallery = parts.join('\n');
  }
  const h1 = d.title.replace(' KOREA', '<br>KOREA').replace(' K-BEDDING', '<br>K-BEDDING');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${d.title} | KFESTA</title>
<meta name="description" content="${escAttr(desc)}">
<link rel="canonical" href="https://kfesta.vn/projects/${slug}/">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="KFESTA">
<meta property="og:title" content="${escAttr(d.title)} | KFESTA">
<meta property="og:description" content="${escAttr(desc)}">
<meta property="og:url" content="https://kfesta.vn/projects/${slug}/">
<meta property="og:image" content="https://kfesta.vn/${d.hero}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" as="image" href="${rel(d.hero)}">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></noscript>
<link rel="stylesheet" href="../../assets/css/site.css">
</head>
<body>

<header class="hd">
  <div class="wrap">
    <a class="hd-logo" href="../../"><img src="../../assets/img/b85af70e2ee60.webp" alt="KFESTA"></a>
    <nav class="hd-nav">
      <a href="../export2026/" class="hl">대구메이드 K-Festa</a>
      <a href="../../INFO/">행사안내</a>
      <a href="../../BEAUTY/">BEAUTY</a>
      <a href="../../MARKET/">MARKET</a>
      <a href="../" class="on">프로젝트</a>
    </nav>
    <a class="hd-cta" href="../../33/">참가문의</a>
    <button class="hd-burger" aria-label="메뉴"><span></span><span></span><span></span></button>
  </div>
</header>

<main>

<section class="page-hero" style="background-image:url('${rel(d.hero)}')">
  <div class="in-col">
    <h1>${h1}</h1>
    <div class="hero-logos">
      <img src="../../assets/img/daegu-ci.webp" alt="대구광역시">
      <span class="dv"></span>
      <img src="../../assets/img/daegumade-logo.webp" alt="DAEGU MADE BEDDING">
    </div>
  </div>
</section>

<!-- 개요 -->
<section class="sec">
  <div class="article">
    <div class="tc">
      <div class="sec-kicker">${d.kicker}</div>
      <h2 class="sec-title">${d.subtitle}</h2>
    </div>
    <p class="lead" style="margin-top:20px">${d.lead}</p>
    <div class="tbl-wrap">
      <table class="tbl">
${rows}
      </table>
    </div>
  </div>
</section>
${gallery}
<!-- CTA -->
<section class="doc-cta">
  <p><strong>2026 대구메이드 K-Festa 베트남 수출상담회 참가기업 모집</strong><br>접수 2026. 8. 17.(월) ~ 9. 20.(일)</p>
  <a class="btn big" href="../../apply/">참가 신청하기</a>
</section>

<!-- 컨택트 -->
<section class="contact">
  <div class="wrap">
    <h2>Contact us</h2>
    <div class="contact-cols">
      <div class="contact-col">
        <h3>참가문의</h3>
        <div class="val">info@firstmkt.co.kr</div>
        <a class="go" href="mailto:info@firstmkt.co.kr">연락하기</a>
      </div>
      <div class="contact-col">
        <h3>한국 담당자</h3>
        <div class="val">+82 10 2746 1547</div>
        <a class="go" href="tel:+821027461547">연락하기</a>
      </div>
      <div class="contact-col">
        <h3>베트남 담당자</h3>
        <div class="val">+84 97 120 1878</div>
        <a class="go" href="tel:+84971201878">연락하기</a>
      </div>
    </div>
  </div>
</section>

</main>

<footer class="ft">
  <div class="wrap">
    <div class="ft-info">
      <strong>주식회사 퍼스트마케팅컴퍼니</strong><br>
      대표 김우석 · 사업자등록번호 884-88-01123 · 통신판매업신고 2021-대구동구-0697<br>
      대구: 대구광역시 중구 국채보상로 488 (동산동, 섬유회관) 3층 · 서울: 서울시 광진구 능동로49길 9, 2F<br>
      개인정보관리책임자 김우석 (work@firstmkt.co.kr) · 연락처 070-4212-8266 · info@firstmkt.co.kr
      <div class="ft-copy">Copyright ⓒ 2026 KFESTA. All rights reserved.</div>
    </div>
    <nav class="ft-nav">
      <a href="../../INFO/">행사안내</a>
      <a href="../../BEAUTY/">BEAUTY</a>
      <a href="../../MARKET/">MARKET</a>
      <a href="../export2026/">대구메이드 K-Festa</a>
      <a href="../">프로젝트</a>
      <a href="../../33/">참가문의</a>
    </nav>
  </div>
</footer>

<script src="../../assets/js/config.js"></script>
<script src="../../assets/js/site.js"></script>
</body>
</html>
`;
};

const genSlugs = [];
for (const it of items) {
  if (it.type !== 'page' || !it.page) continue;
  const d = { title: it.title, ...it.page };
  write('projects/' + it.slug + '/index.html', TPL(it.slug, d));
  genSlugs.push(it.slug);
  changed++;
  console.log('페이지:', it.slug);
}

// 삭제된 게시판 페이지 청소: 직전 굽기에서 생성했지만 이번 목록에 없는 슬러그만 제거
// (코드 관리 페이지는 .generated.json에 없으므로 절대 건드리지 않음)
{
  const genFile = path.join(SITE, 'data', '.generated.json');
  let prev = [];
  try { prev = JSON.parse(fs.readFileSync(genFile, 'utf8')); } catch {}
  for (const slug of prev) {
    if (!genSlugs.includes(slug) && /^[a-z0-9-]+$/.test(slug)) {
      fs.rmSync(path.join(SITE, 'projects', slug), { recursive: true, force: true });
      // 사이트맵에서도 제거
      let s = read('sitemap.xml');
      s = s.replace(new RegExp('\\s*<url><loc>https://kfesta\\.vn/projects/' + slug + '/</loc>[^\\n]*</url>'), '');
      write('sitemap.xml', s);
      console.log('페이지 삭제:', slug);
    }
  }
  fs.writeFileSync(genFile, JSON.stringify(genSlugs));
}

// ── 6) 사이트맵 (신규 페이지 등재) ────────────────────
{
  let s = read('sitemap.xml');
  for (const it of items) {
    if (it.type !== 'page') continue;
    const loc = 'https://kfesta.vn/projects/' + it.slug + '/';
    if (!s.includes(loc)) {
      s = s.replace('</urlset>', '  <url><loc>' + loc + '</loc><priority>0.6</priority></url>\n</urlset>');
      console.log('sitemap +', it.slug);
    }
  }
  write('sitemap.xml', s);
}

// ── 7) 모집 기간 → site.js D-day ─────────────────────
{
  const [oy, om, od] = (data.settings.recruit_open || '2026-08-17').split('-').map(Number);
  const [cy, cm, cd] = (data.settings.recruit_close || '2026-09-20').split('-').map(Number);
  let js = read('assets/js/site.js');
  const before = js;
  js = js.replace(/var open = new Date\([^)]*\);[^\n]*/,
    'var open = new Date(' + oy + ', ' + (om - 1) + ', ' + od + ');   // 접수 시작 (관리자 설정)');
  js = js.replace(/var close = new Date\([^)]*\);[^\n]*/,
    'var close = new Date(' + cy + ', ' + (cm - 1) + ', ' + (cd + 1) + ');  // 마감 익일 0시 (관리자 설정)');
  if (js !== before) { write('assets/js/site.js', js); changed++; }
  console.log('모집기간:', data.settings.recruit_open, '~', data.settings.recruit_close);
}

console.log('\n굽기 완료 — 파일', changed, '건 갱신');
