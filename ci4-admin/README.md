# KFESTA 자체 서버 이관 패키지 (PHP 8.2 + CodeIgniter 4 + MySQL 5.6)

kfesta.vn을 회사 서버로 옮기기 위한 백엔드입니다. 회사 개발표준(2026-07-31 가이드라인)을 따르며,
현재 라이브 프론트(GitHub Pages 정적 사이트 + 관리자 SPA)를 **한 줄도 수정하지 않고** 그대로 붙도록
기존 로컬 관리서버(`_tools/admin-server.mjs`)의 API 계약을 유지합니다.

## 1. 구성 개요

```
[웹서버(nginx/OLS)] ── 정적 파일(try_files) ──→ public/  (= 기존 kfesta 사이트 전체)
        └── 없으면 ──→ CI4 index.php
                          ├── /api/*      접수·관리 API (아래 계약표)
                          └── /admin/*    관리자 UI (세션 로그인 뒤 admin-ui/ 서빙)
[MySQL 5.6]  applications / inquiries / admins / ci_sessions
[Node 18+]   public/_tools/bake.mjs  (관리자 "게시" = site.json → 정적 HTML 굽기)
```

- 접수(참가신청·문의)는 **DB에 저장**되고, 동시에 서버가 Apps Script로 전달해
  **구글시트 기록 + info@firstmkt.co.kr 메일 알림**이 유지됩니다(.env `kfesta.sheetEndpoint`).
- 콘텐츠(카피·SEO·프로젝트·블로그)는 파일 단일원본(`public/data/site.json`) + 굽기 체계를 유지합니다.
  DB로 옮기지 않은 이유: 굽기 스크립트·관리자 프론트가 이 파일을 계약으로 쓰고 있고, 정적 산출물이 곧 배포물이기 때문.

## 2. 설치 절차

```bash
# 1) CI4 앱스타터 생성 (public/index.php·spark 등 버전 종속 초기화 파일은 앱스타터 원본 사용)
composer create-project codeigniter4/appstarter kfesta-server
cd kfesta-server

# 2) 이 패키지 오버레이 (app/, sql/, .env.example 덮어쓰기)
cp -r <이 폴더>/app ./
cp -r <이 폴더>/sql ./
cp <이 폴더>/.env.example ./
cp -r <이 폴더>/public/assets ./public/   # 로그인 페이지 CSS

# 3) 사이트 정적 파일 배치 (레포 leegunhee010/kfesta 루트 전체 → public/)
#    단, admin/ 폴더는 public에 두면 인증 없이 노출되므로 CI4 루트의 admin-ui/로 이동
rsync -a kfesta/ public/  --exclude admin
mv kfesta/admin ./admin-ui

# 4) 환경설정
cp .env.example .env   # DB 계정·baseURL 채우기 (.env 커밋 금지)

# 5) DB
php spark migrate       # 또는 mysql < sql/schema_mysql56.sql (둘 중 하나만)

# 6) 관리자 계정
php spark kfesta:admin admin@firstmkt.co.kr <비밀번호>
```

### 쓰기 권한 필요 경로
| 경로 | 용도 |
|---|---|
| `writable/` | CI4 로그·캐시·site.json 백업 |
| `public/data/` | site.json 저장 (관리자 편집) |
| `public/assets/img/uploads/` | 이미지 업로드 |
| `public/` 전체 | 굽기(bake)가 HTML·sitemap 재작성 |

⚠️ makenov 서버에서 uploads가 root 소유라 쓰기 실패했던 전례 있음. PHP 실행 계정으로 `chown` 확인 필수.

### 웹서버 (1Panel nginx 예시)
```nginx
root /www/kfesta-server/public;
index index.html index.php;
location / { try_files $uri $uri/ /index.php?$query_string; }
location ~ ^/(data|_tools)/ { deny all; }          # 내부 파일 직접 접근 차단 (API 경유만)
location /admin { try_files /index.php?$query_string =404; }  # 관리자 UI는 반드시 PHP 경유
location ~ \.php$ { ... fastcgi ... }
```
`/api/data`가 site.json을 서빙하므로 `/data/` 차단해도 관리자는 동작합니다.
프론트 사이트 페이지는 site.json을 직접 읽지 않습니다(굽기 산출물만 사용).

## 3. API 계약 (프론트 호환 — 변경 금지)

회사 표준 응답 포맷은 `{status, message, data}`지만, 아래 엔드포인트는 라이브 프론트가
로컬 관리서버 계약(`{ok: bool, ...}`)에 맞춰져 있어 **기존 계약을 유지**합니다.
(신규 엔드포인트를 추가할 때는 회사 표준 포맷을 따르세요.)

| 메서드·경로 | 인증 | 요청 | 응답 |
|---|---|---|---|
| GET `/api/ping` | 공개 | – | `{ok:true, mode:'server'}` — 프론트가 자체서버 모드 감지 |
| POST `/api/submit/apply` | 공개 | JSON 41필드 폼 | `{ok:true, id}` |
| POST `/api/submit/inquiry` | 공개 | JSON 6필드 | `{ok:true, id}` |
| GET `/api/apps` | 세션 | – | 배열(최신순), `created_at`은 ISO8601 |
| POST `/api/apps` | 세션 | `{id, status?, memo?}` | `{ok:true}` |
| GET `/api/inqs` | 세션 | – | 배열(최신순) |
| POST `/api/inqs` | 세션 | `{id, status?, memo?}` | `{ok:true}` |
| GET `/api/data` | 세션 | – | site.json 원문 |
| POST `/api/data` | 세션 | 바디 = site.json 전문 | `{ok:true}` (저장 전 writable/backups 백업) |
| POST `/api/upload?name=파일명` | 세션 | 바디 = 이미지 바이너리 | `{ok:true, path:'assets/img/uploads/...'}` |
| POST `/api/bake` | 세션 | – | `{ok:true, log}` / 실패 500 `{ok:false, log}` |

