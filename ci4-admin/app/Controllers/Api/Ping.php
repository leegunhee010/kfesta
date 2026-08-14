<?php

namespace App\Controllers\Api;

use CodeIgniter\HTTP\ResponseInterface;

class Ping extends ApiController
{
    /** GET /api/ping — 프론트가 자체 서버 모드를 감지하는 신호 */
    public function index(): ResponseInterface
    {
        return $this->ok(['mode' => 'server']);
    }
}
