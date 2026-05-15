import useSWR from 'swr'
import { Project } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<Project[]>(
    '/api/projects',
    fetcher,
    { revalidateOnFocus: false }
  )

  return { projects: data || [], error, isLoading, mutate }
}
