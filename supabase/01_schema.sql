-- KFESTA 관리자 스키마 v1 (2026-08-13)
-- 실행: Supabase SQL Editor 또는 node _tools/db.js supabase/01_schema.sql
-- upsert/if-not-exists 기반이라 재실행 안전

-- ── 관리자 ────────────────────────────────────────────
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from admins where id = auth.uid()) $$;

-- ── 참가신청 (/apply, 41필드 폼) ──────────────────────
create table if not exists public.applications (
  id bigint generated always as identity primary key,
  company text not null,
  company_en text,
  ceo text,
  biz_no text,
  founded text,
  employees text,
  address text,
  website text,
  name text not null,
  position text,
  phone text not null,
  email text not null,
  product_name text,
  category text,
  product_desc text,
  product_spec text,
  certifications text,
  store_url text,
  export_exp text,
  export_countries text,
  vn_exp text,
  trade_types text,
  referral text,
  questions text,
  status text not null default '신규',   -- 신규/미팅예정/사전마케팅/선정/보류
  memo text,
  created_at timestamptz not null default now()
);
create index if not exists idx_applications_created on public.applications (created_at desc);
create index if not exists idx_applications_status on public.applications (status);

-- ── 참가문의 (/33 폼) ─────────────────────────────────
create table if not exists public.inquiries (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  email text not null,
  company text,
  position text,
  category text,
  status text not null default '신규',   -- 신규/처리중/완료
  memo text,
  created_at timestamptz not null default now()
);
create index if not exists idx_inquiries_created on public.inquiries (created_at desc);

-- ── 프로젝트 (4단계: 등록/수정 → 굽기) ─────────────────
create table if not exists public.projects (
  id bigint generated always as identity primary key,
  slug text not null unique,             -- export2026, chimac2026 ...
  title text not null,
  badge text not null default '종료',    -- 모집 중/진행 중/참가 모집/종료
  meta text,                             -- 카드 메타 한 줄
  card_desc text,                        -- 카드 설명
  thumb text,                            -- 카드 썸네일 (Storage URL 또는 경로)
  hero text,                             -- 히어로 이미지
  kicker text,                           -- 섹션 킥커 (연도 등)
  subtitle text,                         -- 섹션 제목
  lead text,                             -- 리드 문단
  rows jsonb not null default '[]',      -- [{"k":"행사명","v":"..."}]
  photos jsonb not null default '[]',    -- [{"src":"...","alt":"..."}]
  wide text,                             -- 와이드 사진
  sort int not null default 100,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ── 카피 (5단계) ──────────────────────────────────────
create table if not exists public.site_copy (
  key text primary key,                  -- home.hero.p / band.title ...
  value text not null default '',
  page text not null default '',         -- 그룹핑용
  label text not null default ''         -- 관리자 폼 라벨
);

-- ── SEO (6단계) ───────────────────────────────────────
create table if not exists public.seo_meta (
  page text primary key,                 -- /, /INFO/, /apply/ ...
  title text not null default '',
  description text not null default ''
);

-- ── 설정 ──────────────────────────────────────────────
create table if not exists public.settings (
  key text primary key,
  value text not null default ''
);
insert into public.settings (key, value) values
  ('mail_to', 'info@firstmkt.co.kr'),
  ('recruit_open', '2026-08-17'),
  ('recruit_close', '2026-09-20')
on conflict (key) do nothing;

-- ── RLS ───────────────────────────────────────────────
alter table public.admins enable row level security;
alter table public.applications enable row level security;
alter table public.inquiries enable row level security;
alter table public.projects enable row level security;
alter table public.site_copy enable row level security;
alter table public.seo_meta enable row level security;
alter table public.settings enable row level security;

-- admins: 본인 행만 조회 (is_admin은 security definer라 무관)
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select using (id = auth.uid());

-- 공개 폼: 익명 INSERT 허용, 열람·수정은 관리자만
drop policy if exists app_insert on public.applications;
create policy app_insert on public.applications for insert with check (true);
drop policy if exists app_admin_select on public.applications;
create policy app_admin_select on public.applications for select using (is_admin());
drop policy if exists app_admin_update on public.applications;
create policy app_admin_update on public.applications for update using (is_admin());
drop policy if exists app_admin_delete on public.applications;
create policy app_admin_delete on public.applications for delete using (is_admin());

drop policy if exists inq_insert on public.inquiries;
create policy inq_insert on public.inquiries for insert with check (true);
drop policy if exists inq_admin_select on public.inquiries;
create policy inq_admin_select on public.inquiries for select using (is_admin());
drop policy if exists inq_admin_update on public.inquiries;
create policy inq_admin_update on public.inquiries for update using (is_admin());
drop policy if exists inq_admin_delete on public.inquiries;
create policy inq_admin_delete on public.inquiries for delete using (is_admin());

-- 콘텐츠: 공개 읽기(굽기·사이트 소비), 쓰기는 관리자만
drop policy if exists prj_read on public.projects;
create policy prj_read on public.projects for select using (true);
drop policy if exists prj_admin_write on public.projects;
create policy prj_admin_write on public.projects for all using (is_admin()) with check (is_admin());

drop policy if exists copy_read on public.site_copy;
create policy copy_read on public.site_copy for select using (true);
drop policy if exists copy_admin_write on public.site_copy;
create policy copy_admin_write on public.site_copy for all using (is_admin()) with check (is_admin());

drop policy if exists seo_read on public.seo_meta;
create policy seo_read on public.seo_meta for select using (true);
drop policy if exists seo_admin_write on public.seo_meta;
create policy seo_admin_write on public.seo_meta for all using (is_admin()) with check (is_admin());

drop policy if exists set_read on public.settings;
create policy set_read on public.settings for select using (true);
drop policy if exists set_admin_write on public.settings;
create policy set_admin_write on public.settings for all using (is_admin()) with check (is_admin());

-- ── Storage (사진 업로드) ─────────────────────────────
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;
drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects for select using (bucket_id = 'photos');
drop policy if exists photos_admin_write on storage.objects;
create policy photos_admin_write on storage.objects for all
  using (bucket_id = 'photos' and public.is_admin())
  with check (bucket_id = 'photos' and public.is_admin());
