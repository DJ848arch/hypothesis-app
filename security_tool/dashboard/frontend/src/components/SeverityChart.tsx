import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS: Record<string, string> = {
  CRITICAL: '#ff4d4f',
  HIGH:     '#ff7a45',
  MEDIUM:   '#ffc53d',
  LOW:      '#40a9ff',
  INFO:     '#36cfc9',
}

interface Props {
  counts: Record<string, number>
}

export default function SeverityChart({ counts }: Props) {
  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        No findings to chart
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] ?? '#888'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3' }}
          formatter={(value, name) => [value, name]}
        />
        <Legend
          formatter={(value) => <span style={{ color: COLORS[value] ?? '#888', fontWeight: 700, fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
