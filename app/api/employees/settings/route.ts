import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json()
  const { tab } = body

  if (tab === 'credentials') {
    const { current_password, new_password, new_email } = body

    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('password_hash, email')
      .eq('id', session.id)
      .eq('tenant_id', tenantId)
      .single()

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }
      const valid = await bcrypt.compare(current_password, employee.password_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      if (new_password.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
      }
      const hash = await bcrypt.hash(new_password, 12)
      const { error } = await supabaseAdmin
        .from('employees')
        .update({ password_hash: hash })
        .eq('id', session.id)
        .eq('tenant_id', tenantId)
      if (error) return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    if (new_email && new_email !== employee.email) {
      const { data: exists } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('email', new_email)
        .eq('tenant_id', tenantId)
        .neq('id', session.id)
        .maybeSingle()
      if (exists) return NextResponse.json({ error: 'Email is already in use' }, { status: 400 })
      const { error } = await supabaseAdmin
        .from('employees')
        .update({ email: new_email })
        .eq('id', session.id)
        .eq('tenant_id', tenantId)
      if (error) return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
    }
  } else if (tab === 'contact') {
    const { mobile, address, emergency_name, emergency_phone } = body
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ mobile, address, emergency_name, emergency_phone })
      .eq('id', session.id)
      .eq('tenant_id', tenantId)
    if (error) return NextResponse.json({ error: 'Failed to update contact info' }, { status: 500 })
  } else if (tab === 'bank') {
    const { bank_name, account_no, ifsc, branch_name, account_holder } = body
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ bank_name, account_no, ifsc, branch_name, account_holder })
      .eq('id', session.id)
      .eq('tenant_id', tenantId)
    if (error) return NextResponse.json({ error: 'Failed to update bank details' }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Invalid settings tab' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
