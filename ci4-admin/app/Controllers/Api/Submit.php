<?php

namespace App\Controllers\Api;

use App\Models\ApplicationModel;
use App\Models\InquiryModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * 공개 폼 접수 (인증 없음)
 * - POST /api/submit/apply   : 참가신청 (site.js 41필드 폼)
 * - POST /api/submit/inquiry : 참가문의
 *
 * 저장 성공 시 Apps Script(구글시트+메일알림)로도 서버에서 전달한다(실패해도 접수는 유효).
 * 프론트는 자체 서버 API가 성공하면 Apps Script를 직접 호출하지 않기 때문.
 */
class Submit extends ApiController
{
    private const APPLY_FIELDS = [
        'company', 'company_en', 'ceo', 'biz_no', 'founded', 'employees', 'address', 'website',
        'name', 'position', 'phone', 'email',
        'product_name', 'category', 'product_desc', 'product_spec', 'certifications', 'store_url',
        'export_exp', 'export_countries', 'vn_exp', 'trade_types', 'referral', 'questions',
    ];

    private const INQUIRY_FIELDS = ['name', 'phone', 'email', 'company', 'position', 'category'];

    public function apply(): ResponseInterface
    {
        $body = $this->jsonBody();
        if ($body === null) {
            return $this->fail(400, 'invalid json');
        }
        foreach (['company', 'name', 'phone', 'email'] as $required) {
            if (trim((string) ($body[$required] ?? '')) === '') {
                return $this->fail(400, 'missing: ' . $required);
            }
        }

        $row = $this->pick($body, self::APPLY_FIELDS);
        $id  = model(ApplicationModel::class)->insert($row);
        if (! $id) {
            return $this->fail(500, 'insert failed');
        }

        $this->forwardToSheet('apply', $body);

        return $this->ok(['id' => $id]);
    }

    public function inquiry(): ResponseInterface
    {
        $body = $this->jsonBody();
        if ($body === null) {
            return $this->fail(400, 'invalid json');
        }
        foreach (['name', 'phone', 'email'] as $required) {
            if (trim((string) ($body[$required] ?? '')) === '') {
                return $this->fail(400, 'missing: ' . $required);
            }
        }

        $row = $this->pick($body, self::INQUIRY_FIELDS);
        $id  = model(InquiryModel::class)->insert($row);
        if (! $id) {
            return $this->fail(500, 'insert failed');
        }

        $this->forwardToSheet('inquiry', $body);

        return $this->ok(['id' => $id]);
    }

    /** 화이트리스트 필드만 추출, 정의 외 필드는 extra(JSON)로 보존 */
    private function pick(array $body, array $fields): array
    {
        $row = ['status' => '신규', 'memo' => ''];
        foreach ($fields as $f) {
            $row[$f] = mb_substr(trim((string) ($body[$f] ?? '')), 0, 5000);
        }
        $extra = array_diff_key($body, array_flip($fields));
        if ($extra !== []) {
            $row['extra'] = json_encode($extra, JSON_UNESCAPED_UNICODE);
        }

        return $row;
    }

    /** Apps Script 전달 (구글시트 기록 + 메일 알림) — 비필수, 짧은 타임아웃 */
    private function forwardToSheet(string $type, array $data): void
    {
        $endpoint = env('kfesta.sheetEndpoint', '');
        if ($endpoint === '') {
            return;
        }

        try {
            $ch = curl_init($endpoint);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => json_encode(['type' => $type, 'data' => $data], JSON_UNESCAPED_UNICODE),
                CURLOPT_HTTPHEADER     => ['Content-Type: text/plain;charset=utf-8'],
                CURLOPT_FOLLOWLOCATION => true,   // Apps Script는 302 후 응답
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 8,
            ]);
            curl_exec($ch);
            curl_close($ch);
        } catch (\Throwable $e) {
            log_message('warning', '시트 전달 실패: ' . $e->getMessage());
        }
    }
}
