'use client'

import { Project } from '@/types'
import { Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Props {
  project: Project
}

export default function ProjectCard({ project }: Props) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-xl border p-4 hover:opacity-80 transition-opacity"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: project.color }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{project.name}</h3>
        </div>
        <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
      </div>

      {project.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>{project.description}</p>
      )}

      {project.due_date && (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3" style={{ color: 'var(--muted-foreground)' }} />
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
    </Link>
  )
}
