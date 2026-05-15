'use client'

import { useHabits } from '@/hooks/useHabits'
import HabitItem from '@/components/habits/HabitItem'
import HabitCalendar from '@/components/habits/HabitCalendar'
import { Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { todayString } from '@/lib/utils'

interface HabitWithLogs {
  id: string
  name: string
  description: string | null
  color: string
  frequency: string
  logged_today: boolean
  streak?: number
  logs?: string[]
}

function computeStreak(logs: string[]): number {
  if (!logs || logs.length === 0) return 0
  const sorted = [...logs].sort().reverse()
  const today = todayString()
  let streak = 0
  let current = new Date(today)

  for (const log of sorted) {
    const d = new Date(current)
    d.setDate(d.getDate() - streak)
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (log === expected) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export default function HabitsPage() {
  const { habits, isLoading, mutate } = useHabits()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekly'>('daily')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function createHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), frequency }),
    })
    if (res.ok) {
      mutate()
      setName('')
      setShowForm(false)
    }
  }

  async function toggleHabit(id: string, loggedToday: boolean) {
    if (loggedToday) {
      await fetch(`/api/habits/${id}/log?date=${todayString()}`, { method: 'DELETE' })
    } else {
      await fetch(`/api/habits/${id}/log`, { method: 'POST' })
    }
    mutate()
  }

  const habitsWithStreak: HabitWithLogs[] = (habits || []).map((h: HabitWithLogs) => ({
    ...h,
    streak: computeStreak(h.logs || []),
  }))

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Habits</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--primary)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          New Habit
        </button>
      </div>

      {showForm && (
        <form onSubmit={createHabit} className="rounded-xl border p-4 mb-6 space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>New Habit</h2>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Habit name (e.g. Morning run)"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ background: 'var(--secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
          <select
            value={frequency}
            onChange={e => setFrequency(e.target.value as typeof frequency)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Weekly</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={!name.trim()} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40" style={{ background: 'var(--primary)', color: 'white' }}>
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--muted-foreground)' }} />
        </div>
      ) : habitsWithStreak.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No habits yet.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Create one above or tell the AI: &quot;Add a daily meditation habit&quot;</p>
        </div>
      ) : (
        <div className="space-y-2">
          {habitsWithStreak.map(h => (
            <div key={h.id}>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <HabitItem habit={h} onToggle={toggleHabit} />
                </div>
                {h.logs && h.logs.length > 0 && (
                  <button
                    onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                    className="p-2 rounded-lg hover:opacity-70 transition-opacity flex-shrink-0"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {expandedId === h.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {expandedId === h.id && h.logs && (
                <div className="mt-2 ml-4 p-3 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Last 12 weeks</p>
                  <HabitCalendar logs={h.logs} color={h.color} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
