'use client'

import { Flame, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  habit: {
    id: string
    name: string
    description: string | null
    color: string
    frequency: string
    logged_today: boolean
    streak?: number
  }
  onToggle: (id: string, loggedToday: boolean) => void
}

export default function HabitItem({ habit, onToggle }: Props) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-xl border"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* Color dot */}
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: habit.color }} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{habit.name}</p>
        {habit.description && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>{habit.description}</p>
        )}
        <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--muted-foreground)' }}>{habit.frequency}</p>
      </div>

      {/* Streak */}
      {(habit.streak || 0) > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(251,146,60,0.15)' }}>
          <Flame className="w-3 h-3 text-orange-400" />
          <span className="text-xs font-medium text-orange-400">{habit.streak}</span>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => onToggle(habit.id, habit.logged_today)}
        className={cn(
          'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
          habit.logged_today ? 'border-emerald-500' : 'border-muted-foreground hover:border-emerald-400'
        )}
        style={{
          borderColor: habit.logged_today ? '#10b981' : 'var(--muted-foreground)',
          background: habit.logged_today ? '#10b981' : 'transparent',
        }}
      >
        {habit.logged_today && <Check className="w-4 h-4 text-white" />}
      </button>
    </div>
  )
}
