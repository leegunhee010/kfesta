<?php

namespace App\Controllers\Api;

use App\Models\InquiryModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * 참가문의 관리 (adminAuth 필터 뒤)
 * - GET  /api/inqs : 전체 목록(최신순)
 * - POST /api/inqs : {id, status?, memo?} 부분 수정
 */
class Inquiries extends ApiController
{
    public function index(): ResponseInterface
    {
        $rows = model(InquiryModel::class)->orderBy('created_at', 'DESC')->findAll();

        foreach ($rows as &$row) {
            $row['id']         = (int) $row['id'];
            $row['created_at'] = $this->isoDate($row['created_at']);
            if (! empty($row['extra'])) {
                $extra = json_decode($row['extra'], true);
                if (is_array($extra)) {
                    $row += $extra;
                }
            }
            unset($row['extra'], $row['updated_at'], $row['deleted_at']);
        }

        return $this->response->setJSON($rows);
    }

    public function patch(): ResponseInterface
    {
        $body = $this->jsonBody();
        if ($body === null || ! isset($body['id'])) {
            return $this->fail(400, 'invalid json');
        }

        $model = model(InquiryModel::class);
        if (! $model->find((int) $body['id'])) {
            return $this->fail(404, 'not found');
        }

        $patch = array_intersect_key($body, array_flip(['status', 'memo']));
        if ($patch !== []) {
            $model->update((int) $body['id'], $patch);
        }

        return $this->ok();
    }
}
