'use client'

import { LineChart, Title } from '@tremor/react'

interface ConfidenceDataPoint {
  sampleSize: number
  mean: number
  ci95Lower: number
  ci95Upper: number
  pValue: number
}

interface ConfidenceGraphProps {
  data: ConfidenceDataPoint[]
  title?: string
  threshold?: number
}

/**
 * Confidence Graph Component
 * Shows how confidence intervals narrow as sample size increases
 * Visualizes statistical precision improvement over study duration
 */
export function ConfidenceGraph({
  data,
  title = 'Confidence Interval Convergence',
  threshold = 0.05,
}: ConfidenceGraphProps) {
  const chartData = data.map((item) => ({
    'N': item.sampleSize,
    'Mean': parseFloat(item.mean.toFixed(3)),
    'CI Upper': parseFloat(item.ci95Upper.toFixed(3)),
    'CI Lower': parseFloat(item.ci95Lower.toFixed(3)),
  }))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">
          Confidence intervals narrowing with increased sample size (p &lt; {threshold})
        </p>
      </div>
      <LineChart
        data={chartData}
        index="N"
        categories={['Mean', 'CI Upper', 'CI Lower']}
        colors={['blue', 'red', 'red']}
        valueFormatter={(value) => value.toFixed(3)}
        showLegend={true}
        className="mt-4 h-64"
      />
    </div>
  )
}
