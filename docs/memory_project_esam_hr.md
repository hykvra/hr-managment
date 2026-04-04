---
name: Project: ESAM HR Portal
description: Full project context — stack, credentials, DB schema, Hikvision, deployment, scripts, known fixes, new account setup
type: project
---

## Location & Deployment

- **Local:** `/Users/rajhussainkanani/Desktop/Development/HR-Management/hr-managment`
- **Repo:** hykvra/hr-managment
- **Branch:** claude/setup-nextjs-supabase-ui-KkDz0
- **Live URL:** https://esam.hrjo.in
- **Deployed on:** Railway (auto-deploy on push)
- **Supabase Project ID:** fnlzqixxyvcvpkyqgwgo
- **Supabase URL:** https://fnlzqixxyvcvpkyqgwgo.supabase.co
- **Tenant slug:** esam
- **Tenant ID:** dbbbf5d3-8d07-4e02-ada7-674520a86ba1

**Why:** Multi-tenant HR SaaS platform for ESAM Technologies.

---

## Tech Stack

- Next.js 14.2.35 (App Router) + TypeScript 5
- Supabase (PostgreSQL) — `supabaseAdmin` uses Proxy for lazy init in `lib/supabase.ts` — do NOT call at module top level
- Tailwind CSS + Radix UI — **dark theme throughout** (zinc-950 bg, zinc-900 cards)
- Auth: JWT (jose) in httpOnly cookie `hrjo_token`, 7-day expiry
- Email: Resend (lazily instantiated in lib/mailer.ts), from: hello@hrjo.in
- Storage: Railway S3-compatible (profile pictures)
- Password: bcryptjs — default for new employees: **Esam@1234**
- Biometric: Hikvision DS-K1T343MX at 192.168.0.186:80

---

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://fnlzqixxyvcvpkyqgwgo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_XUQJSYaalzWU3pUU3FSlgA_FYDV0fMj
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubHpxaXh4eXZjdnBreXFnd2dvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5OTMxMiwiZXhwIjoyMDkwMjc1MzEyfQ.MQ7RWpSvPAELysaPcfxUoqrpoAlQF-4kRlEOBkAhpvE
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

## Roles & Auth

Four roles:
- `master_admin` → `/admin/dashboard` (full access)
- `manager` → `/admin/dashboard` (gated by admin_permissions flags)
- `attendance` → `/admin/attendance`
- `employee` → `/employee/dashboard`

JWT token contains: `{ id, email, role, tenant_id, tenant_slug, shift_id, first_login }`
First login (`first_login: true`) forces password change via welcome wizard.
`is_active = false` until admin approves new registrations.

---

## UI Design Rules

- Dark theme: zinc-950 page bg, zinc-900 cards, zinc-800 inputs
- Blue accent: blue-500 / blue-600
- All modals: Dialog component
- Forms: react-hook-form + zod
- Icons: lucide-react

---

## Database Schema (11 Migrations)

### Core
`tenants`, `employees`, `shifts`, `otp_store`, `admin_permissions`, `company_settings`, `documents`, `broadcasts`, `support_tickets`

### Attendance & Leave
`attendance` (with clock_in_time, clock_out_time), `leave_requests`, `leave_types`, `company_holidays`, `employee_leave_balances`, `attendance_regularizations`

### Compensation
`salary_advances`, `salary_history`, `bonus_history`, `payroll_records` (PF/ESI/OT/loan deductions), `employee_pay_components`, `employee_loans`, `loan_payments`

### HR Operations
`departments`, `expense_requests`, `warning_letters`, `performance_reviews`, `activity_logs`

### Hikvision
`hikvision_devices` (ip, port, creds, proxy_url), `hikvision_user_mapping` (employee_id ↔ hik_employee_no), `hikvision_events` (UNIQUE: device_id + hik_employee_no + event_time)

---

## Migrations to Apply (in order)

```
001_initial_schema.sql
002_leave_types_holidays.sql
003_employee_types_pay_components.sql
004_clockin.sql
005_loans_ot.sql
006_departments_expenses.sql
007_regularization_warnings.sql
008_activity_logs_reviews.sql
009_hikvision.sql
010_hik_proxy.sql
011_hik_events_unique.sql
```

