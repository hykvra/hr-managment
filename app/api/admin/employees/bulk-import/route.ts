import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'master_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { rows } = await req.json() as {
    rows: {
      first_name: string
      last_name: string
      email: string
      mobile: string
      base_salary: number
      department?: string
      joining_date?: string
      employment_type?: string
    }[]
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }
  if (rows.length > 200) {
    return NextResponse.json({ error: 'Max 200 employees per import' }, { status: 400 })
  }

  // Fetch existing emails to detect duplicates
  const emails = rows.map(r => r.email?.toLowerCase()).filter(Boolean)
  const { data: existing } = await supabaseAdmin
    .from('employees')
    .select('email')
    .eq('tenant_id', tenantId)
    .in('email', emails)

  const existingEmails = new Set((existing || []).map(e => e.email.toLowerCase()))

  // Default password hash for all imported employees: "Welcome@1234"
  const defaultHash = await bcrypt.hash('Welcome@1234', 10)

  const toInsert = []
  const skipped: string[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNum = i + 2 // +2 because row 1 is header

    if (!r.first_name?.trim()) { errors.push(`Row ${rowNum}: first_name required`); continue }
    if (!r.last_name?.trim()) { errors.push(`Row ${rowNum}: last_name required`); continue }
    if (!r.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
      errors.push(`Row ${rowNum}: invalid email`); continue
    }
    if (!r.mobile?.trim()) { errors.push(`Row ${rowNum}: mobile required`); continue }
    if (!r.base_salary || Number(r.base_salary) <= 0) {
      errors.push(`Row ${rowNum}: invalid base_salary`); continue
    }

    const email = r.email.trim().toLowerCase()
    if (existingEmails.has(email)) { skipped.push(email); continue }

    const VALID_TYPES = ['regular', 'contractual', 'daily_wage']
    const empType = VALID_TYPES.includes(r.employment_type || '') ? r.employment_type : 'regular'

    toInsert.push({
      tenant_id: tenantId,
      first_name: r.first_name.trim(),
      last_name: r.last_name.trim(),
      email,
      mobile: r.mobile.trim(),
      password_hash: defaultHash,
      base_salary: Number(r.base_salary),
      department: r.department?.trim() || null,
      joining_date: r.joining_date || new Date().toISOString().slice(0, 10),
      employment_type: empType,
      role: 'employee',
      is_active: true,   // auto-approved on bulk import
      leave_balance: 12,
    })
  }

  if (errors.length > 0 && toInsert.length === 0) {
    return NextResponse.json({ error: 'All rows have errors', details: errors }, { status: 400 })
  }

  let imported = 0
  if (toInsert.length > 0) {
    const { error: insErr } = await supabaseAdmin
      .from('employees')
      .insert(toInsert)
    if (insErr) return NextResponse.json({ error: 'Database insert failed', details: insErr.message }, { status: 500 })
    imported = toInsert.length
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped: skipped.length,
    skipped_emails: skipped,
    errors,
  })
}
