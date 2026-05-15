import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useHabits() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/habits?with_logs=true',
    fetcher,
    { revalidateOnFocus: false }
  )

  return { habits: data || [], error, isLoading, mutate }
}
