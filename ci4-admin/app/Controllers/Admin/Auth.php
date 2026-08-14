<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\AdminModel;

/**
 * 관리자 로그인/로그아웃
 * 계정 생성: php spark kfesta:admin <email> <password>
 */
class Auth extends BaseController
{
    public function login()
    {
        if (session()->get('admin_id')) {
            return redirect()->to('/admin');
        }

        return view('admin/login');
    }

    public function attempt()
    {
        $email    = trim((string) $this->request->getPost('email'));
        $password = (string) $this->request->getPost('password');

        $admin = model(AdminModel::class)->where('email', $email)->first();
        if (! $admin || ! password_verify($password, $admin['password_hash'])) {
            // 실패 사유 비노출 (계정 존재 여부 추측 방지)
            return view('admin/login', ['error' => '이메일 또는 비밀번호가 올바르지 않습니다.']);
        }

        session()->regenerate();
        session()->set([
            'admin_id'    => (int) $admin['id'],
            'admin_email' => $admin['email'],
        ]);

        return redirect()->to('/admin');
    }

    public function logout()
    {
        session()->destroy();

        return redirect()->to('/admin/login');
    }
}
