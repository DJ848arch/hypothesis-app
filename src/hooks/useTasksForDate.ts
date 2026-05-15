import useSWR from 'swr'
import { Task } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useTasksForDate(date: string) {
  const { data, error, isLoading, mutate } = useSWR<Task[]>(
    `/api/tasks?date=${date}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  return { tasks: data || [], error, isLoading, mutate }
}

export function useProjectTasks(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<Task[]>(
    `/api/tasks?project_id=${projectId}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  return { tasks: data || [], error, isLoading, mutate }
}
