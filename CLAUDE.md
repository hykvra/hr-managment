# ESAM HR Portal — Claude Code Guide

## Project Overview

Multi-tenant HR Management SaaS platform built with Next.js 14 + Supabase + JWT.

- **Live URL:** https://esam.hrjo.in/admin/dashboard
- **GitHub Repo:** hykvra/hr-managment
- **Branch:** claude/setup-nextjs-supabase-ui-KkDz0
- **Deployed on:** Railway
- **Supabase Project ID:** fnlzqixxyvcvpkyqgwgo
- **Tenant slug:** esam
- **Tenant ID:** dbbbf5d3-8d07-4e02-ada7-674520a86ba1

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.35 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS + Radix UI |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (jose) + HTTP-only cookies, 7-day expiry |
| Storage | Railway S3-compatible object storage |
| Email | Resend API (from: hello@hrjo.in) |
| Password | bcryptjs |
| Biometric | Hikvision DS-K1T343MX at 192.168.0.186:80 |

---

## Environment Variables (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://fnlzqixxyvcvpkyqgwgo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_XUQJSYaalzWU3pUU3FSlgA_FYDV0fMj
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=0976597275a9037cc6cb9469ebc136876af8f1d08243f5c5047dd52e9d9e1808
RESEND_API_KEY=re_L3c8gnar_B98AXmDptJ8ATm2XPhsXm2sv
FROM_EMAIL=hello@hrjo.in
FROM_NAME=HR
NEXT_PUBLIC_DEFAULT_TENANT_SLUG=esam
HIK_PROXY_SECRET=hik_local_proxy_secret_2026
RAILWAY_STORAGE_ENDPOINT=https://t3.storageapi.dev
RAILWAY_STORAGE_REGION=auto
RAILWAY_STORAGE_BUCKET=profile-pictures-q-dsy19k
RAILWAY_STORAGE_ACCESS_KEY_ID=tid_hfNgTjaNquirZhBNTmCCMYgsFnfNKIeZzbMYrHawMriZeRhALc
RAILWAY_STORAGE_SECRET_ACCESS_KEY=tsec_ptWexCjIcu2unAj4YkuQs4HDthD_r+6pLSPFc5J-kR2I-7J4HHH8czYbvMXonpaXIDyM1E
```

---

## Architecture

### Multi-Tenancy
- Tenant resolved from subdomain: `esam.hrjo.in` → slug `esam`
- All DB queries scoped by `tenant_id`
- Middleware injects `x-tenant-id`, `x-tenant-slug`, `x-user-*` headers into API routes

### Authentication & Roles
Four roles, each with different dashboard:
- `master_admin` → `/admin/dashboard`
- `manager` → `/admin/dashboard` (limited)
- `attendance` → `/admin/attendance`
- `employee` → `/employee/dashboard`

Default password for new employees: **Esam@1234** (first_login: true forces password change)

### JWT Cookie
- Cookie name: `hrjo_token`
- Expiry: 7 days
- Contains: `{ id, email, role, tenant_id, tenant_slug, shift_id, first_login }`

---

## Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `tenants` | Company/organization records |
| `employees` | Employee master data, roles, salary |
| `shifts` | Work shift definitions (in/out times) |
| `company_settings` | Key-value settings per tenant (timezone, policies) |
| `admin_permissions` | Per-admin feature access flags |
| `otp_store` | Password reset OTPs |

### Attendance & Leave
| Table | Purpose |
|-------|---------|
| `attendance` | Daily records with clock_in_time, clock_out_time, status |
| `leave_requests` | Leave applications |
| `leave_types` | Configurable leave types (CL, SL, PL, etc.) |
| `company_holidays` | Holiday calendar |
| `employee_leave_balances` | Leave balance per employee per year per type |
| `attendance_regularizations` | Correction requests |

### Compensation
| Table | Purpose |
|-------|---------|
| `salary_advances` | Advance requests |
| `salary_history` | Salary change log |
| `bonus_history` | Bonus records |
| `payroll_records` | Monthly payroll with PF/ESI/OT/loan deductions |
| `employee_pay_components` | Variable allowances/deductions |
| `employee_loans` | Loan tracking |
| `loan_payments` | Loan repayment schedule |

### HR Operations
| Table | Purpose |
|-------|---------|
| `departments` | Department definitions |
| `expense_requests` | Employee expense reimbursements |
| `warning_letters` | Disciplinary records |
| `performance_reviews` | Appraisal records |
| `activity_logs` | Full audit trail |
| `broadcasts` | Admin announcements |
| `support_tickets` | Employee support requests |
| `documents` | Employee uploaded documents |

### Hikvision Integration
| Table | Purpose |
|-------|---------|
| `hikvision_devices` | Device config (ip, port, credentials, proxy_url) |
| `hikvision_user_mapping` | employee_id ↔ hik_employee_no |
| `hikvision_events` | Raw biometric events (UNIQUE: device_id + hik_employee_no + event_time) |

---

## Migrations

Run in order against Supabase SQL editor:
```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_leave_types_holidays.sql
supabase/migrations/003_employee_types_pay_components.sql
supabase/migrations/004_clockin.sql
supabase/migrations/005_loans_ot.sql
supabase/migrations/006_departments_expenses.sql
supabase/migrations/007_regularization_warnings.sql
supabase/migrations/008_activity_logs_reviews.sql
supabase/migrations/009_hikvision.sql
supabase/migrations/010_hik_proxy.sql
supabase/migrations/011_hik_events_unique.sql
```

---

## npm Scripts

```bash
npm run dev                        # Start dev server
npm run build                      # Production build
npm run hik-proxy                  # Start local Hikvision proxy (port 3001)
npm run hik-pull                   # Pull events from device to Supabase
npm run hik-list                   # List all users on device
npm run hik-remap                  # Remap device employee numbers to portal employees
npm run hik-sync                   # Sync employees to device
npm run seed                       # Seed database with initial data
HIK_PULL_DAYS=60 npm run hik-pull  # Pull last 60 days of events
```

---

## Hikvision Integration

### Device Details
- **Model:** DS-K1T343MX
- **LAN IP:** 192.168.0.186:80
- **Web UI:** https://192.168.0.186 (HTTPS, self-signed cert)
- **Protocol:** ISAPI over HTTP

### How It Works
1. **Pull mode** (manual): `npm run hik-proxy` + `npm run hik-pull` — polls device ISAPI for events
2. **Push mode** (live): Device POSTs multipart/mixed XML to Railway webhook at `https://esam.hrjo.in/api/integrations/hikvision/push`

