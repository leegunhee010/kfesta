// data/site.json 초기 생성 + HTML에 data-ck 편집 마커 주입 (1회성, 재실행 안전)
// node _tools/init_data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(SITE, 'data', 'site.json');

// ── 카피 레지스트리: 어디의 어떤 요소를 편집 가능하게 할지 ──
// find: 마커가 없을 때 요소를 찾을 유일 앵커(여는 태그), tag: 닫는 태그 매칭용
const COPY = [
  { key: 'home.hero.p',    file: 'index.html', page: '홈', label: '히어로 소개 문단', tag: 'p',
    find: /<div class="in">\s*<h1[^>]*>[\s\S]*?<\/h1>\s*<p>/ },
  { key: 'home.band.title', file: 'index.html', page: '홈', label: '모집 밴드 제목', tag: 'h2',
    find: /<span class="rb-dday"><\/span>\s*<h2>/ },
  { key: 'home.band.meta', file: 'index.html', page: '홈', label: '모집 밴드 설명줄', tag: 'div',
    find: /<div class="rb-meta">/ },
  { key: 'home.strip.en',  file: 'index.html', page: '홈', label: 'CTA 스트립 영문', tag: 'div',
    find: /<section class="cta-strip">\s*<div class="wrap">\s*<div class="en">/ },
  { key: 'home.strip.h2',  file: 'index.html', page: '홈', label: 'CTA 스트립 제목', tag: 'h2',
    find: /<section class="cta-strip">[\s\S]*?<h2>/ },
  { key: 'home.ctaband.h2', file: 'index.html', page: '홈', label: '중간 CTA 밴드 제목', tag: 'h2',
    find: /<section class="cta-band"[\s\S]*?<h2>/ },
  { key: 'x26.band.title', file: 'projects/export2026/index.html', page: '수출상담회', label: '모집 밴드 제목', tag: 'h2',
    find: /<span class="rb-dday"><\/span>\s*<h2>/ },
  { key: 'x26.band.meta',  file: 'projects/export2026/index.html', page: '수출상담회', label: '모집 밴드 설명줄', tag: 'div',
    find: /<div class="rb-meta">/ },
  { key: 'x26.callout.p1', file: 'projects/export2026/index.html', page: '수출상담회', label: '차별점 문단 1', tag: 'p',
    find: /<div class="callout">\s*<p>/ },
  { key: 'x26.callout.p2', file: 'projects/export2026/index.html', page: '수출상담회', label: '차별점 문단 2', tag: 'p',
    find: /<div class="callout">[\s\S]*?<p style="margin-top:14px">/ },
  { key: 'apply.note',     file: 'apply/index.html', page: '신청폼', label: '신청서 상단 안내', tag: 'p',
    find: /<h2 class="sec-title" style="font-size:24px">참가기업 신청서<\/h2>\s*<p class="note">/ },
  { key: 'info.lead',      file: 'INFO/index.html', page: '행사안내', label: '소개 리드 문단', tag: 'p',
    find: /<p class="lead">(?=\s*케이페스타는)/ },
];

// SEO 대상 페이지
const PAGES = ['index.html', 'INFO/index.html', 'BEAUTY/index.html', 'MARKET/index.html',
  '33/index.html', 'apply/index.html', 'projects/index.html', 'projects/export2026/index.html',
  'projects/chimac2026/index.html', 'projects/daegumade/index.html',
  'projects/export2023/index.html', 'projects/export2024/index.html', 'projects/export2025/index.html'];

const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(SITE, f), s);

const data = { copy: {}, seo: {}, faq_home: [], projects: { cards: [], pages: {} }, settings: {} };

// ── 1) 카피: 마커 주입 + 현재 값 추출 ──
for (const c of COPY) {
  let h = read(c.file);
  const marked = new RegExp('<' + c.tag + '([^>]*) data-ck="' + c.key + '"([^>]*)>([\\s\\S]*?)</' + c.tag + '>');
  let m = h.match(marked);
  if (!m) {
    const fm = h.match(c.find);
    if (!fm) { console.log('앵커 못 찾음:', c.key); continue; }
    const openTag = fm[0];
    const patched = openTag.replace(new RegExp('<' + c.tag + '((?:(?!>)[\\s\\S])*)>$'),
      '<' + c.tag + '$1 data-ck="' + c.key + '">');
    h = h.replace(openTag, patched);
    write(c.file, h);
    m = h.match(marked);
  }
  data.copy[c.key] = { value: m[3].trim(), page: c.page, label: c.label, file: c.file, tag: c.tag };
  console.log('copy:', c.key);
}

