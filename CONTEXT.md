# ESAM HR Portal — Continuation Reference

Paste this file at the start of a new chat to continue development.

---

## Project Location
- **Local path**: `/home/user/hr-managment`
- **Git repo**: `hykvra/hr-managment`
- **Active branch**: `claude/setup-nextjs-supabase-ui-KkDz0`
- **Dev server**: `npm run dev` → http://localhost:3000

---

## Tech Stack
- **Framework**: Next.js 14 (App Router), TypeScript
- **Database**: Supabase (PostgreSQL)
- **UI**: shadcn/ui (manually set up) + Tailwind CSS — **dark theme throughout**
- **Auth**: JWT (jose) in `httpOnly` cookie named `esam_token`
- **File Storage**: Supabase Storage bucket `employee-documents`
- **Email**: Resend
- **Language**: TypeScript throughout

---

## Installed Dependencies
```
@hookform/resolvers, @radix-ui/react-avatar, @radix-ui/react-checkbox,
@radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-label,
@radix-ui/react-select, @radix-ui/react-separator, @radix-ui/react-slot,
@radix-ui/react-tabs, @radix-ui/react-toast, @supabase/supabase-js,
@types/bcryptjs, bcryptjs, class-variance-authority, clsx, jose,
lucide-react, next, react, react-dom, react-hook-form, resend,
tailwind-merge, zod
```

---

## Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=                    # any 32+ char random string
RESEND_API_KEY=
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=E-Sam HR
```

---

## Roles
| Role | Access |
|---|---|
| `master_admin` | Everything |
| `manager` | Gated by `admin_permissions` flags |
| `attendance` | `/admin/attendance` only |
| `employee` | `/dashboard` only |

---

## Project Structure (what exists)
```
hr-managment/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          ✅ Login + forgot password (3-step OTP flow)
│   │   └── register/page.tsx       ✅ 5-section registration form + photo upload
│   ├── (employee)/
│   │   └── dashboard/page.tsx      ✅ Employee dashboard stub (profile card, stats)
│   ├── admin/
│   │   └── dashboard/page.tsx      ✅ Admin dashboard stub (pending counts)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      ✅ POST — bcrypt verify + JWT cookie
│   │   │   ├── logout/route.ts     ✅ POST — clears cookie
│   │   │   ├── register/route.ts   ✅ POST — creates inactive employee
│   │   │   ├── forgot-password/route.ts  ✅ POST — sends 6-digit OTP email
│   │   │   └── verify-otp/route.ts ✅ POST — validates OTP, resets password
│   │   └── employees/
│   │       └── dismiss-welcome/route.ts  ✅ POST — sets first_login=false
│   ├── globals.css                 ✅ Dark theme CSS variables
│   ├── layout.tsx                  ✅ Root layout (dark class)
│   └── page.tsx                    ✅ Landing page
├── components/
│   ├── shared/
│   │   └── WelcomePopup.tsx        ✅ First-login welcome dialog
│   └── ui/
│       ├── badge.tsx               ✅
│       ├── button.tsx              ✅
│       ├── card.tsx                ✅
│       ├── dialog.tsx              ✅
│       ├── input.tsx               ✅
│       ├── label.tsx               ✅
│       ├── select.tsx              ✅
│       ├── separator.tsx           ✅
│       └── tabs.tsx                ✅
├── lib/
│   ├── auth.ts                     ✅ signToken, verifyToken, getSession, cookie helpers
│   ├── mailer.ts                   ✅ sendOTPEmail, sendWelcomeEmail (lazy Resend init)
│   ├── supabase.ts                 ✅ supabase + supabaseAdmin (lazy Proxy init)
│   └── utils.ts                    ✅ cn(), generateOTP(), formatDate()
├── middleware.ts                   ✅ JWT guard + role-based redirects
├── types/index.ts                  ✅ All TypeScript types
├── supabase/migrations/
│   └── 001_initial_schema.sql      ✅ Full DB schema (12 tables)
├── components.json                 ✅ shadcn config
└── tailwind.config.ts              ✅ Dark theme with CSS variables
```

---

## Database Tables (all in 001_initial_schema.sql)
`employees`, `shifts`, `otp_store`, `leave_requests`, `salary_advances`,
`attendance`, `salary_history`, `bonus_history`, `support_tickets`,
`broadcasts`, `admin_permissions`, `company_settings`, `documents`

Key employee fields: `is_active` (false until admin approves), `first_login` (true until dismissed), `role` enum: master_admin/manager/attendance/employee

---

## Auth Flow
1. `POST /api/auth/login` → bcrypt verify → `signToken({id, role, shift_id, email})` → set `esam_token` httpOnly cookie
2. `middleware.ts` reads cookie → `jwtVerify` → injects `x-user-id`, `x-user-role`, `x-user-email` headers
3. Role redirects: attendance→`/admin/attendance`, employee→`/dashboard`, admin→`/admin/dashboard`
4. `POST /api/auth/logout` → clears cookie

---

## UI Design Rules
- Dark theme: `zinc-950` page bg, `zinc-900` cards, `zinc-800` inputs
- Blue accent: `blue-500` / `blue-600`
- Status badges: `variant="success"` (green), `variant="warning"` (yellow), `variant="danger"` (red)
- All modals: shadcn `Dialog`
- Forms: `react-hook-form` + `zod` validation
- Icons: `lucide-react`

---

## What's Done (Phase 1 ✅)
- [x] Landing page
- [x] Login page with forgot password (email OTP via Resend)
- [x] Register page (5-section form with Supabase Storage photo upload)
- [x] First-login welcome popup
- [x] JWT middleware guard
- [x] Employee dashboard stub
- [x] Admin dashboard stub

---

## What's Next (Phase 2 — Employee Dashboard)
- [ ] Attendance calendar (color-coded, month navigation)
- [ ] Apply leave form (single day + multi-day vacation)
- [ ] Request salary advance (max 50% of base)
- [ ] Support ticket form
- [ ] Resignation submit / withdraw
- [ ] History tabs (Leaves / Advances / Salary History)
- [ ] Settings modal (3 tabs: Credentials, Contact, Bank)
- [ ] Salary estimate widget (30-day pro-rate engine)
- [ ] Increment / bonus alert banners (partially done in dashboard stub)

### Salary Calculation Engine
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

## Phase 3 — Admin Dashboard
- [ ] New signup approval (set code/salary/shift/quota)
- [ ] Leave request management (approve/reject/cancel per day)
- [ ] Salary advance management (approve with amount, print A5 voucher)
- [ ] Support tickets (resolve with reply)
- [ ] Shift CRUD
- [ ] Broadcasts (send to shift or all)
- [ ] Leave policy settings
- [ ] Manager permission controls (5 flags)

## Phase 4 — Attendance
- [ ] Daily master sheet (mark each employee)
- [ ] Auto-detect approved leaves
- [ ] Penalty engine (uninformed = 2× daily rate)
- [ ] Monthly report view

## Phase 5 — Payroll
- [ ] Full salary calculation engine
- [ ] Salary increment with history snapshot
- [ ] Bonus management
- [ ] CSV export
- [ ] Printable A5 advance voucher / A4 employee report

## Phase 6 — New Features
Payslip PDF, leave type quotas, holiday calendar, overtime, departments,
performance reviews, warning letters, document vault, loan management,
expense reimbursement, employee directory, audit log, email notifications,
login activity log, session timeout, analytics, bulk CSV import,
birthday/anniversary alerts, printable ID card

---

## Important Notes
- `supabase` and `supabaseAdmin` in `lib/supabase.ts` use a **Proxy for lazy init** — do NOT call them at module top level outside a function
- `Resend` client in `lib/mailer.ts` is also lazily instantiated
- Admin route group was moved from `app/(admin)/` to `app/admin/` to avoid Next.js route conflict with `app/(employee)/dashboard`
- `employees.is_active = false` on registration — admin must approve before login works
- OTPs stored in `otp_store` table (10-min expiry), deleted after use
