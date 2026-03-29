import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED = ['master_admin', 'manager']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employee_id')
  const status = searchParams.get('status') || 'all'

  let query = supabaseAdmin
    .from('performance_reviews')
    .select('id, review_period, period_start, period_end, overall_rating, attendance_rating, performance_rating, behavior_rating, strengths, improvements, goals, comments, status, created_at, employees!performance_reviews_employee_id_fkey(first_name, last_name, employee_code, department), reviewer:employees!performance_reviews_reviewer_id_fkey(first_name, last_name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (employeeId) query = query.eq('employee_id', employeeId)
  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  return NextResponse.json({ reviews: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = session.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const body = await req.json() as {
    employee_id: string
    review_period: string
    period_start: string
    period_end: string
    overall_rating?: number
    attendance_rating?: number
    performance_rating?: number
    behavior_rating?: number
    strengths?: string
    improvements?: string
    goals?: string
    comments?: string
    status?: 'draft' | 'published'
  }

  if (!body.employee_id || !body.review_period || !body.period_start || !body.period_end) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
  }

  // Verify employee belongs to tenant
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('id', body.employee_id)
    .eq('tenant_id', tenantId)
    .single()
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('performance_reviews')
    .insert({
      tenant_id: tenantId,
      employee_id: body.employee_id,
      reviewer_id: session.id,
      review_period: body.review_period.trim(),
      period_start: body.period_start,
      period_end: body.period_end,
      overall_rating: body.overall_rating || null,
      attendance_rating: body.attendance_rating || null,
      performance_rating: body.performance_rating || null,
      behavior_rating: body.behavior_rating || null,
      strengths: body.strengths?.trim() || null,
      improvements: body.improvements?.trim() || null,
      goals: body.goals?.trim() || null,
      comments: body.comments?.trim() || null,
      status: body.status || 'draft',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id }, { status: 201 })
}
