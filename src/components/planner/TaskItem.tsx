'use client'

import { useState } from 'react'
import { Task } from '@/types'
import { Check, Trash2, Circle, AlertCircle, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  task: Task
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDelete: (id: string) => void
}

const priorityIcons = {
  high: <AlertCircle className="w-3 h-3 text-red-400" />,
  medium: <Minus className="w-3 h-3 text-yellow-400" />,
  low: <ArrowDown className="w-3 h-3 text-slate-500" />,
}

export default function TaskItem({ task, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const done = task.status === 'done'

  function toggleDone() {
    onUpdate(task.id, { status: done ? 'todo' : 'done' })
  }

  function saveEdit() {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate(task.id, { title: editTitle.trim() })
    }
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-3 rounded-lg border transition-opacity',
        done && 'opacity-50'
      )}
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* Checkbox */}
      <button
        onClick={toggleDone}
        className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors hover:border-indigo-400"
        style={{ borderColor: done ? 'var(--primary)' : 'var(--muted-foreground)', background: done ? 'var(--primary)' : 'transparent' }}
      >
        {done && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: 'var(--foreground)' }}
          />
        ) : (
          <span
            className={cn('text-sm cursor-pointer', done && 'line-through')}
            style={{ color: 'var(--foreground)' }}
            onDoubleClick={() => setEditing(true)}
          >
            {task.title}
          </span>
        )}

        {task.project && (
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: task.project.color }} />
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{task.project.name}</span>
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="flex-shrink-0">
        {priorityIcons[task.priority]}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  )
}
