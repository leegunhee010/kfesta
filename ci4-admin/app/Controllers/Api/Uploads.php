<?php

namespace App\Controllers\Api;

use CodeIgniter\HTTP\ResponseInterface;

/**
 * 이미지 업로드 (adminAuth 필터 뒤)
 * POST /api/upload?name=원본파일명 — 바디는 파일 바이너리 그대로 (프론트 계약)
 *
 * 회사 표준: 화이트리스트 + 용량 제한 + 파일명 재생성.
 * 사이트 이미지 특성상 webp/gif까지 허용(표준의 jpg/png/pdf에서 이미지로 조정), svg는 XSS 위험으로 제외.
 */
class Uploads extends ApiController
{
    private const ALLOWED = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];
    private const MAX_BYTES = 10 * 1024 * 1024; // 히어로급 webp 고려 10MB

    public function create(): ResponseInterface
    {
        $raw = $this->request->getBody();
        if ($raw === null || $raw === '') {
            return $this->fail(400, 'empty body');
        }
        if (strlen($raw) > self::MAX_BYTES) {
            return $this->fail(400, 'too big (max 10MB)');
        }

        $origin = (string) ($this->request->getGet('name') ?? 'file');
        $ext    = strtolower(pathinfo($origin, PATHINFO_EXTENSION));
        if (! isset(self::ALLOWED[$ext])) {
            return $this->fail(400, 'not allowed: ' . $ext . ' (jpg/png/webp/gif)');
        }

        // 실제 콘텐츠 MIME 검증 (확장자 위조 차단)
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->buffer($raw);
        if (! in_array($mime, array_values(self::ALLOWED), true)) {
            return $this->fail(400, 'mime mismatch: ' . $mime);
        }

        // 파일명 재생성 (원본명 미사용)
        $stamped = bin2hex(random_bytes(6)) . '-' . time() . '.' . ($ext === 'jpeg' ? 'jpg' : $ext);
        $dir     = FCPATH . 'assets/img/uploads';
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        if (file_put_contents($dir . '/' . $stamped, $raw) === false) {
            return $this->fail(500, 'write failed (권한 확인: ' . $dir . ')');
        }

        return $this->ok(['path' => 'assets/img/uploads/' . $stamped]);
    }
}