### Push Mode Setup
Since Railway can't reach LAN device directly:
1. Run `npm run hik-proxy` on office machine (port 3001)
2. Expose with `npx ngrok http 3001`
3. Set ngrok URL as "Local Proxy URL" in Admin → Hikvision → Edit Device
4. Click "Configure Push Mode" in dashboard

### IP/NAT Fallback
Push endpoint falls back to any active push-enabled device when IP doesn't match (device sends from public NAT IP, not LAN IP).

### Employee Mapping
- `employee_code` on employees table = `hik_employee_no` on device
- Mapping stored in `hikvision_user_mapping` table
- Run `npm run hik-remap` after setting employee_codes to create mappings

---

## Key Files

```
lib/auth.ts          — JWT creation, verification, session helpers
lib/supabase.ts      — Supabase client (supabaseAdmin for server)
lib/hikvision.ts     — ISAPI calls (hikTestConnection, hikPullEvents, hikConfigurePush, hikAddUser)
lib/crypto.ts        — Encrypt/decrypt Hikvision passwords
lib/hik-forward.ts   — Proxy forwarding (LAN device via ngrok)
lib/mailer.ts        — Resend email sending
lib/tenant.ts        — Tenant resolution utilities
middleware.ts        — Auth, tenant, role-based routing
```