- 업로드: jpg/png/webp/gif만, 10MB, MIME 실검증, 파일명 재생성 (svg는 XSS 위험으로 제외)
- CSRF: `/api/*`는 JSON API라 예외 처리, 관리 API는 세션 필터(AdminAuth)로 보호. 로그인 폼은 `csrf_field()` 사용
- 접수 필드 스키마 외 값은 `extra` 컬럼(JSON)에 보존되고 목록 조회 시 병합되어 나갑니다 (폼 필드 추가에 유연)

## 4. 굽기(bake) — Node 필요

관리자의 "게시" 버튼 = `POST /api/bake` = 서버에서 `node public/_tools/bake.mjs` 실행(120초 제한).
site.json을 읽어 카피·SEO·FAQ 스키마·프로젝트/블로그 페이지·sitemap을 정적 HTML로 재작성합니다.

- 서버에 **Node.js 18+** 설치, 경로가 다르면 `.env kfesta.nodeBin=/usr/local/bin/node`
- Node 설치가 불가한 서버라면: 관리자 게시를 로컬에서 돌리고 정적 산출물만 배포하는 기존 방식으로 운영 가능
  (이 경우 `/api/bake`는 안 쓰면 됨 — 접수·문의 DB 기능은 영향 없음)

## 5. 컷오버 절차

1. 위 설치 완료 후 서버 도메인(임시)으로 스모크 테스트:
   - `/` 홈, `/apply/` 신청 폼 제출 → DB 행 + 구글시트 행 + 메일 수신
   - `/admin` → 로그인 → 참가신청 목록·상태변경 → 카피 수정 → 게시(bake) → 홈 반영
2. kfesta.vn DNS를 회사 서버로 전환 (현재는 아임웹 → GitHub Pages 예정이던 것을 이 서버로)
3. `.env app.baseURL` 확인, HTTPS 인증서(1Panel Let's Encrypt)
4. 전환 후 GitHub Pages 쪽은 그대로 두거나 리다이렉트 처리

접수 마감 등 일정: 모집 접수 2026-08-17 ~ 09-20 (site.json settings). **8/17 전 컷오버 권장.**

## 6. 파일 목록

```
app/Config/Routes.php               라우팅 (/api 그룹, /admin 그룹)
app/Config/Filters.php              필터 등록 (adminAuth, csrf 예외)
app/Filters/AdminAuth.php           세션 인증 필터 (API 401 JSON / 화면 리다이렉트)
app/Controllers/Api/ApiController.php   공통 응답 헬퍼
app/Controllers/Api/Ping.php            GET /api/ping
app/Controllers/Api/Submit.php          공개 접수 2종 (+Apps Script 전달)
app/Controllers/Api/Applications.php    참가신청 목록·수정
app/Controllers/Api/Inquiries.php       문의 목록·수정
app/Controllers/Api/SiteData.php        site.json 읽기/쓰기(+백업)
app/Controllers/Api/Uploads.php         이미지 업로드
app/Controllers/Api/Bake.php            굽기 실행
app/Controllers/Admin/Auth.php          로그인/로그아웃
app/Controllers/Admin/Panel.php         관리자 UI 서빙 (admin-ui/)
app/Views/admin/login.php               로그인 화면
app/Models/{Application,Inquiry,Admin}Model.php
app/Commands/CreateAdmin.php            php spark kfesta:admin
app/Database/Migrations/2026-08-14-000001_CreateKfestaTables.php
sql/schema_mysql56.sql                  마이그레이션 대안 (직접 임포트)
public/assets/css/admin-login.css       로그인 페이지 스타일 (인라인 금지 규정)
.env.example                            환경설정 예시 (.env 커밋 금지)
```

## 7. 표준 대비 조정 사항 (사유 명시)

| 항목 | 표준 | 이 프로젝트 | 사유 |
|---|---|---|---|
| API 응답 | `{status,message,data}` | `{ok,...}` 유지 | 라이브 프론트 무수정 컷오버 |
| 업로드 화이트리스트 | jpg/png/pdf 5MB | jpg/png/webp/gif 10MB | 사이트 이미지가 webp 중심, 히어로급 용량 |
| 뷰 레이아웃 | app/Views/admin/layout.php | 로그인 뷰 1장만 | 관리자 UI가 완성된 SPA(admin-ui/)라 뷰 불필요 |
| 초기화 파일 | composer.json·spark·index.php 동봉 | 앱스타터 원본 사용 | 프레임워크 버전 종속 파일이라 동봉 시 버전 충돌 위험 |
| 콘텐츠 저장 | DB | site.json 파일 유지 | 굽기 체계·정적 산출물이 계약, DB화는 이득 없음 |

접수 데이터(applications/inquiries)는 표준대로 전부 DB입니다.

문의: 이건희 (meeneex2@gmail.com)
