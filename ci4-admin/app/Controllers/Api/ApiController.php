<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * API 공통 베이스
 *
 * [응답 포맷 주의] 회사 표준은 {status, message, data}지만, 이 프로젝트의 /api/*는
 * 이미 라이브 중인 프론트(admin.js·site.js)가 로컬 admin-server.mjs 계약({ok: bool, ...})에
 * 맞춰져 있어 컷오버 시 프론트 무수정을 위해 기존 계약을 유지한다.
 * 신규로 추가하는 엔드포인트는 회사 표준 포맷을 따를 것.
 */
abstract class ApiController extends BaseController
{
    protected function ok(array $extra = []): ResponseInterface
    {
        return $this->response->setJSON(array_merge(['ok' => true], $extra));
    }

    protected function fail(int $code, string $error): ResponseInterface
    {
        return $this->response->setStatusCode($code)->setJSON(['ok' => false, 'error' => $error]);
    }

    /** JSON 바디 파싱 (실패 시 null) */
    protected function jsonBody(): ?array
    {
        $raw = $this->request->getBody();
        if ($raw === null || $raw === '') {
            return null;
        }
        $data = json_decode($raw, true);

        return is_array($data) ? $data : null;
    }

    /** DATETIME → ISO8601 (프론트 new Date() 호환) */
    protected function isoDate(?string $dt): ?string
    {
        if (! $dt) {
            return null;
        }

        return date('c', strtotime($dt));
    }
}
