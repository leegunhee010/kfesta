# -*- coding: utf-8 -*-
# 연도별 수출상담회 페이지 3종 생성 (export2023/2024/2025)
import os

ROOT = r'C:\Users\이건희\kfesta'

YEARS = {
    'export2023': {
        'year': '2023',
        'title': '2023 KOREA BEDDING TRADE SHOW',
        'subtitle': '대구 침장 탑(TOP) 브랜드 상품전',
        'hero': 'archive/2023-booth.webp',
        'desc': '2023 글로컬 대구침장 특화산업 육성사업으로 열린 첫 베트남 수출상담회. 호치민 니코호텔에서 대구 침장 탑브랜드 5개사가 현지 바이어와 1:1 상담을 진행했습니다.',
        'rows': [
            ('행사명', '2023 KOREA BEDDING TRADE SHOW (대구 침장 탑브랜드 상품전)'),
            ('일시', '2023. 9. 21. 10:00'),
            ('장소', '베트남 호치민, 니코호텔 사이공 4층 컨퍼런스룸'),
            ('사업', '2023 글로컬 대구침장 특화산업 육성사업'),
            ('참여', '대구 침장 탑브랜드 5개사 — 따뜻한 세상 · 따시온 · 로얄홈 · 퀸센스 · 한빛'),
            ('구성', '1:1 바이어 수출상담회 · 전시 부스 운영'),
            ('수행', '주식회사 퍼스트마케팅컴퍼니'),
        ],
        'photos': [
            ('archive/2023-open.webp', '행사 개회'),
            ('archive/2023-booth.webp', '전시 부스'),
            ('archive/2023-meeting.webp', '1:1 바이어 상담'),
        ],
        'wide': None,
    },
    'export2024': {
        'year': '2024',
        'title': '2024 KOREA BEDDING TRADE SHOW',
        'subtitle': '대구 침장 탑브랜드 상품전',
        'hero': 'archive/2024-wide.webp',
        'desc': '호치민 나우존(NOWZONE) 쇼핑센터에서 5일간 열린 두 번째 수출상담회. 1:1 바이어 상담과 브랜드 런칭쇼, 틱톡 현장 라이브커머스를 병행해 상담과 소비자 반응 검증을 한 번에 진행했습니다.',
        'rows': [
            ('행사명', '2024 KOREA BEDDING TRADE SHOW (대구 침장 탑브랜드 상품전)'),
            ('일시', '2024. 10. 9.(수) ~ 13.(일) · 수출상담회 10. 11.(금)'),
            ('장소', '베트남 호치민, 나우존(NOWZONE) 쇼핑센터'),
            ('사업', '2024 글로컬 대구침장 특화산업 육성사업'),
            ('참여', '대구 침장 탑브랜드 5개사 — 로얄홈 · 보네브 · 에프엔비글로벌 · 퀸센스 · 한빛'),
            ('구성', '1:1 바이어 수출상담회 · 브랜드 런칭쇼(B2C 판매) · 틱톡 현장 라이브커머스'),
            ('성과', '<strong>바이어 상담 58건 · 상담액 USD 287만 · 계약 추진액 USD 100만</strong>'),
            ('수행', '주식회사 퍼스트마케팅컴퍼니'),
        ],
        'photos': [
            ('archive/2024-crowd.webp', '행사장 대기 인파'),
            ('archive/2024-live.webp', '현장 라이브커머스'),
        ],
        'wide': ('archive/2024-wide.webp', '나우존 쇼핑센터 행사 현장'),
    },
    'export2025': {
        'year': '2025',
        'title': '2025 K-BEDDING TRADE FAIR',
        'subtitle': '대구침장 베트남 수출상담회',
        'hero': 'archive/2025-backdrop.webp',
        'desc': '호치민 니코호텔 사이공에서 열린 세 번째 수출상담회. 대구광역시와 대구경북섬유직물공업협동조합이 함께한 K-BEDDING TRADE FAIR로 이어졌습니다.',
        'rows': [
            ('행사명', '2025 K-BEDDING TRADE FAIR'),
            ('일시', '2025. 9. 18.(목) 10:00 ~ 18:00'),
            ('장소', '베트남 호치민, 니코호텔 사이공 3층 컨퍼런스룸'),
            ('주최', '대구광역시 · 대구경북섬유직물공업협동조합'),
            ('수행', '주식회사 퍼스트마케팅컴퍼니'),
        ],
        'photos': [],
        'wide': ('archive/2025-backdrop.webp', '2025 K-BEDDING TRADE FAIR 공식 백드롭'),
    },
}

TPL = '''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | KFESTA</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://kfesta.vn/projects/{slug}/">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="KFESTA">
<meta property="og:title" content="{title} | KFESTA">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://kfesta.vn/projects/{slug}/">
<meta property="og:image" content="https://kfesta.vn/assets/img/{hero}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" as="image" href="../../assets/img/{hero}">
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

<section class="page-hero" style="background-image:url('../../assets/img/{hero}')">
  <div class="in-col">
    <h1>{h1}</h1>
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
      <div class="sec-kicker">{year}</div>
      <h2 class="sec-title">{subtitle}</h2>
    </div>
    <p class="lead" style="margin-top:20px">{desc_html}</p>
    <div class="tbl-wrap">
      <table class="tbl">
{rows}
      </table>
    </div>
  </div>
</section>
{gallery}
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
'''

for slug, d in YEARS.items():
    rows = '\n'.join('        <tr><th>{}</th><td>{}</td></tr>'.format(k, v) for k, v in d['rows'])
    gallery = ''
    if d['wide'] or d['photos']:
        parts = ['\n<!-- 현장 -->\n<section class="sec" style="padding-top:0">\n  <div class="article">\n    <div class="tc">\n      <div class="sec-kicker">On-site</div>\n      <h2 class="sec-title">현장</h2>\n    </div>']
        if d['wide']:
            parts.append('    <div class="photo" style="margin-top:30px"><img src="../../assets/img/{}" alt="{}" loading="lazy"></div>'.format(*d['wide']))
        if d['photos']:
            n = len(d['photos'])
            cols = ';grid-template-columns:repeat(3,1fr)' if n == 3 else ''
            items = '\n'.join('      <div class="pgi" style="aspect-ratio:6/5" data-bg="../../assets/img/{}" role="img" aria-label="{}"></div>'.format(p, a) for p, a in d['photos'])
            parts.append('    <div class="photo-grid" style="margin-top:24px{}">\n{}\n    </div>'.format(cols, items))
        parts.append('  </div>\n</section>\n')
        gallery = '\n'.join(parts)
    # h1: 제목 두 줄 분리
    h1 = d['title'].replace(' KOREA', '<br>KOREA').replace(' K-BEDDING', '<br>K-BEDDING')
    html = TPL.format(slug=slug, title=d['title'], subtitle=d['subtitle'], year=d['year'],
                      desc=d['desc'], desc_html=d['desc'], hero=d['hero'], h1=h1, rows=rows, gallery=gallery)
    out = os.path.join(ROOT, 'projects', slug)
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('generated', slug)
