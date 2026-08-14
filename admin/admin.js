// KFESTA 관리자
// 로컬 모드: admin-server(/api/*)로 카피·SEO·프로젝트·설정 편집 + 게시(굽기)
// 원격 모드: Supabase(또는 미믹 백엔드)로 참가신청·문의함 관리
(function () {
  'use strict';

  var cfg = window.KF_CFG || {};
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  var LOCAL = false;          // admin-server 감지 여부
  var sb = null;              // Supabase 클라이언트
  var DB = null;              // data/site.json (로컬 모드)
  var APPS = [], INQS = [];
  var appFilter = { st: '', q: '' };
  var inqFilter = { st: '', q: '' };
  var current = null;

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
    if (typeof el === 'string') el = $(el);
    el.className = (el.classList.contains('tmsg') ? 'tmsg ' : 'dmsg ') + cls;
    el.textContent = text;
    setTimeout(function () { el.textContent = ''; }, 3200);
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

  // ── 부팅: 로컬 API 감지 ─────────────────────────
  fetch('/api/ping').then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; })
    .then(function (p) {
      LOCAL = !!(p && p.ok);
      if (LOCAL) initLocal();
      else initRemote();
    });

  function initLocal() {
    $('#mode-label').textContent = '로컬 관리 모드';
    $('#who').textContent = '로컬 편집 (로그인 불필요)';
    fetch('/api/data').then(function (r) { return r.json(); }).then(function (d) {
      DB = d;
      enter();
      renderContent();
      // 신청·문의: 로컬 서버가 직접 수집·보관 (data/*.json)
      loadLocalSubmissions();
    });
  }

  function initRemote() {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON) {
      document.body.innerHTML =
        '<div class="nocfg"><h2>관리자 사용 안내</h2>' +
        '<p><strong>콘텐츠 편집(카피·SEO·프로젝트)</strong>은 로컬 관리 서버에서 합니다:</p>' +
        '<p><code>node _tools/admin-server.mjs 5775</code> 실행 후 <code>localhost:5775/admin/</code> 접속.</p>' +
        '<p style="margin-top:12px"><strong>참가신청·문의 관리</strong>는 백엔드(자체 서버 또는 Supabase) 연결 후 사용할 수 있습니다. ' +
        '<code>assets/js/config.js</code>에 접속 정보를 입력하세요.</p></div>';
      return;
    }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON);
    $('#mode-label').textContent = '원격 모드';
    contentTabsOff();
    $('#login').hidden = false;
    $('#logout').hidden = false;
    $('#l-btn').addEventListener('click', doLogin);
    $('#l-pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) checkAdmin();
    });
  }

  function loadLocalSubmissions() {
    fetch('/api/apps').then(function (r) { return r.json(); })
      .then(function (d) { APPS = d || []; renderApps(); renderDash(); });
    fetch('/api/inqs').then(function (r) { return r.json(); })
      .then(function (d) { INQS = d || []; renderInq(); renderDash(); });
  }
  function contentTabsOff() {
    ['#nav-prj', '#nav-blog', '#nav-copy', '#nav-seo'].forEach(function (s) { $(s).classList.add('dis'); });
  }

  // ── 원격 로그인 ─────────────────────────────────
  function doLogin() {
    var email = $('#l-email').value.trim(), pw = $('#l-pw').value;
    if (!email || !pw) { $('#l-msg').textContent = '이메일과 비밀번호를 입력하세요.'; return; }
    sb.auth.signInWithPassword({ email: email, password: pw }).then(function (r) {
      if (r.error) {
        var m = r.error.message || '';
        $('#l-msg').textContent =
          /Invalid login/i.test(m) ? '이메일 또는 비밀번호가 올바르지 않습니다.' :
          /not confirmed/i.test(m) ? '이메일 미인증 계정입니다.' : m;
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
      $('#login').hidden = true;
      enter();
      loadRemoteData();
    });
  }
  $('#logout').addEventListener('click', function () {
    if (sb) sb.auth.signOut().then(function () { location.reload(); });
  });

  // ── 셸 진입·라우팅 ──────────────────────────────
  var entered = false;
  function enter() {
    if (entered) return;
    entered = true;
    $('#login').hidden = true;
    $('#shell').classList.add('on');
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

  // ── 원격 데이터 (신청·문의) ─────────────────────
  function loadRemoteData() {
    sb.from('applications').select('*').order('created_at', { ascending: false }).limit(1000)
      .then(function (r) { APPS = r.data || []; renderApps(); renderDash(); });
    sb.from('inquiries').select('*').order('created_at', { ascending: false }).limit(1000)
      .then(function (r) { INQS = r.data || []; renderInq(); renderDash(); });
  }

  function renderDash() {
    $('#k-apps').textContent = APPS.length;
    var an = APPS.filter(function (a) { return a.status === '신규'; }).length;
    $('#k-apps-new').textContent = an;
    $('#k-inq').textContent = INQS.length;
    var qn = INQS.filter(function (a) { return a.status === '신규'; }).length;
    $('#k-inq-new').textContent = qn;
    $('#cnt-apps').hidden = !an; $('#cnt-apps').textContent = an;
    $('#cnt-inq').hidden = !qn; $('#cnt-inq').textContent = qn;
    var days = [], counts = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      days.push((d.getMonth() + 1) + '/' + d.getDate());
      counts.push(APPS.filter(function (a) { return (a.created_at || '').slice(0, 10) === key; }).length);
    }
    var max = Math.max.apply(null, counts.concat([1]));
    $('#chart7').innerHTML = counts.map(function (c, i) {
      return '<div class="b" style="height:' + Math.round(c / max * 100) + '%"><i>' + (c || '') + '</i><u>' + days[i] + '</u></div>';
    }).join('');
  }

  function renderDday() {
    var s = (DB && DB.settings) || {};
    if (!s.recruit_open) return;
    var now = new Date(), o = new Date(s.recruit_open), c = new Date(s.recruit_close);
    c.setDate(c.getDate() + 1);
    var day = 86400000, t;
    if (now < o) t = '접수 시작 D-' + Math.ceil((o - now) / day);
    else if (now < c) { var left = Math.ceil((c - now) / day) - 1; t = left <= 0 ? '오늘 마감' : '접수 마감 D-' + left; }
    else t = '접수 마감';
    $('#dday').textContent = t + ' (' + s.recruit_open + ' ~ ' + s.recruit_close + ')';
  }

  // ── 참가신청 목록 ───────────────────────────────
  function appRows() {
    return APPS.filter(function (a) {
      if (appFilter.st && a.status !== appFilter.st) return false;
      if (appFilter.q) {
        var q = appFilter.q.toLowerCase();
        if ([a.company, a.name, a.category, a.product_name].join(' ').toLowerCase().indexOf(q) < 0) return false;
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
      tr.addEventListener('click', function () { openDrawer('app', appRows()[+tr.dataset.i]); });
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

  // ── 문의함 목록 ─────────────────────────────────
  function inqRows() {
    return INQS.filter(function (a) {
      if (inqFilter.st && a.status !== inqFilter.st) return false;
      if (inqFilter.q && ([a.name, a.company].join(' ')).toLowerCase().indexOf(inqFilter.q.toLowerCase()) < 0) return false;
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
      tr.addEventListener('click', function () { openDrawer('inq', inqRows()[+tr.dataset.i]); });
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

  // ── 드로어 ──────────────────────────────────────
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
  var STATUSES = { app: ['신규', '미팅예정', '사전마케팅', '선정', '보류'], inq: ['신규', '처리중', '완료'] };

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
    var patch = { status: $('#d-status').value, memo: $('#d-memo').value };
    function done() {
      current.row.status = patch.status;
      current.row.memo = patch.memo;
      msg('#d-msg', 'ok', '저장됨');
      renderApps(); renderInq(); renderDash();
    }
    if (LOCAL) {
      var ep = current.kind === 'app' ? '/api/apps' : '/api/inqs';
      fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.row.id, status: patch.status, memo: patch.memo }) })
        .then(function (r) { return r.json(); })
        .then(function (r) { if (!r.ok) throw new Error(r.error || '실패'); done(); })
        .catch(function (e) { msg('#d-msg', 'err', '저장 실패: ' + e.message); });
    } else if (sb) {
      var table = current.kind === 'app' ? 'applications' : 'inquiries';
      sb.from(table).update(patch).eq('id', current.row.id).then(function (r) {
        if (r.error) { msg('#d-msg', 'err', '저장 실패: ' + r.error.message); return; }
        done();
      });
    }
  });

  // ════════════════════════════════════════════════
  // 로컬 콘텐츠 편집 (카피·SEO·프로젝트·설정·게시)
  // ════════════════════════════════════════════════
  function saveDB(msgSel) {
    return fetch('/api/data', { method: 'POST', body: JSON.stringify(DB, null, 2) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.error || 'save fail');
        if (msgSel) msg(msgSel, 'ok', '저장됨. 사이트 반영은 게시(굽기)를 누르세요.');
      })
      .catch(function (e) { if (msgSel) msg(msgSel, 'err', '저장 실패: ' + e.message); throw e; });
  }

  function publish(msgSel) {
    msg(msgSel, 'ok', '굽는 중...');
    return saveDB(null).then(function () {
      return fetch('/api/bake', { method: 'POST' }).then(function (r) { return r.json(); });
    }).then(function (r) {
      var log = $('#pub-log');
      log.style.display = 'block';
      log.textContent = r.log || '';
      msg(msgSel, r.ok ? 'ok' : 'err', r.ok ? '게시 완료. 사이트에 반영되었습니다.' : '게시 실패 — 설정 탭 로그 확인');
    }).catch(function (e) { msg(msgSel, 'err', '게시 실패: ' + e.message); });
  }
  [['#pub2', '#prj-msg'], ['#pub3', '#copy-msg'], ['#pub4', '#seo-msg'], ['#pub5', '#set-msg'], ['#pub6', '#blog-msg']].forEach(function (p) {
    $(p[0]).addEventListener('click', function () { collectAll(); publish(p[1]); });
  });

  function uploadFile(file) {
    return fetch('/api/upload?name=' + encodeURIComponent(file.name), { method: 'POST', body: file })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r.ok) throw new Error('업로드 실패'); return r.path; });
  }

  function renderContent() {
    renderCopy();
    renderSeo();
    renderPrjList();
    renderBlogList();
    var s = DB.settings || {};
    $('#s-open').value = s.recruit_open || '';
    $('#s-close').value = s.recruit_close || '';
    $('#s-mail').value = s.mail_to || '';
    $('#dash-note').textContent = LOCAL ?
      '로컬 관리 모드: 신청·문의는 이 컴퓨터의 data 폴더에 저장됩니다. 콘텐츠 수정은 저장 후 게시(굽기)로 사이트에 반영하세요.' : '';
    renderDday();
  }

  // ── 카피 ────────────────────────────────────────
  function renderCopy() {
    var groups = {};
    Object.entries(DB.copy || {}).forEach(function (kv) {
      (groups[kv[1].page] = groups[kv[1].page] || []).push([kv[0], kv[1]]);
    });
    $('#copy-groups').innerHTML = Object.entries(groups).map(function (g) {
      return '<div class="card"><h3>' + esc(g[0]) + '</h3>' +
        g[1].map(function (kv) {
          return '<div class="f-row"><label>' + esc(kv[1].label) + '</label>' +
            '<textarea data-ckey="' + esc(kv[0]) + '">' + esc(kv[1].value) + '</textarea></div>';
        }).join('') + '</div>';
    }).join('');
    // FAQ
    $('#faq-list').innerHTML = (DB.faq_home || []).map(function (f, i) {
      return '<div class="ed-item" data-fi="' + i + '"><div class="top"><span class="ttl">문항 ' + (i + 1) + '</span>' +
        '<button class="mini del" data-act="faq-del">삭제</button></div>' +
        '<div class="f-row"><label>질문</label><input data-fq value="' + esc(f.q) + '"></div>' +
        '<div class="f-row"><label>답변</label><textarea data-fa>' + esc(f.a) + '</textarea></div></div>';
    }).join('');
  }
  $('#faq-add').addEventListener('click', function () {
    collectAll();
    (DB.faq_home = DB.faq_home || []).push({ q: '', a: '' });
    renderCopy();
  });
  $('#faq-list').addEventListener('click', function (e) {
    if (e.target.dataset.act !== 'faq-del') return;
    collectAll();
    DB.faq_home.splice(+e.target.closest('.ed-item').dataset.fi, 1);
    renderCopy();
  });
  $('#copy-save').addEventListener('click', function () { collectAll(); saveDB('#copy-msg'); });

  // ── SEO ─────────────────────────────────────────
  function renderSeo() {
    $('#seo-list').innerHTML = Object.entries(DB.seo || {}).map(function (kv) {
      var name = kv[0] === 'index.html' ? '홈' : kv[0].replace('/index.html', '');
      return '<div class="card" data-seo="' + esc(kv[0]) + '"><h3>' + esc(name) + '</h3>' +
        '<div class="f-row"><label>title (' + (kv[1].title || '').length + '자)</label><input data-st value="' + esc(kv[1].title) + '"></div>' +
        '<div class="f-row"><label>description (' + (kv[1].description || '').length + '자, 80~160자 권장)</label><textarea data-sd>' + esc(kv[1].description) + '</textarea></div></div>';
    }).join('');
  }
  $('#seo-save').addEventListener('click', function () { collectAll(); saveDB('#seo-msg'); });

  // ── 프로젝트 (게시판형) ─────────────────────────
  var BADGES = ['모집 중', '진행 중', '참가 모집', '종료'];
  var TYPE_LABEL = { page: '게시판 등록', link: '외부 링크', code: '코드 관리' };
  var curPrj = -1;

  function renderPrjList() {
    var items = DB.projects.items || [];
    $('#prj-rows').innerHTML = items.map(function (it, i) {
      return '<tr data-i="' + i + '"' + (i === curPrj ? ' style="background:#F2F3FF"' : '') + '>' +
        '<td>' + (i + 1) + '</td>' +
        '<td class="em">' + esc(it.title || '(제목 없음)') + '</td>' +
        '<td>' + TYPE_LABEL[it.type] + '</td>' +
        '<td><span class="st s' + esc(it.badge) + '">' + esc(it.badge) + '</span></td>' +
        '<td><button class="mini" data-act="up">↑</button> <button class="mini" data-act="down">↓</button> ' +
        '<button class="mini del" data-act="del">삭제</button></td></tr>';
    }).join('');
  }

  $('#prj-rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr'); if (!tr) return;
    var i = +tr.dataset.i;
    var act = e.target.dataset.act;
    collectPrj();
    var arr = DB.projects.items;
    if (act === 'del') {
      if (!confirm('"' + (arr[i].title || arr[i].slug) + '" 프로젝트를 목록에서 삭제할까요?')) return;
      arr.splice(i, 1);
      if (curPrj === i) { curPrj = -1; $('#prj-editor-card').hidden = true; }
      renderPrjList();
      return;
    }
    if (act === 'up' && i > 0) { var t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t; if (curPrj === i) curPrj = i - 1; renderPrjList(); return; }
    if (act === 'down' && i < arr.length - 1) { var t2 = arr[i + 1]; arr[i + 1] = arr[i]; arr[i] = t2; if (curPrj === i) curPrj = i + 1; renderPrjList(); return; }
    // 행 클릭 → 편집
    curPrj = i;
    renderPrjList();
    openPrjEditor();
  });

  $('#prj-new').addEventListener('click', function () {
    var slug = prompt('프로젝트 주소(슬러그)를 입력하세요.\n영문 소문자·숫자·하이픈 (예: export2027, beauty-day3)');
    if (!slug) return;
    slug = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) { alert('영문 소문자·숫자·하이픈만 사용할 수 있습니다.'); return; }
    if ((DB.projects.items || []).some(function (it) { return it.slug === slug; })) { alert('이미 있는 슬러그입니다.'); return; }
    collectPrj();
    DB.projects.items.unshift({
      type: 'page', slug: slug, badge: '진행 중', title: '', meta: '', desc: '', thumb: '', thumb_mode: '',
      page: { kicker: '', subtitle: '', hero: '', lead: '', rows: [{ k: '행사명', v: '' }, { k: '일시', v: '' }, { k: '장소', v: '' }], wide: '', photos: [] },
    });
    curPrj = 0;
    renderPrjList();
    openPrjEditor();
    msg('#prj-msg', 'ok', slug + ' 생성. 내용 입력 후 저장·게시하면 카드와 페이지가 함께 만들어집니다.');
  });

  function openPrjEditor() {
    var it = DB.projects.items[curPrj];
    if (!it) return;
    $('#prj-editor-card').hidden = false;
    $('#prj-editor-title').textContent = (it.title || it.slug || '새 프로젝트') + ' — ' + TYPE_LABEL[it.type];
    var f = '';
    // 카드 공통
    f += '<h3 style="font-size:13px;color:var(--brand);margin-bottom:12px">카드 (프로젝트 목록에 보이는 것)</h3>';
    f += '<div class="f-grid3">' +
      '<div class="f-row"><label>제목</label><input data-c="title" value="' + esc(it.title) + '"></div>' +
      '<div class="f-row"><label>배지</label><select data-c="badge">' +
      BADGES.map(function (b) { return '<option' + (b === it.badge ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select></div>' +
      (it.type === 'link'
        ? '<div class="f-row"><label>링크 주소</label><input data-c="href" value="' + esc(it.href || '') + '"></div>'
        : '<div class="f-row"><label>주소(슬러그)</label><input value="' + esc(it.slug || '') + '" disabled></div>') +
      '</div>';
    f += '<div class="f-row"><label>메타 한 줄</label><input data-c="meta" value="' + esc(it.meta) + '"></div>';
    f += '<div class="f-row"><label>카드 설명</label><textarea data-c="desc">' + esc(it.desc) + '</textarea></div>';
    f += '<div class="f-grid2">' +
      '<div class="f-row"><label>썸네일</label><div class="thumb-pick">' +
      '<img src="../' + esc(it.thumb) + '" onerror="this.style.opacity=.2">' +
      '<input data-c="thumb" value="' + esc(it.thumb) + '" style="flex:1">' +
      '<label class="mini" style="cursor:pointer">파일<input type="file" accept="image/*" data-up="thumb" hidden></label></div></div>' +
      '<div class="f-row"><label>썸네일 표시</label><select data-c="thumb_mode">' +
      '<option value=""' + (!it.thumb_mode ? ' selected' : '') + '>사진 (꽉 채움)</option>' +
      '<option value="logo"' + (it.thumb_mode === 'logo' ? ' selected' : '') + '>로고 (여백 두고 가운데)</option>' +
      '</select></div></div>';

    if (it.type === 'code') {
      f += '<div class="hint" style="margin-top:6px">이 프로젝트의 상세 페이지는 별도 제작 페이지라 코드로 관리됩니다. 카드 정보만 수정할 수 있습니다.</div>';
    }
    if (it.type === 'page') {
      var d = it.page;
      f += '<h3 style="font-size:13px;color:var(--brand);margin:20px 0 12px">상세 페이지</h3>';
      f += '<div class="f-grid2">' +
        '<div class="f-row"><label>킥커 (연도·짧은 라벨)</label><input data-p="kicker" value="' + esc(d.kicker) + '"></div>' +
        '<div class="f-row"><label>부제 (섹션 제목)</label><input data-p="subtitle" value="' + esc(d.subtitle) + '"></div></div>';
      f += '<div class="f-row"><label>리드 문단</label><textarea data-p="lead">' + esc(d.lead) + '</textarea></div>';
      f += '<div class="f-grid2">' +
        '<div class="f-row"><label>히어로 이미지</label><div class="thumb-pick">' +
        '<input data-p="hero" value="' + esc(d.hero) + '" style="flex:1">' +
        '<label class="mini" style="cursor:pointer">파일<input type="file" accept="image/*" data-up="hero" hidden></label></div></div>' +
        '<div class="f-row"><label>와이드 사진 (선택)</label><div class="thumb-pick">' +
        '<input data-p="wide" value="' + esc(d.wide || '') + '" style="flex:1">' +
        '<label class="mini" style="cursor:pointer">파일<input type="file" accept="image/*" data-up="wide" hidden></label></div></div></div>';
      f += '<h3 style="font-size:13px;margin:14px 0 10px">개요 표</h3><div id="rows-list">' +
        d.rows.map(function (r, i) {
          return '<div class="ed-item" data-ri="' + i + '"><div class="top"><span class="ttl">행 ' + (i + 1) + '</span>' +
            '<button class="mini" data-ract="up">↑</button><button class="mini" data-ract="down">↓</button>' +
            '<button class="mini del" data-ract="del">삭제</button></div>' +
            '<div class="f-grid2"><div class="f-row"><label>항목</label><input data-rk value="' + esc(r.k) + '"></div>' +
            '<div class="f-row"><label>내용</label><input data-rv value="' + esc(r.v) + '"></div></div></div>';
        }).join('') + '</div>' +
        '<button class="add-btn" id="row-add">+ 행 추가</button>';
      f += '<h3 style="font-size:13px;margin:14px 0 10px">현장 사진</h3><div id="ph-list">' +
        (d.photos || []).map(function (p, i) {
          return '<div class="ed-item" data-pi="' + i + '"><div class="top"><span class="ttl">사진 ' + (i + 1) + '</span>' +
            '<button class="mini del" data-pact="del">삭제</button></div>' +
            '<div class="thumb-pick"><img src="../' + esc(p.src) + '" onerror="this.style.opacity=.2">' +
            '<input data-psrc value="' + esc(p.src) + '" style="flex:1" placeholder="경로">' +
            '<input data-palt value="' + esc(p.alt || '') + '" style="width:150px" placeholder="설명"></div></div>';
        }).join('') + '</div>' +
        '<button class="add-btn" id="ph-add">+ 사진 추가 (파일 선택)</button>' +
        '<input type="file" accept="image/*" id="ph-file" hidden>';
    }
    $('#prj-form').innerHTML = f;

    var ra = $('#row-add');
    if (ra) ra.addEventListener('click', function () { collectPrj(); it.page.rows.push({ k: '', v: '' }); openPrjEditor(); });
    var pa = $('#ph-add');
    if (pa) {
      pa.addEventListener('click', function () { $('#ph-file').click(); });
      $('#ph-file').addEventListener('change', function () {
        if (!this.files.length) return;
        uploadFile(this.files[0]).then(function (p) {
          collectPrj(); it.page.photos.push({ src: p, alt: '' }); openPrjEditor();
        }).catch(function (er) { msg('#prj-msg', 'err', er.message); });
      });
    }
  }

  $('#prj-form').addEventListener('click', function (e) {
    var ract = e.target.dataset.ract, pact = e.target.dataset.pact;
    if (!ract && !pact) return;
    var it = DB.projects.items[curPrj];
    collectPrj();
    if (ract) {
      var i = +e.target.closest('.ed-item').dataset.ri;
      if (ract === 'del') it.page.rows.splice(i, 1);
      if (ract === 'up' && i > 0) { var t = it.page.rows[i - 1]; it.page.rows[i - 1] = it.page.rows[i]; it.page.rows[i] = t; }
      if (ract === 'down' && i < it.page.rows.length - 1) { var t2 = it.page.rows[i + 1]; it.page.rows[i + 1] = it.page.rows[i]; it.page.rows[i] = t2; }
    }
    if (pact === 'del') it.page.photos.splice(+e.target.closest('.ed-item').dataset.pi, 1);
    openPrjEditor();
  });
  $('#prj-form').addEventListener('change', function (e) {
    var which = e.target.dataset.up;
    if (!which || !e.target.files.length) return;
    var it = DB.projects.items[curPrj];
    uploadFile(e.target.files[0]).then(function (p) {
      collectPrj();
      if (which === 'thumb') it.thumb = p; else it.page[which] = p;
      openPrjEditor();
    }).catch(function (er) { msg('#prj-msg', 'err', er.message); });
  });

  function collectPrj() {
    var it = DB.projects.items[curPrj];
    if (!it || $('#prj-editor-card').hidden) return;
    $$('#prj-form [data-c]').forEach(function (el) { it[el.dataset.c] = el.value; });
    if (it.type === 'page') {
      $$('#prj-form [data-p]').forEach(function (el) { it.page[el.dataset.p] = el.value; });
      var rows = [];
      $$('#rows-list .ed-item').forEach(function (x) {
        rows.push({ k: x.querySelector('[data-rk]').value, v: x.querySelector('[data-rv]').value });
      });
      it.page.rows = rows;
      var phs = [];
      $$('#ph-list .ed-item').forEach(function (x) {
        phs.push({ src: x.querySelector('[data-psrc]').value, alt: x.querySelector('[data-palt]').value });
      });
      it.page.photos = phs;
    }
    renderPrjList();
  }

  // (구 카드/페이지 편집기 잔재 무효화)
  $('#prj-save').addEventListener('click', function () { collectAll(); saveDB('#prj-msg'); });

  // ── 블로그 (게시판형) ───────────────────────────
  var curPost = -1;

  function renderBlogList() {
    var posts = (DB.blog && DB.blog.posts) || [];
    $('#blog-rows').innerHTML = posts.map(function (p, i) {
      return '<tr data-i="' + i + '"' + (i === curPost ? ' style="background:#F2F3FF"' : '') + '>' +
        '<td>' + esc(p.date || '') + '</td>' +
        '<td class="em">' + esc(p.title || '(제목 없음)') + '</td>' +
        '<td>' + esc(p.category || '') + '</td>' +
        '<td>' + (p.hidden ? '<span class="st s보류">숨김</span>' : '<span class="st s선정">노출</span>') + '</td>' +
        '<td><button class="mini del" data-act="del">삭제</button></td></tr>';
    }).join('');
  }

  $('#blog-rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr'); if (!tr) return;
    var i = +tr.dataset.i;
    collectBlog();
    var posts = DB.blog.posts;
    if (e.target.dataset.act === 'del') {
      if (!confirm('"' + (posts[i].title || posts[i].slug) + '" 글을 삭제할까요?')) return;
      posts.splice(i, 1);
      if (curPost === i) { curPost = -1; $('#blog-editor-card').hidden = true; }
      renderBlogList();
      return;
    }
    curPost = i;
    renderBlogList();
    openBlogEditor();
  });

  $('#blog-new').addEventListener('click', function () {
    var slug = prompt('글 주소(슬러그)를 입력하세요.\n영문 소문자·숫자·하이픈 (예: vietnam-market-2026)');
    if (!slug) return;
    slug = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) { alert('영문 소문자·숫자·하이픈만 사용할 수 있습니다.'); return; }
    DB.blog = DB.blog || { categories: [], posts: [] };
    if (DB.blog.posts.some(function (p) { return p.slug === slug; })) { alert('이미 있는 슬러그입니다.'); return; }
    collectBlog();
    var today = new Date();
    var ds = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    DB.blog.posts.unshift({ slug: slug, title: '', category: DB.blog.categories[0] || '', date: ds,
      cover: '', excerpt: '', body: '', seo_title: '', seo_desc: '', hidden: false });
    curPost = 0;
    renderBlogList();
    openBlogEditor();
    msg('#blog-msg', 'ok', slug + ' 생성. 작성 후 저장·게시하면 목록과 글 페이지가 만들어집니다.');
  });

  function openBlogEditor() {
    var p = DB.blog.posts[curPost];
    if (!p) return;
    rteSrcMode = false;
    $('#blog-editor-card').hidden = false;
    $('#blog-editor-title').textContent = (p.title || p.slug) + ' — /blog/' + p.slug + '/';
    var cats = (DB.blog.categories || []);
    $('#blog-form').innerHTML =
      '<div class="f-grid3">' +
      '<div class="f-row"><label>제목</label><input data-b="title" value="' + esc(p.title) + '"></div>' +
      '<div class="f-row"><label>카테고리 (직접 입력 가능)</label><input data-b="category" list="blog-cats-dl" value="' + esc(p.category) + '">' +
      '<datalist id="blog-cats-dl">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +
      '<div class="f-row"><label>날짜</label><input type="date" data-b="date" value="' + esc(p.date) + '"></div>' +
      '</div>' +
      '<div class="f-grid2">' +
      '<div class="f-row"><label>커버 이미지</label><div class="thumb-pick">' +
      '<img src="../' + esc(p.cover) + '" onerror="this.style.opacity=.2">' +
      '<input data-b="cover" value="' + esc(p.cover) + '" style="flex:1">' +
      '<label class="mini" style="cursor:pointer">파일<input type="file" accept="image/*" data-bup="cover" hidden></label></div></div>' +
      '<div class="f-row"><label>노출</label><select data-b="hidden">' +
      '<option value=""' + (!p.hidden ? ' selected' : '') + '>노출</option>' +
      '<option value="1"' + (p.hidden ? ' selected' : '') + '>숨김</option></select></div>' +
      '</div>' +
      '<div class="f-row"><label>요약 (목록 카드·검색 설명)</label><textarea data-b="excerpt">' + esc(p.excerpt) + '</textarea></div>' +
      '<div class="f-row"><label>본문</label>' +
      '<div class="rte"><div class="rte-bar">' +
      '<button data-cmd="h2" title="제목">제목</button>' +
      '<button data-cmd="h3" title="소제목">소제목</button>' +
      '<button data-cmd="p" title="본문">본문</button>' +
      '<span class="div"></span>' +
      '<button data-cmd="bold" title="굵게"><b>B</b></button>' +
      '<button data-cmd="italic" title="기울임"><i>I</i></button>' +
      '<button data-cmd="underline" title="밑줄"><u>U</u></button>' +
      '<span class="div"></span>' +
      '<button data-cmd="ul" title="목록">• 목록</button>' +
      '<button data-cmd="ol" title="번호 목록">1. 번호</button>' +
      '<button data-cmd="quote" title="인용">❝ 인용</button>' +
      '<span class="div"></span>' +
      '<button data-cmd="link" title="링크">링크</button>' +
      '<button data-cmd="img" title="이미지 업로드">이미지</button>' +
      '<button data-cmd="table" title="표 삽입">표</button>' +
      '<span class="div"></span>' +
      '<button data-cmd="src" id="rte-srcbtn" title="HTML 소스 편집">HTML</button>' +
      '</div>' +
      '<div class="rte-area" id="rte-area" contenteditable="true">' + p.body + '</div>' +
      '<textarea id="rte-src" hidden></textarea>' +
      '<input type="file" accept="image/*" id="rte-imgfile" hidden>' +
      '</div></div>' +
      '<div class="f-grid2">' +
      '<div class="f-row"><label>SEO 제목 (비우면 글 제목 사용)</label><input data-b="seo_title" value="' + esc(p.seo_title || '') + '"></div>' +
      '<div class="f-row"><label>SEO 설명 (비우면 요약 사용)</label><input data-b="seo_desc" value="' + esc(p.seo_desc || '') + '"></div>' +
      '</div>';
  }

  $('#blog-form').addEventListener('change', function (e) {
    if (e.target.dataset.bup === 'cover' && e.target.files.length) {
      var p = DB.blog.posts[curPost];
      uploadFile(e.target.files[0]).then(function (pth) {
        collectBlog(); p.cover = pth; openBlogEditor();
      }).catch(function (er) { msg('#blog-msg', 'err', er.message); });
    }
    if (e.target.id === 'rte-imgfile' && e.target.files.length) {
      uploadFile(e.target.files[0]).then(function (pth) {
        rteInsert('<img src="/' + pth + '" alt="">');
        msg('#blog-msg', 'ok', '이미지가 본문에 삽입되었습니다.');
      }).catch(function (er) { msg('#blog-msg', 'err', er.message); });
    }
  });

  // ── 위지윅 에디터 ───────────────────────────────
  var rteSrcMode = false;
  function rteArea() { return $('#rte-area'); }
  function rteInsert(html) {
    var area = rteArea();
    area.focus();
    document.execCommand('insertHTML', false, html);
  }
  function rteBody() {
    if (!rteArea()) return null;
    return rteSrcMode ? $('#rte-src').value : rteArea().innerHTML;
  }
  $('#blog-form').addEventListener('mousedown', function (e) {
    // 툴바 클릭이 에디터 포커스(선택 영역)를 뺏지 않게
    if (e.target.closest('.rte-bar')) e.preventDefault();
  });
  $('#blog-form').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cmd]');
    if (!btn) return;
    var cmd = btn.dataset.cmd;
    var area = rteArea();
    if (cmd === 'src') {
      var src = $('#rte-src');
      rteSrcMode = !rteSrcMode;
      if (rteSrcMode) {
        src.value = area.innerHTML.replace(/></g, '>\n<');
        area.hidden = true; src.hidden = false;
        btn.classList.add('on');
      } else {
        area.innerHTML = src.value;
        src.hidden = true; area.hidden = false;
        btn.classList.remove('on');
      }
      return;
    }
    if (rteSrcMode) { msg('#blog-msg', 'err', 'HTML 모드에서는 도구를 쓸 수 없습니다. HTML 버튼으로 돌아가세요.'); return; }
    area.focus();
    if (cmd === 'h2' || cmd === 'h3') document.execCommand('formatBlock', false, cmd.toUpperCase());
    else if (cmd === 'p') document.execCommand('formatBlock', false, 'P');
    else if (cmd === 'bold') document.execCommand('bold');
    else if (cmd === 'italic') document.execCommand('italic');
    else if (cmd === 'underline') document.execCommand('underline');
    else if (cmd === 'ul') document.execCommand('insertUnorderedList');
    else if (cmd === 'ol') document.execCommand('insertOrderedList');
    else if (cmd === 'quote') document.execCommand('formatBlock', false, 'BLOCKQUOTE');
    else if (cmd === 'link') {
      var url = prompt('링크 주소 (예: https://... 또는 /apply/)');
      if (url) document.execCommand('createLink', false, url);
    }
    else if (cmd === 'img') $('#rte-imgfile').click();
    else if (cmd === 'table') {
      var n = parseInt(prompt('표 행 수 (항목·내용 2열 표)', '3'), 10);
      if (!n || n < 1) return;
      var rows = '';
      for (var i = 0; i < n; i++) rows += '<tr><th>항목</th><td>내용</td></tr>';
      rteInsert('<table>' + rows + '</table><p></p>');
    }
  });

  function collectBlog() {
    var p = DB.blog && DB.blog.posts && DB.blog.posts[curPost];
    if (!p || $('#blog-editor-card').hidden) return;
    $$('#blog-form [data-b]').forEach(function (el) {
      if (el.dataset.b === 'hidden') p.hidden = !!el.value;
      else p[el.dataset.b] = el.value;
    });
    var body = rteBody();
    if (body !== null) p.body = body;
    // 새 카테고리면 목록에 추가
    if (p.category && DB.blog.categories.indexOf(p.category) < 0) DB.blog.categories.push(p.category);
    renderBlogList();
  }

  $('#blog-save').addEventListener('click', function () { collectAll(); saveDB('#blog-msg'); });

  // ── 화면 → DB 수집 ──────────────────────────────
  function collectAll() {
    if (!DB) return;
    // 카피
    $$('#copy-groups textarea[data-ckey]').forEach(function (t) {
      if (DB.copy[t.dataset.ckey]) DB.copy[t.dataset.ckey].value = t.value;
    });
    // FAQ
    var faqs = [];
    $$('#faq-list .ed-item').forEach(function (it) {
      faqs.push({ q: it.querySelector('[data-fq]').value, a: it.querySelector('[data-fa]').value });
    });
    if ($('#faq-list').children.length || faqs.length) DB.faq_home = faqs;
    // SEO
    $$('#seo-list .card').forEach(function (c) {
      var k = c.dataset.seo;
      if (DB.seo[k]) {
        DB.seo[k].title = c.querySelector('[data-st]').value;
        DB.seo[k].description = c.querySelector('[data-sd]').value;
      }
    });
    // 프로젝트·블로그 (게시판형)
    collectPrj();
    collectBlog();
    // 설정
    DB.settings.recruit_open = $('#s-open').value;
    DB.settings.recruit_close = $('#s-close').value;
    DB.settings.mail_to = $('#s-mail').value.trim();
  }
  $('#set-save').addEventListener('click', function () { collectAll(); saveDB('#set-msg').then(renderDday); });
})();
