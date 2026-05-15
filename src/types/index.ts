export interface Profile {
  id: string
  display_name: string | null
  timezone: string
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  status: 'active' | 'completed' | 'archived'
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  scheduled_date: string | null
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
  project?: Project
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  frequency: 'daily' | 'weekdays' | 'weekly'
  color: string
  archived: boolean
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  logged_date: string
  note: string | null
  created_at: string
}

export interface HabitWithStreak extends Habit {
  streak: number
  logged_today: boolean
  logs?: HabitLog[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface SSEEvent {
  type: 'text' | 'tool_result' | 'done' | 'error'
  delta?: string
  toolName?: string
  result?: Record<string, unknown>
  success?: boolean
  message?: string
}
