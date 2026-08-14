<?php

namespace App\Controllers\Api;

use CodeIgniter\HTTP\ResponseInterface;

/**
 * 굽기 실행 (adminAuth 필터 뒤)
 * POST /api/bake — public/_tools/bake.mjs를 Node로 실행해 site.json → 정적 HTML 반영
 *
 * 요구사항: 서버에 Node.js 18+ 설치 (.env kfesta.nodeBin으로 경로 지정 가능)
 */
class Bake extends ApiController
{
    public function run(): ResponseInterface
    {
        $node   = (string) env('kfesta.nodeBin', 'node');
        $script = FCPATH . '_tools/bake.mjs';
        if (! is_file($script)) {
            return $this->fail(500, 'bake.mjs not found: ' . $script);
        }

        $cmd = escapeshellarg($node) . ' ' . escapeshellarg($script) . ' 2>&1';

        $descriptors = [1 => ['pipe', 'w']];
        $proc        = proc_open($cmd, $descriptors, $pipes, FCPATH);
        if (! is_resource($proc)) {
            return $this->fail(500, 'proc_open failed');
        }

        // 최대 120초 대기
        $log   = '';
        $start = time();
        stream_set_blocking($pipes[1], false);
        while (true) {
            $log .= (string) stream_get_contents($pipes[1]);
            $st = proc_get_status($proc);
            if (! $st['running']) {
                break;
            }
            if (time() - $start > 120) {
                proc_terminate($proc);
                fclose($pipes[1]);
                proc_close($proc);

                return $this->response->setStatusCode(500)->setJSON(['ok' => false, 'log' => "timeout\n" . $log]);
            }
            usleep(100000);
        }
        stream_set_blocking($pipes[1], true);
        $log .= (string) stream_get_contents($pipes[1]); // 종료 직후 남은 출력 회수
        fclose($pipes[1]);
        $exit = proc_close($proc);

        if ($exit !== 0) {
            return $this->response->setStatusCode(500)->setJSON(['ok' => false, 'log' => $log]);
        }

        return $this->response->setJSON(['ok' => true, 'log' => $log]);
    }
}