---

## API Routes Structure

```
/api/auth/login                          — Login, returns JWT cookie
/api/auth/logout                         — Clears cookie
/api/auth/forgot-password                — OTP email
/api/auth/verify-otp                     — Verify OTP
/api/admin/employees                     — GET list / POST create employee
/api/admin/employees/[id]                — PATCH (salary, role, status, etc.)
/api/admin/settings                      — GET/PUT company_settings (timezone, policies)
/api/admin/hikvision/devices             — Device CRUD
/api/admin/hikvision/devices/[id]/test   — Test connection
/api/admin/hikvision/devices/[id]/sync   — Sync employees to device
/api/admin/hikvision/devices/[id]/push-config — Configure push mode
/api/integrations/hikvision/push         — Webhook endpoint for device push events
/api/super-admin/auth/login              — Super admin login
/api/super-admin/tenants                 — Manage all tenants
```

---

## Company Settings Keys (company_settings table)
- `probation_period` — Days
- `notice_period` — Days
- `weekly_off` — Comma-separated days (e.g., "Saturday,Sunday")
- `late_mark_after` — Minutes
- `half_day_after` — Minutes
- `overtime_after` — Minutes
- `attendance_source` — "manual" or "biometric"
- `timezone` — e.g., "Asia/Kolkata"

---

## Seeding / Initial Setup for New Account

1. Apply all 11 migrations in Supabase SQL editor
2. Create tenant record in `tenants` table
3. Run `npm run seed` (reads NEXT_PUBLIC_DEFAULT_TENANT_SLUG from .env)
4. Import employees via Admin → Employees → Add Employee
   - OR run `npm run tsx scripts/import-employees.ts` for bulk import
5. Set up Hikvision device in Admin → Hikvision → Add Device
6. Run `npm run hik-list` to see device employee numbers
7. Set `employee_code` on each employee to match device numbers
8. Run `npm run hik-remap` to create mappings
9. Run `HIK_PULL_DAYS=365 npm run hik-pull` for historical data

---

## Deduplication Rules

- **Employee import:** Same `first_name + last_name + mobile` = duplicate (keep latest)
- **Hikvision events:** Same `device_id + hik_employee_no + event_time` = duplicate (DB unique constraint)

---

## Known Issues & Fixes Applied

| Issue | Fix |
|-------|-----|
| Railway build fails: scripts compiled by Next.js | Added `"scripts"` to `tsconfig.json` exclude array |
| Push events not received (NAT/IP mismatch) | Fallback to any active push-enabled device when IP doesn't match |
| hik-pull duplicates events | Pre-fetch existing event keys before inserting |
| `EADDRINUSE :3001` | `lsof -ti :3001 \| xargs kill -9` |
| npx not in PATH on Railway | Use full path `/opt/homebrew/bin/npx` for local scripts |

---

## tsconfig.json Key Setting

```json
"exclude": ["node_modules", "scripts"]
```
This prevents Next.js from compiling the `scripts/` folder (which uses Node.js APIs not available in Next.js).

---

## Git Workflow

```bash
# All work is on feature branch
git checkout claude/setup-nextjs-supabase-ui-KkDz0

# Deploy happens automatically on push via Railway
git push origin claude/setup-nextjs-supabase-ui-KkDz0
```

---

## For New Account Setup

When setting up this project in a new Supabase account:

1. Create new Supabase project, note the project ID and service role key
2. Update `.env.local` with new `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
3. Apply all migrations (001–011) in Supabase SQL editor
4. Update `NEXT_PUBLIC_DEFAULT_TENANT_SLUG` in `.env.local`
5. Run `npm run seed` to create default data
6. Update Railway environment variables to match new `.env.local`
7. Push to trigger redeploy
