'use client'

import { use } from 'react'
import { useProjectTasks } from '@/hooks/useTasksForDate'
import KanbanBoard from '@/components/projects/KanbanBoard'
import { useProjects } from '@/hooks/useProjects'
import { Task } from '@/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { tasks, isLoading, mutate } = useProjectTasks(id)
  const { projects } = useProjects()
  const project = projects.find(p => p.id === id)

  async function updateTask(taskId: string, updates: Partial<Task>) {
    mutate(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t), false)
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    mutate()
  }

  async function deleteTask(taskId: string) {
    mutate(tasks.filter(t => t.id !== taskId), false)
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
  }

  async function addTask(title: string, status: Task['status']) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status, project_id: id, priority: 'medium' }),
    })
    if (res.ok) mutate()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/projects" className="p-2 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--muted-foreground)' }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        {project && (
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full" style={{ background: project.color }} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{project.name}</h1>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          tasks={tasks}
          isLoading={isLoading}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onAdd={addTask}
        />
      </div>
    </div>
  )
}
