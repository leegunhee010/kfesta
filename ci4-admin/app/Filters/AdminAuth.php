<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * 관리자 세션 인증 필터
 * - /api/* : 미인증이면 401 JSON
 * - 그 외(/admin) : 로그인 페이지로 리다이렉트
 */
class AdminAuth implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (session()->get('admin_id')) {
            return null;
        }

        if (str_starts_with($request->getUri()->getPath(), '/api/')) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON(['ok' => false, 'error' => 'auth required']);
        }

        return redirect()->to('/admin/login');
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
