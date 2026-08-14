// KFESTA 공통 스크립트
(function () {
  'use strict';

  // 모바일 메뉴
  var burger = document.querySelector('.hd-burger');
  var nav = document.querySelector('.hd-nav');
  if (burger && nav) {
    burger.addEventListener('click', function () { nav.classList.toggle('open'); });
  }

  // 캐러셀 (.carousel > .slide*, 자동 4초)
  document.querySelectorAll('.carousel').forEach(function (car) {
    var slides = car.querySelectorAll('.slide');
    if (!slides.length) return;
    var dots = document.createElement('div');
    dots.className = 'dots';
    var idx = 0, timer = null;

    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', (i + 1) + '번 슬라이드');
      b.addEventListener('click', function () { go(i); restart(); });
      dots.appendChild(b);
    });
    car.appendChild(dots);

    function go(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle('on', j === idx); });
      dots.querySelectorAll('button').forEach(function (b, j) { b.classList.toggle('on', j === idx); });
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(function () { go(idx + 1); }, 4000);
    }
    go(0); restart();
  });

  // 마퀴: 트랙 내용을 복제해 무한루프 폭 확보
  // ⚠️ 반드시 lazy-bg 관찰보다 먼저 — innerHTML 복제는 기존 자식을 파괴해
  //    이미 관찰 중이던 요소가 미적용 클론으로 바뀐다(실제로 겪음)
  document.querySelectorAll('.marquee-track').forEach(function (t) {
    t.innerHTML += t.innerHTML;
  });

  // 아래폴드 배경이미지 지연 로드: data-bg → 뷰포트 근접 시 적용
  function applyBg(el) {
    if (!el.style.backgroundImage) el.style.backgroundImage = "url('" + el.getAttribute('data-bg') + "')";
  }
  var bgs = document.querySelectorAll('[data-bg]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { applyBg(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '400px' });
    bgs.forEach(function (el) { io.observe(el); });
  }
  // 안전망: load 후 아직 미적용이면 전부 적용 (IO 미지원·미발화 환경 대비)
  window.addEventListener('load', function () {
    setTimeout(function () { document.querySelectorAll('[data-bg]').forEach(applyBg); }, 800);
  });

  // 지연 iframe(data-src) 승격: 페이지 load 후 — 현재 홈 히어로는 자체 <video>라 해당 없음
  window.addEventListener('load', function () {
    document.querySelectorAll('iframe[data-src]').forEach(function (f) {
      f.src = f.getAttribute('data-src');
    });
  });

  // 수출상담회 접수 D-데이 칩 (접수 2026.8.17 ~ 9.20 KST)
  document.querySelectorAll('.rb-dday').forEach(function (el) {
    var now = new Date();
    var open = new Date(2026, 7, 17);   // 접수 시작 (관리자 설정)
    var close = new Date(2026, 8, 21);  // 마감 익일 0시 (관리자 설정)
    var day = 86400000;
    if (now < open) {
      var d = Math.ceil((open - now) / day);
      el.textContent = '접수 시작 D-' + d;
    } else if (now < close) {
      var left = Math.ceil((close - now) / day) - 1;
      el.textContent = left <= 0 ? '오늘 마감' : '마감 D-' + left;
    } else {
      el.textContent = '접수 마감';
    }
  });

  // 히어로 배경영상: 탭 복귀·bfcache 복원 시 멈춰 있으면 재생 재개
  var hv = document.querySelector('.hero-video video');
  if (hv) {
    var resume = function () {
      if (document.visibilityState === 'visible' && hv.paused) hv.play().catch(function () {});
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
  }

  // 참가문의 폼
  var form = document.getElementById('inq-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('.form-msg');
      var data = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        company: form.company.value.trim(),
        position: form.position.value.trim(),
        category: (form.querySelector('input[name=category]:checked') || {}).value || '',
      };
      if (!data.name || !data.phone || !data.email || !data.company) {
        show(msg, 'err', '이름·연락처·이메일·소속은 필수 항목입니다.');
        return;
      }
      if (!form.agree.checked) {
        show(msg, 'err', '개인정보 수집 및 이용에 동의해 주세요.');
        return;
      }

      var cfg = window.KF_CFG || {};
      var btn0 = form.querySelector('button[type=submit]');
      btn0.disabled = true;
      // 1순위: 로컬/자체 서버 API (같은 오리진). 없으면 기존 체인으로 폴백
      fetch('/api/submit/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(function (r) {
        if (!r.ok) throw new Error('no local api');
        return r.json();
      }).then(function () {
        form.reset();
        show(msg, 'ok', '문의가 접수되었습니다. 담당자가 곧 연락드리겠습니다.');
        btn0.disabled = false;
      }).catch(function () {
        btn0.disabled = false;
        submitFallback();
      });
      return;

      function submitFallback() {
      if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON) {
        var btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        fetch(cfg.SUPABASE_URL + '/rest/v1/inquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: cfg.SUPABASE_ANON,
            Authorization: 'Bearer ' + cfg.SUPABASE_ANON,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(data),
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          form.reset();
          show(msg, 'ok', '문의가 접수되었습니다. 담당자가 곧 연락드리겠습니다.');
        }).catch(function () {
          show(msg, 'err', '접수 중 오류가 발생했습니다. ' + (cfg.CONTACT_EMAIL || '') + ' 로 직접 문의해 주세요.');
        }).finally(function () { btn.disabled = false; });
      } else {
        // 백엔드 미연결 폴백: 메일 작성창
        var body = [
          '이름: ' + data.name,
          '연락처: ' + data.phone,
          '이메일: ' + data.email,
          '소속(기업명): ' + data.company,
          '직함: ' + data.position,
          '산업 카테고리: ' + data.category,
        ].join('\n');
        location.href = 'mailto:' + (cfg.CONTACT_EMAIL || 'info@firstmkt.co.kr')
          + '?subject=' + encodeURIComponent('[KFESTA 참가문의] ' + data.company)
          + '&body=' + encodeURIComponent(body);
        show(msg, 'ok', '메일 작성창이 열립니다. 전송해 주시면 접수됩니다.');
      }
      }
    });
  }
  // 수출상담회 참가 신청 폼 (/apply)
  var aform = document.getElementById('apply-form');
  if (aform) {
    aform.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = aform.querySelector('.form-msg');
      function val(n) { var el = aform.elements[n]; return el && el.value !== undefined ? (el.value || '').trim() : ''; }
      function picked(n) { var el = aform.querySelector('input[name=' + n + ']:checked'); return el ? el.value : ''; }
      var data = {
        company: val('company'), company_en: val('company_en'), ceo: val('ceo'),
        biz_no: val('biz_no'), founded: val('founded'), employees: val('employees'),
        address: val('address'), website: val('website'),
        name: val('name'), position: val('position'), phone: val('phone'), email: val('email'),
        product_name: val('product_name'), category: picked('category'),
        product_desc: val('product_desc'), product_spec: val('product_spec'),
        certifications: val('certifications'), store_url: val('store_url'),
        export_exp: picked('export_exp'), export_countries: val('export_countries'),
        vn_exp: picked('vn_exp'),
        trade_types: [].map.call(aform.querySelectorAll('input[name=trade]:checked'), function (c) { return c.value; }).join(', '),
        referral: picked('referral'), questions: val('questions'),
      };
      var missing = [];
      if (!data.company) missing.push('기업명');
      if (!data.ceo) missing.push('대표자명');
      if (!data.biz_no) missing.push('사업자등록번호');
      if (!data.address) missing.push('소재지 주소');
      if (!data.name) missing.push('담당자명');
      if (!data.phone) missing.push('휴대전화');
      if (!data.email) missing.push('이메일');
      if (!data.product_name) missing.push('제품명');
      if (!data.category) missing.push('품목 분야');
      if (!data.product_desc) missing.push('제품 소개');
      if (!data.export_exp) missing.push('수출 경험');
      if (missing.length) {
        show(msg, 'err', '필수 항목을 확인해 주세요: ' + missing.join(', '));
        return;
      }
      var bn = data.biz_no.replace(/[^0-9]/g, '');
      if (bn.length !== 10) {
        show(msg, 'err', '사업자등록번호는 숫자 10자리로 입력해 주세요.');
        return;
      }
      if (!aform.agree.checked || !aform.agree_third.checked) {
        show(msg, 'err', '필수 동의 항목 2건에 모두 동의해 주세요.');
        return;
      }
      var cfg = window.KF_CFG || {};
      var abtn = aform.querySelector('button[type=submit]');
      abtn.disabled = true;
      // 1순위: 로컬/자체 서버 API. 없으면 기존 체인으로 폴백
      fetch('/api/submit/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(function (r) {
        if (!r.ok) throw new Error('no local api');
        return r.json();
      }).then(function () {
        aform.reset();
        show(msg, 'ok', '신청서가 접수되었습니다. 담당자가 확인 후 개별 연락드립니다.');
        abtn.disabled = false;
      }).catch(function () {
        abtn.disabled = false;
        applyFallback();
      });
      return;

      function applyFallback() {
      if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON) {
        var btn = aform.querySelector('button[type=submit]');
        btn.disabled = true;
        fetch(cfg.SUPABASE_URL + '/rest/v1/applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: cfg.SUPABASE_ANON,
            Authorization: 'Bearer ' + cfg.SUPABASE_ANON,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(data),
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          aform.reset();
          show(msg, 'ok', '신청서가 접수되었습니다. 담당자가 확인 후 개별 연락드립니다.');
        }).catch(function () {
          show(msg, 'err', '접수 중 오류가 발생했습니다. info@firstmkt.co.kr 로 직접 신청해 주세요.');
        }).finally(function () { btn.disabled = false; });
      } else {
        var labels = {
          company: '기업명', company_en: '기업명(영문)', ceo: '대표자명', biz_no: '사업자등록번호',
          founded: '설립연도', employees: '직원 수', address: '소재지 주소', website: '홈페이지',
          name: '담당자명', position: '부서·직함', phone: '휴대전화', email: '이메일',
          product_name: '제품명', category: '품목 분야', product_desc: '제품 소개',
          product_spec: '사양·규격', certifications: '보유 인증', store_url: '온라인 판매 링크',
          export_exp: '수출 경험', export_countries: '수출 국가', vn_exp: '베트남 진출 시도',
          trade_types: '희망 거래 형태', referral: '신청 경로', questions: '문의사항',
        };
        var body = Object.keys(labels).map(function (k) {
          return labels[k] + ': ' + (data[k] || '-');
        }).join('\n');
        location.href = 'mailto:' + (cfg.CONTACT_EMAIL || 'info@firstmkt.co.kr')
          + '?subject=' + encodeURIComponent('[수출상담회 참가신청] ' + data.company)
          + '&body=' + encodeURIComponent(body);
        show(msg, 'ok', '메일 작성창이 열립니다. 전송해 주시면 접수됩니다.');
      }
      }
    });
  }

  function show(el, cls, text) {
    if (!el) return;
    el.className = 'form-msg ' + cls;
    el.textContent = text;
  }
})();
