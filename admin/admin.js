// KFESTA 관리자 (1단계: 로그인·대시보드·참가신청·문의함·설정)
(function () {
  'use strict';

  var cfg = window.KF_CFG || {};
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  // ── 설정 미완료 안내 ─────────────────────────────
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON) {
    document.body.innerHTML =
      '<div class="nocfg"><h2>Supabase 연결이 필요합니다</h2>' +
      '<p>1. Supabase 대시보드에서 새 프로젝트를 만듭니다 (리전: Singapore 권장).</p>' +
      '<p>2. SQL Editor에서 <code>supabase/01_schema.sql</code>을 실행합니다.</p>' +
      '<p>3. <code>assets/js/config.js</code>에 Project URL과 anon key를 입력합니다.</p>' +
      '<p>4. Authentication → Users에서 관리자 계정을 만들고, SQL로 <code>admins</code> 테이블에 등록합니다.</p></div>';
    return;
  }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON);

  var APPS = [], INQS = [];
  var appFilter = { st: '', q: '' };
  var inqFilter = { st: '', q: '' };
  var current = null; // {kind:'app'|'inq', row}

  // ── 유틸 ────────────────────────────────────────
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' +
      String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function msg(el, cls, text) {
    el.className = 'dmsg ' + cls; el.textContent = text;
    setTimeout(function () { el.textContent = ''; }, 2600);
  }
  function csvDownload(name, rows, headers) {
    var lines = [headers.map(function (h) { return h[1]; }).join(',')];
    rows.forEach(function (r) {
      lines.push(headers.map(function (h) {
        var v = String(r[h[0]] == null ? '' : r[h[0]]).replace(/"/g, '""');
        return /[",\n]/.test(v) ? '"' + v + '"' : v;
      }).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
  }

  // ── 로그인 ──────────────────────────────────────
  $('#l-btn').addEventListener('click', doLogin);
  $('#l-pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });

  function doLogin() {
    var email = $('#l-email').value.trim(), pw = $('#l-pw').value;
    if (!email || !pw) { $('#l-msg').textContent = '이메일과 비밀번호를 입력하세요.'; return; }
    $('#l-msg').textContent = '';
    sb.auth.signInWithPassword({ email: email, password: pw }).then(function (r) {
      if (r.error) {
        var m = r.error.message || '';
        $('#l-msg').textContent =
          /Invalid login/i.test(m) ? '이메일 또는 비밀번호가 올바르지 않습니다.' :
          /not confirmed/i.test(m) ? '이메일 미인증 계정입니다. Supabase에서 Confirm 처리하세요.' :
          /disabled/i.test(m) ? 'Email 로그인이 비활성화되어 있습니다. Providers 설정을 확인하세요.' : m;
        return;
      }
      checkAdmin();
    });
  }

  function checkAdmin() {
    sb.from('admins').select('id,email').limit(1).then(function (r) {
      if (r.error || !r.data || !r.data.length) {
        $('#l-msg').textContent = '관리자로 등록되지 않은 계정입니다.';
        sb.auth.signOut();
        return;
      }
      $('#who').textContent = r.data[0].email;
      enter();
    });
  }

  $('#logout').addEventListener('click', function () {
    sb.auth.signOut().then(function () { location.reload(); });
  });

  // 세션 유지 시 자동 진입
  sb.auth.getSession().then(function (r) {
    if (r.data && r.data.session) checkAdmin();
  });

  // ── 진입·라우팅 ─────────────────────────────────
  function enter() {
    $('#login').style.display = 'none';
    $('#shell').classList.add('on');
    loadAll();
    route();
    window.addEventListener('hashchange', route);
  }

  function route() {
    var tab = (location.hash || '#dash').slice(1);
    if (!$('#tab-' + tab)) tab = 'dash';
    $$('.main > section').forEach(function (s) { s.hidden = true; });
    $('#tab-' + tab).hidden = false;
    $$('#nav a[data-tab]').forEach(function (a) {
      a.classList.toggle('on', a.dataset.tab === tab);
    });
  }

  // ── 데이터 로드 ─────────────────────────────────
  function loadAll() {
    sb.from('applications').select('*').order('created_at', { ascending: false }).limit(1000)
      .then(function (r) { APPS = r.data || []; renderApps(); renderDash(); });
    sb.from('inquiries').select('*').order('created_at', { ascending: false }).limit(1000)
      .then(function (r) { INQS = r.data || []; renderInq(); renderDash(); });
    sb.from('settings').select('*').then(function (r) {
      (r.data || []).forEach(function (s) {
        if (s.key === 'mail_to') $('#s-mail').value = s.value;
        if (s.key === 'recruit_open') $('#s-open').value = s.value;
        if (s.key === 'recruit_close') $('#s-close').value = s.value;
      });
      renderDday();
    });
  }

  function renderDday() {
    var open = $('#s-open').value, close = $('#s-close').value;
    if (!open || !close) return;
    var now = new Date(), o = new Date(open), c = new Date(close);
    c.setDate(c.getDate() + 1);
    var day = 86400000, t;
    if (now < o) t = '접수 시작 D-' + Math.ceil((o - now) / day);
    else if (now < c) { var left = Math.ceil((c - now) / day) - 1; t = left <= 0 ? '오늘 마감' : '접수 마감 D-' + left; }
    else t = '접수 마감';
    $('#dday').textContent = t + ' (' + open + ' ~ ' + close + ')';
  }

  // ── 대시보드 ────────────────────────────────────
  function renderDash() {
    $('#k-apps').textContent = APPS.length;
    var an = APPS.filter(function (a) { return a.status === '신규'; }).length;
    $('#k-apps-new').textContent = an;
    $('#k-inq').textContent = INQS.length;
    var qn = INQS.filter(function (a) { return a.status === '신규'; }).length;
    $('#k-inq-new').textContent = qn;
    $('#cnt-apps').hidden = !an; $('#cnt-apps').textContent = an;
    $('#cnt-inq').hidden = !qn; $('#cnt-inq').textContent = qn;

    // 최근 7일 막대
    var days = [], counts = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      days.push((d.getMonth() + 1) + '/' + d.getDate());
      counts.push(APPS.filter(function (a) { return a.created_at.slice(0, 10) === key; }).length);
    }
    var max = Math.max.apply(null, counts.concat([1]));
    $('#chart7').innerHTML = counts.map(function (c, i) {
      return '<div class="b" style="height:' + Math.round(c / max * 100) + '%"><i>' + (c || '') + '</i><u>' + days[i] + '</u></div>';
    }).join('');
  }

  // ── 참가신청 ────────────────────────────────────
  function appRows() {
    return APPS.filter(function (a) {
      if (appFilter.st && a.status !== appFilter.st) return false;
      if (appFilter.q) {
        var q = appFilter.q.toLowerCase();
        var hay = [a.company, a.name, a.category, a.product_name].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function renderApps() {
    var rows = appRows();
    $('#apps-empty').hidden = !!rows.length;
    $('#apps-rows').innerHTML = rows.map(function (a, i) {
      return '<tr data-i="' + i + '"><td>' + fmtDate(a.created_at) + '</td>' +
        '<td class="em">' + esc(a.company) + '</td><td>' + esc(a.name) + '</td>' +
        '<td>' + esc(a.category) + '</td><td>' + esc(a.product_name) + '</td>' +
        '<td>' + esc(a.export_exp || '') + '</td>' +
        '<td><span class="st s' + esc(a.status) + '">' + esc(a.status) + '</span></td></tr>';
    }).join('');
    $$('#apps-rows tr').forEach(function (tr) {
      tr.addEventListener('click', function () {
        openDrawer('app', appRows()[+tr.dataset.i]);
      });
    });
  }

  $('#apps-fbar').addEventListener('click', function (e) {
    var c = e.target.closest('.chip'); if (!c) return;
    $$('#apps-fbar .chip').forEach(function (x) { x.classList.remove('on'); });
    c.classList.add('on'); appFilter.st = c.dataset.st; renderApps();
  });
  $('#apps-q').addEventListener('input', function () { appFilter.q = this.value.trim(); renderApps(); });

  var APP_CSV = [
    ['created_at', '접수일'], ['company', '기업명'], ['company_en', '기업명영문'], ['ceo', '대표자'],
    ['biz_no', '사업자번호'], ['founded', '설립연도'], ['employees', '직원수'], ['address', '주소'],
    ['website', '홈페이지'], ['name', '담당자'], ['position', '직함'], ['phone', '연락처'], ['email', '이메일'],
    ['product_name', '제품명'], ['category', '품목'], ['product_desc', '제품소개'], ['product_spec', '사양'],
    ['certifications', '인증'], ['store_url', '판매링크'], ['export_exp', '수출경험'], ['export_countries', '수출국가'],
    ['vn_exp', '베트남경험'], ['trade_types', '희망거래'], ['referral', '신청경로'], ['questions', '문의'],
    ['status', '상태'], ['memo', '메모'],
  ];
  $('#apps-csv').addEventListener('click', function () { csvDownload('참가신청', appRows(), APP_CSV); });

  // ── 문의함 ──────────────────────────────────────
  function inqRows() {
    return INQS.filter(function (a) {
      if (inqFilter.st && a.status !== inqFilter.st) return false;
      if (inqFilter.q) {
        var q = inqFilter.q.toLowerCase();
        if (([a.name, a.company].join(' ')).toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function renderInq() {
    var rows = inqRows();
    $('#inq-empty').hidden = !!rows.length;
    $('#inq-rows').innerHTML = rows.map(function (a, i) {
      return '<tr data-i="' + i + '"><td>' + fmtDate(a.created_at) + '</td>' +
        '<td class="em">' + esc(a.name) + '</td><td>' + esc(a.company || '') + '</td>' +
        '<td>' + esc(a.phone) + '</td><td>' + esc(a.category || '') + '</td>' +
        '<td><span class="st s' + esc(a.status) + '">' + esc(a.status) + '</span></td></tr>';
    }).join('');
    $$('#inq-rows tr').forEach(function (tr) {
      tr.addEventListener('click', function () {
        openDrawer('inq', inqRows()[+tr.dataset.i]);
      });
    });
  }

  $('#inq-fbar').addEventListener('click', function (e) {
    var c = e.target.closest('.chip'); if (!c) return;
    $$('#inq-fbar .chip').forEach(function (x) { x.classList.remove('on'); });
    c.classList.add('on'); inqFilter.st = c.dataset.st; renderInq();
  });
  $('#inq-q').addEventListener('input', function () { inqFilter.q = this.value.trim(); renderInq(); });

  var INQ_CSV = [
    ['created_at', '접수일'], ['name', '이름'], ['company', '기업명'], ['position', '직함'],
    ['phone', '연락처'], ['email', '이메일'], ['category', '분야'], ['status', '상태'], ['memo', '메모'],
  ];
  $('#inq-csv').addEventListener('click', function () { csvDownload('문의', inqRows(), INQ_CSV); });

  // ── 상세 드로어 ─────────────────────────────────
  var APP_SECS = [
    ['기업 정보', [['company', '기업명'], ['company_en', '기업명(영문)'], ['ceo', '대표자'], ['biz_no', '사업자번호'],
      ['founded', '설립연도'], ['employees', '직원 수'], ['address', '소재지'], ['website', '홈페이지']]],
    ['담당자', [['name', '담당자명'], ['position', '부서·직함'], ['phone', '휴대전화'], ['email', '이메일']]],
    ['제품', [['product_name', '제품명'], ['category', '품목'], ['product_desc', '제품 소개'], ['product_spec', '사양·규격'],
      ['certifications', '보유 인증'], ['store_url', '판매 링크']]],
    ['수출 현황', [['export_exp', '수출 경험'], ['export_countries', '수출 국가'], ['vn_exp', '베트남 시도'], ['trade_types', '희망 거래']]],
    ['기타', [['referral', '신청 경로'], ['questions', '문의사항'], ['created_at', '접수일시']]],
  ];
  var INQ_SECS = [
    ['문의 내용', [['name', '이름'], ['company', '기업명'], ['position', '직함'], ['phone', '연락처'],
      ['email', '이메일'], ['category', '분야'], ['created_at', '접수일시']]],
  ];
  var STATUSES = {
    app: ['신규', '미팅예정', '사전마케팅', '선정', '보류'],
    inq: ['신규', '처리중', '완료'],
  };

  function openDrawer(kind, row) {
    if (!row) return;
    current = { kind: kind, row: row };
    $('#d-title').textContent = kind === 'app' ? (row.company + ' 참가신청') : (row.name + ' 문의');
    $('#d-status').innerHTML = STATUSES[kind].map(function (s) {
      return '<option' + (s === row.status ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
    $('#d-memo').value = row.memo || '';
    var secs = kind === 'app' ? APP_SECS : INQ_SECS;
    $('#d-body').innerHTML = secs.map(function (sec) {
      return '<div class="dsec"><h4>' + sec[0] + '</h4><div class="dgrid">' +
        sec[1].map(function (f) {
          var v = row[f[0]];
          if (f[0] === 'created_at') v = fmtDate(v);
          var html = esc(v || '-');
          if (v && (f[0] === 'website' || f[0] === 'store_url')) {
            var url = /^https?:/.test(v) ? v : 'https://' + v;
            html = '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(v) + '</a>';
          }
          if (v && f[0] === 'email') html = '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>';
          if (v && f[0] === 'phone') html = '<a href="tel:' + esc(v) + '">' + esc(v) + '</a>';
          return '<div class="k">' + f[1] + '</div><div class="v">' + html + '</div>';
        }).join('') + '</div></div>';
    }).join('');
    $('#drawer').classList.add('on');
    $('#drawer-bg').classList.add('on');
  }

  function closeDrawer() {
    $('#drawer').classList.remove('on');
    $('#drawer-bg').classList.remove('on');
  }
  $('#d-close').addEventListener('click', closeDrawer);
  $('#drawer-bg').addEventListener('click', closeDrawer);

  $('#d-save').addEventListener('click', function () {
    if (!current) return;
    var table = current.kind === 'app' ? 'applications' : 'inquiries';
    var patch = { status: $('#d-status').value, memo: $('#d-memo').value };
    sb.from(table).update(patch).eq('id', current.row.id).then(function (r) {
      if (r.error) { msg($('#d-msg'), 'err', '저장 실패: ' + r.error.message); return; }
      current.row.status = patch.status;
      current.row.memo = patch.memo;
      msg($('#d-msg'), 'ok', '저장됨');
      renderApps(); renderInq(); renderDash();
    });
  });

  // ── 설정 저장 ───────────────────────────────────
  $('#s-save').addEventListener('click', function () {
    var rows = [
      { key: 'mail_to', value: $('#s-mail').value.trim() },
      { key: 'recruit_open', value: $('#s-open').value },
      { key: 'recruit_close', value: $('#s-close').value },
    ];
    sb.from('settings').upsert(rows).then(function (r) {
      if (r.error) { msg($('#s-msg'), 'err', '저장 실패: ' + r.error.message); return; }
      msg($('#s-msg'), 'ok', '저장됨');
      renderDday();
    });
  });
})();
