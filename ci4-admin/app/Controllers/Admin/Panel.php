<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;

/**
 * 관리자 UI 서빙 (adminAuth 필터 뒤)
 *
 * 관리자 정적 파일(index.html, admin.js)은 public/ 밖의 admin-ui/에 둔다.
 * public/admin/에 두면 웹서버가 인증 없이 직접 서빙하므로 반드시 밖에 둘 것.
 * (사이트의 admin/ 폴더를 CI4 루트의 admin-ui/로 옮긴다 — README 참고)
 */
class Panel extends BaseController
{
    private const MIME = [
        'html' => 'text/html', 'js' => 'text/javascript', 'css' => 'text/css',
        'json' => 'application/json', 'png' => 'image/png', 'svg' => 'image/svg+xml',
        'webp' => 'image/webp', 'ico' => 'image/x-icon',
    ];

    public function serve(string $path = 'index.html')
    {
        $base = ROOTPATH . 'admin-ui/';
        // 경로 정규화 + 탈출 차단
        $real = realpath($base . str_replace(['..', "\0"], '', $path));
        if ($real === false || ! str_starts_with($real, realpath($base))) {
            $real = realpath($base . 'index.html');
        }
        if ($real === false || ! is_file($real)) {
            return $this->response->setStatusCode(404)->setBody('404');
        }

        $ext  = strtolower(pathinfo($real, PATHINFO_EXTENSION));
        $mime = self::MIME[$ext] ?? 'application/octet-stream';

        return $this->response
            ->setContentType($mime, 'utf-8')
            ->setHeader('Cache-Control', 'no-cache')
            ->setBody(file_get_contents($real));
    }
}
