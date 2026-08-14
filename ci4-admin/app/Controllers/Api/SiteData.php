<?php

namespace App\Controllers\Api;

use CodeIgniter\HTTP\ResponseInterface;

/**
 * 사이트 콘텐츠 단일원본(data/site.json) 읽기/쓰기 (adminAuth 필터 뒤)
 * 파일 기반을 유지한다 — 굽기 스크립트(_tools/bake.mjs)가 이 파일을 읽는다.
 */
class SiteData extends ApiController
{
    private function dataPath(): string
    {
        return FCPATH . 'data/site.json';
    }

    /** GET /api/data */
    public function show(): ResponseInterface
    {
        $path = $this->dataPath();
        if (! is_file($path)) {
            return $this->fail(404, 'site.json not found');
        }

        return $this->response
            ->setContentType('application/json', 'utf-8')
            ->setBody(file_get_contents($path));
    }

    /** POST /api/data — 바디 전체가 site.json */
    public function save(): ResponseInterface
    {
        $raw = $this->request->getBody();
        if ($raw === null || json_decode($raw) === null) {
            return $this->fail(400, 'invalid json');
        }

        $path = $this->dataPath();
        // 덮어쓰기 전 백업 보관 (writable/backups)
        if (is_file($path)) {
            if (! is_dir(WRITEPATH . 'backups')) {
                mkdir(WRITEPATH . 'backups', 0755, true);
            }
            @copy($path, WRITEPATH . 'backups/site.json.' . date('Ymd-His'));
        }
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }
        if (file_put_contents($path, $raw) === false) {
            return $this->fail(500, 'write failed (권한 확인: ' . $path . ')');
        }

        return $this->ok();
    }
}
