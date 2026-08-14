-- KFESTA 스키마 (MySQL 5.6 직접 임포트용 — 마이그레이션 못 돌릴 때 대안)
-- 마이그레이션(php spark migrate)과 동일한 결과. 둘 중 하나만 실행할 것.
-- utf8mb4 인덱스 767바이트 제한 → 인덱스 대상 VARCHAR는 191

CREATE TABLE IF NOT EXISTS `applications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company` VARCHAR(191) NOT NULL,
  `company_en` VARCHAR(255) NULL,
  `ceo` VARCHAR(100) NULL,
  `biz_no` VARCHAR(20) NULL,
  `founded` VARCHAR(20) NULL,
  `employees` VARCHAR(50) NULL,
  `address` VARCHAR(255) NULL,
  `website` VARCHAR(255) NULL,
  `name` VARCHAR(100) NOT NULL,
  `position` VARCHAR(100) NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `product_name` VARCHAR(255) NULL,
  `category` VARCHAR(100) NULL,
  `product_desc` TEXT NULL,
  `product_spec` TEXT NULL,
  `certifications` TEXT NULL,
  `store_url` VARCHAR(255) NULL,
  `export_exp` VARCHAR(50) NULL,
  `export_countries` VARCHAR(255) NULL,
  `vn_exp` VARCHAR(50) NULL,
  `trade_types` VARCHAR(255) NULL,
  `referral` VARCHAR(100) NULL,
  `questions` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT '신규',
  `memo` TEXT NULL,
  `extra` TEXT NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_applications_created` (`created_at`),
  KEY `idx_applications_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `company` VARCHAR(191) NULL,
  `position` VARCHAR(100) NULL,
  `category` VARCHAR(100) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT '신규',
  `memo` TEXT NULL,
  `extra` TEXT NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_inquiries_created` (`created_at`),
  KEY `idx_inquiries_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ci_sessions` (
  `id` VARCHAR(128) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data` BLOB NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ci_sessions_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 관리자 계정은 SQL로 넣지 말고 다음 명령으로 생성 (password_hash 규정):
-- php spark kfesta:admin admin@firstmkt.co.kr 비밀번호
