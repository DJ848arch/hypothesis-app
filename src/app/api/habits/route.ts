import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayString } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const withLogs = searchParams.get('with_logs') === 'true'
  const today = todayString()

  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('archived', false)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (withLogs && habits) {
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('habit_id, logged_date')
      .eq('user_id', user.id)
      .gte('logged_date', (() => {
        const d = new Date()
        d.setDate(d.getDate() - 84)
        return d.toISOString().split('T')[0]
      })())

    const todayLogs = new Set((logs || []).filter(l => l.logged_date === today).map(l => l.habit_id))

    const habitsWithMeta = habits.map(h => ({
      ...h,
      logged_today: todayLogs.has(h.id),
      logs: (logs || []).filter(l => l.habit_id === h.id).map(l => l.logged_date),
    }))

    return NextResponse.json(habitsWithMeta)
  }

  return NextResponse.json(habits)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('habits')
    .insert({ ...body, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
