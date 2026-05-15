'use client'

interface Props {
  logs: string[] // array of YYYY-MM-DD strings
  color: string
}

export default function HabitCalendar({ logs, color }: Props) {
  const logSet = new Set(logs)
  const weeks = 12
  const today = new Date()

  // Build 12 weeks of days (84 days back)
  const days: Date[] = []
  for (let i = (weeks * 7) - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(d)
  }

  // Pad start to Monday alignment
  const firstDayOfWeek = days[0].getDay() // 0=Sun
  const paddedDays: (Date | null)[] = [
    ...Array(firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1).fill(null),
    ...days,
  ]

  // Group into weeks
  const weekGroups: (Date | null)[][] = []
  for (let i = 0; i < paddedDays.length; i += 7) {
    weekGroups.push(paddedDays.slice(i, i + 7))
  }

  function dateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="flex gap-1">
      {weekGroups.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => {
            if (!day) return <div key={di} className="w-3 h-3" />
            const ds = dateStr(day)
            const logged = logSet.has(ds)
            const isToday = ds === dateStr(today)
            return (
              <div
                key={di}
                title={`${ds}${logged ? ' ✓' : ''}`}
                className="w-3 h-3 rounded-sm transition-opacity"
                style={{
                  background: logged ? color : 'var(--muted)',
                  opacity: logged ? 1 : isToday ? 0.5 : 0.3,
                  outline: isToday ? `1px solid ${color}` : undefined,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
