'use client'

import { BarChart, Title, Legend } from '@tremor/react'

interface ReplicationData {
  studyName: string
  successRate: number
  sampleSize: number
  year: number
}

interface ReplicationChartProps {
  data: ReplicationData[]
  title?: string
}

/**
 * Replication Chart Component
 * Visualizes success rates across multiple replication studies
 * Useful for meta-analysis of hypothesis confirmation
 */
export function ReplicationChart({
  data,
  title = 'Hypothesis Replication Success Rates',
}: ReplicationChartProps) {
  const chartData = data.map((item) => ({
    Study: item.studyName.substring(0, 20), // Truncate for readability
    'Success %': item.successRate,
    'N (÷100)': Math.round(item.sampleSize / 100),
  }))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">
          Replication success rates across independent studies
        </p>
      </div>
      <BarChart
        data={chartData}
        index="Study"
        categories={['Success %', 'N (÷100)']}
        colors={['blue', 'emerald']}
        valueFormatter={(value) => `${value}`}
        showLegend={true}
        className="mt-4 h-64"
      />
    </div>
  )
}