// ── 2) SEO 추출 ──
for (const p of PAGES) {
  const h = read(p);
  const t = (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  data.seo[p] = { title: t.trim(), description: d };
}

// ── 3) 홈 FAQ 추출 ──
{
  const h = read('index.html');
  const faqBlock = (h.match(/<div class="faq">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/) || [])[1] || '';
  const items = [...faqBlock.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)];
  data.faq_home = items.map((m) => ({ q: m[1].trim(), a: m[2].trim() }));
  console.log('faq_home:', data.faq_home.length, '문항');
}

// ── 4) 프로젝트 (허브 카드 + 템플릿형 페이지) ──
data.projects.cards = [
  { href: 'export2026/', badge: '모집 중', title: '2026 대구메이드 K-Festa 베트남 수출상담회',
    meta: '접수 8. 17 ~ 9. 20 · 2026년 11월 · 니코호텔 사이공',
    desc: '대구 혁신기업 10개사와 베트남 바이어의 1:1 수출상담회. 바이어 매칭·통역·시장조사 투어까지 제공합니다.',
    thumb: 'assets/img/fcd941e396b7e.webp' },
  { href: 'daegumade/', badge: '진행 중', title: '대구메이드 DAEGU MADE',
    meta: '호치민 쇼룸 2개소 · 프리미엄 침구',
    desc: '대구 침장 기업의 제품을 호치민 쇼룸에서 상설 전시·판매하고, 바이어 매칭으로 수출 본오더까지 잇습니다.',
    thumb: 'assets/img/daegumade-logo.webp', thumb_mode: 'logo' },
  { href: 'chimac2026/', badge: '종료', title: '2026 대구치맥페스티벌 in 베트남',
    meta: '2026년 7월 · 호치민·다낭 5개 브랜드 9개 매장',
    desc: '치면 문화를 겨냥한 현지화 기획. 직접 참여 약 500명, SNS 노출 약 10만 2천 건을 기록했습니다.',
    thumb: 'assets/img/chimac/store-d1.webp' },
  { href: 'export2025/', badge: '종료', title: '2025 K-BEDDING TRADE FAIR',
    meta: '2025년 9월 · 호치민 니코호텔 사이공',
    desc: '대구침장 베트남 수출상담회. 대구광역시·대구경북섬유직물공업협동조합이 함께했습니다.',
    thumb: 'assets/img/archive/2025-backdrop.webp' },
  { href: 'export2024/', badge: '종료', title: '2024 KOREA BEDDING TRADE SHOW',
    meta: '2024년 10월 · 호치민 나우존 쇼핑센터',
    desc: '상담회·런칭쇼·라이브커머스 병행. 바이어 상담 58건, 상담액 USD 287만을 기록했습니다.',
    thumb: 'assets/img/archive/2024-crowd.webp' },
  { href: 'export2023/', badge: '종료', title: '2023 KOREA BEDDING TRADE SHOW',
    meta: '2023년 9월 · 호치민 니코호텔 사이공',
    desc: '첫 베트남 수출상담회. 대구 침장 탑브랜드 5개사가 현지 바이어와 1:1 상담을 진행했습니다.',
    thumb: 'assets/img/archive/2023-booth.webp' },
  { href: '../BEAUTY/', badge: '참가 모집', title: 'BEAUTY KFESTA',
    meta: '에스테틱 연계형 뷰티 런칭쇼',
    desc: '베트남 에스테틱 네트워크를 통해 K-뷰티 브랜드의 현지 진출을 지원합니다.',
    thumb: 'assets/img/a14ab77ca8cc9.webp' },
  { href: '../MARKET/', badge: '참가 모집', title: 'MARKET KFESTA',
    meta: '실행형 로컬 검증 마켓',
    desc: '베트남 진출에 대한 막연함을 현장 데이터로 바꾸는 로컬 검증 마켓입니다.',
    thumb: 'assets/img/262593665a072.webp' },
];

