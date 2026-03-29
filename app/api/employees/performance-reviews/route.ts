import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'employee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('performance_reviews')
    .select('id, review_period, period_start, period_end, overall_rating, attendance_rating, performance_rating, behavior_rating, strengths, improvements, goals, comments, status, created_at, reviewer:employees!performance_reviews_reviewer_id_fkey(first_name, last_name)')
    .eq('employee_id', session.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  return NextResponse.json({ reviews: data || [] })
}
