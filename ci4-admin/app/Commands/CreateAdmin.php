<?php

namespace App\Commands;

use App\Models\AdminModel;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

/**
 * 관리자 계정 생성/비밀번호 재설정
 * php spark kfesta:admin admin@firstmkt.co.kr 비밀번호
 */
class CreateAdmin extends BaseCommand
{
    protected $group       = 'kfesta';
    protected $name        = 'kfesta:admin';
    protected $description = '관리자 계정을 생성하거나 비밀번호를 재설정합니다.';
    protected $usage       = 'kfesta:admin <email> <password>';

    public function run(array $params)
    {
        $email    = $params[0] ?? CLI::prompt('이메일');
        $password = $params[1] ?? CLI::prompt('비밀번호');

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            CLI::error('올바른 이메일이 아닙니다: ' . $email);

            return;
        }
        if (strlen($password) < 8) {
            CLI::error('비밀번호는 8자 이상으로 하세요.');

            return;
        }

        $model = model(AdminModel::class);
        $hash  = password_hash($password, PASSWORD_DEFAULT);
        $found = $model->withDeleted()->where('email', $email)->first();

        if ($found) {
            $model->update($found['id'], ['password_hash' => $hash, 'deleted_at' => null]);
            CLI::write('비밀번호 재설정 완료: ' . $email, 'green');
        } else {
            $model->insert(['email' => $email, 'password_hash' => $hash]);
            CLI::write('관리자 생성 완료: ' . $email, 'green');
        }
    }
}
