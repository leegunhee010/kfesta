<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * KFESTA 접수·관리자 테이블 (MySQL 5.6 호환)
 * - utf8mb4 + 인덱스 컬럼은 VARCHAR(191) (5.6 인덱스 767바이트 제한)
 * - DB 레벨 외래키 없음 (회사 표준: 논리적 관계만)
 */
class CreateKfestaTables extends Migration
{
    public function up()
    {
        $common = [
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
            'deleted_at' => ['type' => 'DATETIME', 'null' => true],
        ];

        // ── 참가신청 ──
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'company'          => ['type' => 'VARCHAR', 'constraint' => 191],
            'company_en'       => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'ceo'              => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'biz_no'           => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'founded'          => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'employees'        => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'address'          => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'website'          => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'name'             => ['type' => 'VARCHAR', 'constraint' => 100],
            'position'         => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'phone'            => ['type' => 'VARCHAR', 'constraint' => 50],
            'email'            => ['type' => 'VARCHAR', 'constraint' => 191],
            'product_name'     => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'category'         => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'product_desc'     => ['type' => 'TEXT', 'null' => true],
            'product_spec'     => ['type' => 'TEXT', 'null' => true],
            'certifications'   => ['type' => 'TEXT', 'null' => true],
            'store_url'        => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'export_exp'       => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'export_countries' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'vn_exp'           => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'trade_types'      => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'referral'         => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'questions'        => ['type' => 'TEXT', 'null' => true],
            'status'           => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => '신규'],
            'memo'             => ['type' => 'TEXT', 'null' => true],
            'extra'            => ['type' => 'TEXT', 'null' => true], // 폼 정의 외 필드 JSON 보존
        ] + $common);
        $this->forge->addKey('id', true);
        $this->forge->addKey('created_at');
        $this->forge->addKey('status');
        $this->forge->createTable('applications', true, [
            'ENGINE' => 'InnoDB', 'CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci',
        ]);

        // ── 참가문의 ──
        $this->forge->addField([
            'id'       => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name'     => ['type' => 'VARCHAR', 'constraint' => 100],
            'phone'    => ['type' => 'VARCHAR', 'constraint' => 50],
            'email'    => ['type' => 'VARCHAR', 'constraint' => 191],
            'company'  => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => true],
            'position' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'category' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'status'   => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => '신규'],
            'memo'     => ['type' => 'TEXT', 'null' => true],
            'extra'    => ['type' => 'TEXT', 'null' => true],
        ] + $common);
        $this->forge->addKey('id', true);
        $this->forge->addKey('created_at');
        $this->forge->addKey('status');
        $this->forge->createTable('inquiries', true, [
            'ENGINE' => 'InnoDB', 'CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci',
        ]);

        // ── 관리자 ──
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'email'         => ['type' => 'VARCHAR', 'constraint' => 191],
            'password_hash' => ['type' => 'VARCHAR', 'constraint' => 255],
        ] + $common);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('email');
        $this->forge->createTable('admins', true, [
            'ENGINE' => 'InnoDB', 'CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci',
        ]);

        // ── DB 세션 (회사 표준: DB 세션) ──
        $this->forge->addField([
            'id'         => ['type' => 'VARCHAR', 'constraint' => 128],
            'ip_address' => ['type' => 'VARCHAR', 'constraint' => 45],
            'timestamp'  => ['type' => 'TIMESTAMP', 'null' => false],
            'data'       => ['type' => 'BLOB', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('timestamp');
        $this->forge->createTable('ci_sessions', true, [
            'ENGINE' => 'InnoDB', 'CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci',
        ]);
    }

    public function down()
    {
        $this->forge->dropTable('applications', true);
        $this->forge->dropTable('inquiries', true);
        $this->forge->dropTable('admins', true);
        $this->forge->dropTable('ci_sessions', true);
    }
}
