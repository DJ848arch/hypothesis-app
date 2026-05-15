'use client'

import { Task } from '@/types'
import { Plus, Circle, Loader2, Trash2, AlertCircle, Minus, ArrowDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  tasks: Task[]
  isLoading: boolean
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDelete: (id: string) => void
  onAdd: (title: string, status: Task['status']) => void
}

const columns: { status: Task['status']; label: string; color: string }[] = [
  { status: 'todo', label: 'To Do', color: '#6366f1' },
  { status: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { status: 'done', label: 'Done', color: '#10b981' },
]

const priorityIcons = {
  high: <AlertCircle className="w-3 h-3 text-red-400" />,
  medium: <Minus className="w-3 h-3 text-yellow-400" />,
  low: <ArrowDown className="w-3 h-3 text-slate-500" />,
}

export default function KanbanBoard({ tasks, isLoading, onUpdate, onDelete, onAdd }: Props) {
  const [addingTo, setAddingTo] = useState<Task['status'] | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Task['status'] | null>(null)

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDragging(taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e: React.DragEvent, status: Task['status']) {
    e.preventDefault()
    if (dragging) {
      onUpdate(dragging, { status })
    }
    setDragging(null)
    setDragOver(null)
  }

  function submitAdd(status: Task['status']) {
    if (newTitle.trim()) {
      onAdd(newTitle.trim(), status)
      setNewTitle('')
    }
    setAddingTo(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--muted-foreground)' }} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status)
        const isOver = dragOver === col.status

        return (
          <div
            key={col.status}
            className={cn('flex flex-col rounded-xl border p-3 min-h-[400px] transition-colors', isOver && 'ring-2 ring-inset ring-indigo-500')}
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            onDragOver={e => { e.preventDefault(); setDragOver(col.status) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, col.status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                  {col.label}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => { setAddingTo(col.status); setNewTitle('') }}
                className="p-1 rounded hover:opacity-70 transition-opacity"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add form */}
            {addingTo === col.status && (
              <div className="mb-2">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitAdd(col.status); if (e.key === 'Escape') setAddingTo(null) }}
                  onBlur={() => submitAdd(col.status)}
                  placeholder="Task title..."
                  className="w-full px-2.5 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
            )}

            {/* Tasks */}
            <div className="flex-1 space-y-2 overflow-y-auto">
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={e => handleDragStart(e, task.id)}
                  className="group p-3 rounded-lg border cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--secondary)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1 leading-snug" style={{ color: 'var(--foreground)' }}>{task.title}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {priorityIcons[task.priority]}
                      <button
                        onClick={() => onDelete(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {colTasks.length === 0 && addingTo !== col.status && (
                <div
                  className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed text-xs"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                >
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
