<?php

use CodeIgniter\Router\RouteCollection;

/**
 * KFESTA 라우팅
 * - 정적 사이트는 웹서버(try_files)가 먼저 서빙하고, 없으면 CI4로 넘어온다.
 * - /api/* : 프론트(admin.js·site.js)가 쓰는 API. 기존 로컬 admin-server.mjs 계약을 그대로 유지.
 * - /admin : 관리자 UI(admin-ui/ 정적 파일)를 세션 인증 뒤에서 서빙.
 *
 * @var RouteCollection $routes
 */

// ── 공개 API ──────────────────────────────────────────
$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    $routes->get('ping', 'Ping::index');
    $routes->post('submit/apply', 'Submit::apply');
    $routes->post('submit/inquiry', 'Submit::inquiry');

    // ── 관리자 전용 API ──
    $routes->group('', ['filter' => 'adminAuth'], static function ($routes) {
        $routes->get('apps', 'Applications::index');
        $routes->post('apps', 'Applications::patch');
        $routes->get('inqs', 'Inquiries::index');
        $routes->post('inqs', 'Inquiries::patch');
        $routes->get('data', 'SiteData::show');
        $routes->post('data', 'SiteData::save');
        $routes->post('upload', 'Uploads::create');
        $routes->post('bake', 'Bake::run');
    });
});

// ── 관리자 화면 ───────────────────────────────────────
$routes->group('admin', ['namespace' => 'App\Controllers\Admin'], static function ($routes) {
    $routes->get('login', 'Auth::login');
    $routes->post('login', 'Auth::attempt');
    $routes->get('logout', 'Auth::logout');
    $routes->get('', 'Panel::serve', ['filter' => 'adminAuth']);
    $routes->get('(:any)', 'Panel::serve/$1', ['filter' => 'adminAuth']);
});
