'use client'

import { useState } from 'react'
import { useTasksForDate } from '@/hooks/useTasksForDate'
import TaskItem from './TaskItem'
import { Task } from '@/types'
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toDateString, formatDate, addDays } from '@/lib/utils'

export default function DailyPlannerView() {
  const [date, setDate] = useState(new Date())
  const dateStr = toDateString(date)
  const { tasks, isLoading, mutate } = useTasksForDate(dateStr)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), scheduled_date: dateStr, status: 'todo', priority: 'medium' }),
    })
    if (res.ok) {
      const task = await res.json()
      mutate([...tasks, task], false)
      setNewTitle('')
    }
  }

  async function updateTask(id: string, updates: Partial<Task>) {
    mutate(tasks.map(t => t.id === id ? { ...t, ...updates } : t), false)
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    mutate()
  }

  async function deleteTask(id: string) {
    mutate(tasks.filter(t => t.id !== id), false)
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }

  const todo = tasks.filter(t => t.status !== 'done')
  const done = tasks.filter(t => t.status === 'done')
  const isToday = dateStr === toDateString(new Date())

  return (
    <div className="flex flex-col h-full">
      {/* Date nav */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setDate(addDays(date, -1))}
          className="p-2 rounded-lg hover:opacity-70 transition-opacity"
          style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>{formatDate(date)}</h2>
          {isToday && <span className="text-xs font-medium text-indigo-400">Today</span>}
        </div>

        <button
          onClick={() => setDate(new Date())}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
        >
          Today
        </button>

        <button
          onClick={() => setDate(addDays(date, 1))}
          className="p-2 rounded-lg hover:opacity-70 transition-opacity"
          style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Add task */}
      <form onSubmit={addTask} className="flex gap-2 mb-4">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--primary)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </form>

      {/* Tasks */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--muted-foreground)' }} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Progress */}
          {tasks.length > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
                <span>{done.length} of {tasks.length} complete</span>
                <span>{Math.round((done.length / tasks.length) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(done.length / tasks.length) * 100}%`, background: 'var(--primary)' }}
                />
              </div>
            </div>
          )}

          {/* Todo tasks */}
          {todo.length > 0 && (
            <div className="space-y-2">
              {todo.map(task => (
                <TaskItem key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />
              ))}
            </div>
          )}

          {/* Done tasks */}
          {done.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Completed</p>
              <div className="space-y-2">
                {done.map(task => (
                  <TaskItem key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No tasks for this day.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Add one above or ask the AI assistant.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
