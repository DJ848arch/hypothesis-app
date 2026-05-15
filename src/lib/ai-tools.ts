import { SupabaseClient } from '@supabase/supabase-js'
import { todayString } from './utils'

type ToolInput = Record<string, unknown>

export async function handleToolCall(
  toolName: string,
  input: ToolInput,
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case 'create_task': {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: input.title as string,
          scheduled_date: (input.scheduled_date as string) || null,
          priority: (input.priority as string) || 'medium',
          project_id: (input.project_id as string) || null,
          description: (input.description as string) || null,
          status: 'todo',
        })
        .select()
        .single()

      if (error) return { success: false, error: error.message }
      return { success: true, task: data }
    }

    case 'update_task': {
      const updates: Record<string, unknown> = {}
      if (input.title) updates.title = input.title
      if (input.status) updates.status = input.status
      if (input.priority) updates.priority = input.priority
      if (input.scheduled_date !== undefined) updates.scheduled_date = input.scheduled_date

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', input.task_id as string)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) return { success: false, error: error.message }
      return { success: true, task: data }
    }

    case 'list_tasks': {
      let query = supabase
        .from('tasks')
        .select('*, project:projects(name,color)')
        .eq('user_id', userId)
        .order('position')

      if (input.date) {
        query = query.eq('scheduled_date', input.date as string)
      } else {
        query = query.gte('scheduled_date', todayString()).neq('status', 'done')
      }

      if (input.status) {
        query = query.eq('status', input.status as string)
      }

      const { data, error } = await query.limit(50)
      if (error) return { success: false, error: error.message }
      return { success: true, tasks: data, count: data?.length ?? 0 }
    }

    case 'create_project': {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: input.name as string,
          description: (input.description as string) || null,
          due_date: (input.due_date as string) || null,
          color: (input.color as string) || '#6366f1',
          status: 'active',
        })
        .select()
        .single()

      if (error) return { success: false, error: error.message }
      return { success: true, project: data }
    }

    case 'list_projects': {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) return { success: false, error: error.message }
      return { success: true, projects: data }
    }

    case 'create_habit': {
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: userId,
          name: input.name as string,
          description: (input.description as string) || null,
          frequency: (input.frequency as string) || 'daily',
          color: (input.color as string) || '#10b981',
        })
        .select()
        .single()

      if (error) return { success: false, error: error.message }
      return { success: true, habit: data }
    }

    case 'log_habit': {
      const date = (input.logged_date as string) || todayString()
      const { error } = await supabase
        .from('habit_logs')
        .upsert({
          habit_id: input.habit_id as string,
          user_id: userId,
          logged_date: date,
        }, { onConflict: 'habit_id,logged_date' })

      if (error) return { success: false, error: error.message }
      return { success: true, logged_date: date }
    }

    case 'list_habits': {
      const today = todayString()
      const { data: habits, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('created_at')

      if (error || !habits) return { success: false, error: error?.message }

      const { data: logs } = await supabase
        .from('habit_logs')
        .select('habit_id')
        .eq('user_id', userId)
        .eq('logged_date', today)

      const loggedIds = new Set((logs || []).map((l: { habit_id: string }) => l.habit_id))

      return {
        success: true,
        habits: habits.map(h => ({ ...h, logged_today: loggedIds.has(h.id) })),
      }
    }

    case 'get_daily_summary': {
      const date = (input.date as string) || todayString()
      const [{ data: tasks }, { data: habits }, { data: logs }] = await Promise.all([
        supabase.from('tasks').select('title,status,priority').eq('user_id', userId).eq('scheduled_date', date),
        supabase.from('habits').select('name').eq('user_id', userId).eq('archived', false),
        supabase.from('habit_logs').select('habit_id').eq('user_id', userId).eq('logged_date', date),
      ])

      const loggedHabitIds = new Set((logs || []).map((l: { habit_id: string }) => l.habit_id))
      const { data: habitsFull } = await supabase.from('habits').select('id,name').eq('user_id', userId).eq('archived', false)

      return {
        date,
        tasks: tasks || [],
        task_count: tasks?.length ?? 0,
        done_count: tasks?.filter(t => t.status === 'done').length ?? 0,
        habits: (habitsFull || []).map(h => ({ name: h.name, completed: loggedHabitIds.has(h.id) })),
        habits_count: habits?.length ?? 0,
      }
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` }
  }
}
