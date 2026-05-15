import { createClient } from '@/lib/supabase/server'
import { todayString, formatDate } from '@/lib/utils'
import { CheckCircle, Circle, Flame, FolderKanban } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = todayString()

  const [{ data: tasks }, { data: habits }, { data: habitLogs }, { data: projects }] = await Promise.all([
    supabase.from('tasks').select('id,title,status,priority').eq('user_id', user!.id).eq('scheduled_date', today).order('position'),
    supabase.from('habits').select('id,name,color').eq('user_id', user!.id).eq('archived', false),
    supabase.from('habit_logs').select('habit_id').eq('user_id', user!.id).eq('logged_date', today),
    supabase.from('projects').select('id,name,color,status').eq('user_id', user!.id).eq('status', 'active').limit(5),
  ])

  const loggedIds = new Set((habitLogs || []).map(l => l.habit_id))
  const doneTasks = (tasks || []).filter(t => t.status === 'done')
  const todoTasks = (tasks || []).filter(t => t.status !== 'done')

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Good morning</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>{formatDate(new Date())}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Tasks today"
          value={`${doneTasks.length}/${(tasks || []).length}`}
          sub={`${todoTasks.length} remaining`}
          color="#6366f1"
        />
        <StatCard
          label="Habits logged"
          value={`${loggedIds.size}/${(habits || []).length}`}
          sub="today"
          color="#10b981"
        />
        <StatCard
          label="Active projects"
          value={String((projects || []).length)}
          sub="in progress"
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Today's tasks */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Today&apos;s Tasks</h2>
          {(tasks || []).length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>No tasks scheduled. Ask the AI to add some!</p>
          ) : (
            <div className="space-y-2">
              {(tasks || []).slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  {t.status === 'done'
                    ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    : <Circle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                  }
                  <span className={`text-sm ${t.status === 'done' ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--foreground)' }}>{t.title}</span>
                </div>
              ))}
              {(tasks || []).length > 5 && (
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>+{(tasks || []).length - 5} more</p>
              )}
            </div>
          )}
        </div>

        {/* Habits */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Habits</h2>
          {(habits || []).length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>No habits yet. Ask the AI to create some!</p>
          ) : (
            <div className="space-y-2">
              {(habits || []).slice(0, 6).map(h => (
                <div key={h.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: h.color }} />
                  <span className="text-sm flex-1" style={{ color: 'var(--foreground)' }}>{h.name}</span>
                  {loggedIds.has(h.id)
                    ? <Flame className="w-3.5 h-3.5 text-orange-400" />
                    : <div className="w-3.5 h-3.5 rounded-full border" style={{ borderColor: 'var(--muted-foreground)' }} />
                  }
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        {(projects || []).length > 0 && (
          <div className="col-span-2 rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <FolderKanban className="w-4 h-4" />
              Active Projects
            </h2>
            <div className="flex flex-wrap gap-2">
              {(projects || []).map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'var(--secondary)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  <span style={{ color: 'var(--foreground)' }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{sub}</p>
    </div>
  )
}