---

## npm Scripts

```bash
npm run dev
npm run build
npm run hik-proxy              # Start local Hikvision proxy (port 3001)
npm run hik-pull               # Pull device events → Supabase
npm run hik-list               # List users on device
npm run hik-remap              # Map device employee numbers to portal employees
npm run hik-sync               # Sync portal employees → device
npm run seed                   # Seed DB initial data
HIK_PULL_DAYS=60 npm run hik-pull   # Pull last N days
```

Note: Scripts need `PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"` prefix or they fail (npx not in default PATH).

---

## Hikvision Integration

**Device:** DS-K1T343MX at 192.168.0.186:80 (ISAPI HTTP)
**Push URL:** https://esam.hrjo.in/api/integrations/hikvision/push
**NAT Fix:** Push endpoint falls back to any active push-enabled device when source IP doesn't match stored LAN IP

**Employee Mapping:**
- `employee_code` on employees table = `hik_employee_no` on device
- Stored in `hikvision_user_mapping` table
- After setting employee_codes, run `npm run hik-remap`

**For admin actions from Railway (proxy needed):**
1. `npm run hik-proxy` (office machine, port 3001)
2. `npx ngrok http 3001`
3. Set ngrok URL as "Local Proxy URL" in device edit form
4. Click "Configure Push Mode" in dashboard

---

## Company Settings Keys

`probation_period`, `notice_period`, `weekly_off`, `late_mark_after`, `half_day_after`, `overtime_after`, `attendance_source`, `timezone`

---

## Salary Calculation Engine

```
daily_rate = base_salary / 30
days_present = Present + HalfDay×0.5 + DoubleShift×2

if days_present < 15:      payable_days = days_present
elif days_present <= 26:   payable_days = days_present + (leave_balance / 2)
else:                      payable_days = days_present + leave_balance

payable_days = min(payable_days, 30) - unpaid_leaves
gross = payable_days * daily_rate + bonuses - advances - penalties
net_payable = max(0, gross)
```

---

## Known Issues & Fixes

| Issue | Fix |
|-------|-----|
| Railway build: scripts compiled by Next.js | tsconfig.json `exclude: ["scripts"]` |
| Push events missed (NAT/IP mismatch) | Fallback to any push-enabled device in push/route.ts |
| hik-pull duplicates events on re-run | Pre-fetch existing event keys before inserting |
| hik-proxy duplicates events | Same fix in hik-proxy.ts handlePullEvents |
| EADDRINUSE :3001 | `lsof -ti :3001 \| xargs kill -9` |
| npx not found in PATH | Prefix: `PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"` |
| TS error: selected possibly null in modals | Use optional chaining `selected?.field ?? null` |

---

## Deduplication Rules

- **Employee import:** `first_name + last_name + mobile` = duplicate key (keep latest)
- **Hikvision events:** `device_id + hik_employee_no + event_time` = UNIQUE constraint in DB

---

## New Account Setup Checklist

1. Create new Supabase project → get URL + service role key
2. Update `.env.local` (SUPABASE_URL, SERVICE_ROLE_KEY, JWT_SECRET, tenant slug)
3. Apply all 11 migrations in Supabase SQL editor (in order)
4. Run `PATH="/usr/local/bin:/opt/homebrew/bin:$PATH" npx tsx scripts/seed.ts`
5. Update Railway environment variables to match `.env.local`
6. Push to redeploy on Railway
7. Import employees: Admin → Employees → Add Employee (or bulk via import-employees.ts)
8. Default password for all employees: **Esam@1234**
9. Set `employee_code` on each employee = device hik_employee_no
10. Run `npm run hik-remap` to create device ↔ portal mappings
11. Run `HIK_PULL_DAYS=365 npm run hik-pull` for historical data

---

## Phase Status

- **Phase 1 ✅ Done** — Full HR portal: employees, attendance, leave, payroll, Hikvision biometric
- **Phase 2** — TBD