// 템플릿형(연도형) 페이지: 관리자에서 표·사진·리드 수정, 신규 생성도 이 형식
data.projects.pages = {
  export2023: {
    title: '2023 KOREA BEDDING TRADE SHOW', kicker: '2023', subtitle: '대구 침장 탑(TOP) 브랜드 상품전',
    hero: 'assets/img/archive/2023-booth.webp',
    lead: '2023 글로컬 대구침장 특화산업 육성사업으로 열린 첫 베트남 수출상담회. 호치민 니코호텔에서 대구 침장 탑브랜드 5개사가 현지 바이어와 1:1 상담을 진행했습니다.',
    rows: [
      { k: '행사명', v: '2023 KOREA BEDDING TRADE SHOW (대구 침장 탑브랜드 상품전)' },
      { k: '일시', v: '2023. 9. 21. 10:00' },
      { k: '장소', v: '베트남 호치민, 니코호텔 사이공 4층 컨퍼런스룸' },
      { k: '사업', v: '2023 글로컬 대구침장 특화산업 육성사업' },
      { k: '참여', v: '대구 침장 탑브랜드 5개사 — 따뜻한 세상 · 따시온 · 로얄홈 · 퀸센스 · 한빛' },
      { k: '구성', v: '1:1 바이어 수출상담회 · 전시 부스 운영' },
      { k: '수행', v: '주식회사 퍼스트마케팅컴퍼니' },
    ],
    wide: '', photos: [
      { src: 'assets/img/archive/2023-open.webp', alt: '행사 개회' },
      { src: 'assets/img/archive/2023-booth.webp', alt: '전시 부스' },
      { src: 'assets/img/archive/2023-meeting.webp', alt: '1:1 바이어 상담' },
    ],
  },
  export2024: {
    title: '2024 KOREA BEDDING TRADE SHOW', kicker: '2024', subtitle: '대구 침장 탑브랜드 상품전',
    hero: 'assets/img/archive/2024-wide.webp',
    lead: '호치민 나우존(NOWZONE) 쇼핑센터에서 5일간 열린 두 번째 수출상담회. 1:1 바이어 상담과 브랜드 런칭쇼, 틱톡 현장 라이브커머스를 병행해 상담과 소비자 반응 검증을 한 번에 진행했습니다.',
    rows: [
      { k: '행사명', v: '2024 KOREA BEDDING TRADE SHOW (대구 침장 탑브랜드 상품전)' },
      { k: '일시', v: '2024. 10. 9.(수) ~ 13.(일) · 수출상담회 10. 11.(금)' },
      { k: '장소', v: '베트남 호치민, 나우존(NOWZONE) 쇼핑센터' },
      { k: '사업', v: '2024 글로컬 대구침장 특화산업 육성사업' },
      { k: '참여', v: '대구 침장 탑브랜드 5개사 — 로얄홈 · 보네브 · 에프엔비글로벌 · 퀸센스 · 한빛' },
      { k: '구성', v: '1:1 바이어 수출상담회 · 브랜드 런칭쇼(B2C 판매) · 틱톡 현장 라이브커머스' },
      { k: '성과', v: '<strong>바이어 상담 58건 · 상담액 USD 287만 · 계약 추진액 USD 100만</strong>' },
      { k: '수행', v: '주식회사 퍼스트마케팅컴퍼니' },
    ],
    wide: 'assets/img/archive/2024-wide.webp', photos: [
      { src: 'assets/img/archive/2024-crowd.webp', alt: '행사장 대기 인파' },
      { src: 'assets/img/archive/2024-live.webp', alt: '현장 라이브커머스' },
    ],
  },
  export2025: {
    title: '2025 K-BEDDING TRADE FAIR', kicker: '2025', subtitle: '대구침장 베트남 수출상담회',
    hero: 'assets/img/archive/2025-backdrop.webp',
    lead: '호치민 니코호텔 사이공에서 열린 세 번째 수출상담회. 대구광역시와 대구경북섬유직물공업협동조합이 함께한 K-BEDDING TRADE FAIR로 이어졌습니다.',
    rows: [
      { k: '행사명', v: '2025 K-BEDDING TRADE FAIR' },
      { k: '일시', v: '2025. 9. 18.(목) 10:00 ~ 18:00' },
      { k: '장소', v: '베트남 호치민, 니코호텔 사이공 3층 컨퍼런스룸' },
      { k: '주최', v: '대구광역시 · 대구경북섬유직물공업협동조합' },
      { k: '수행', v: '주식회사 퍼스트마케팅컴퍼니' },
    ],
    wide: 'assets/img/archive/2025-backdrop.webp', photos: [],
  },
};

// ── 5) 설정 ──
data.settings = {
  recruit_open: '2026-08-17',
  recruit_close: '2026-09-20',
  mail_to: 'info@firstmkt.co.kr',
};

fs.mkdirSync(path.dirname(DATA), { recursive: true });
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
console.log('\ndata/site.json 생성:', Object.keys(data.copy).length, '카피 /', Object.keys(data.seo).length, 'SEO /',
  data.faq_home.length, 'FAQ /', data.projects.cards.length, '카드 /', Object.keys(data.projects.pages).length, '템플릿 페이지');
