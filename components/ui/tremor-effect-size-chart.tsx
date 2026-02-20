'use client'

import { BarChart } from '@tremor/react'

interface EffectSizeData {
  hypothesisName: string
  effectSize: number
  cohensD: number
  r2: number
  significance: 'p<0.001' | 'p<0.01' | 'p<0.05' | 'ns'
}

interface EffectSizeChartProps {
  data: EffectSizeData[]
  title?: string
}

/**
 * Effect Size Comparison Chart
 * Compares effect sizes across multiple hypotheses
 * Helps identify which hypotheses have the strongest evidence
 */
export function EffectSizeChart({
  data,
  title = 'Effect Size Comparison',
}: EffectSizeChartProps) {
  const chartData = data.map((item) => ({
    Hypothesis: item.hypothesisName.substring(0, 12),
    "Cohen's d": parseFloat(Math.abs(item.cohensD).toFixed(2)),
    'R²': parseFloat((item.r2 * 100).toFixed(1)),
  }))

  const colorMap: Record<string, string> = {
    'p<0.001': '#059669',
    'p<0.01': '#0891b2',
    'p<0.05': '#f59e0b',
    ns: '#6b7280',
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">
          Absolute effect sizes with statistical significance indicators
        </p>
      </div>
      <BarChart
        data={chartData}
        index="Hypothesis"
        categories={["Cohen's d", 'R²']}
        colors={['blue', 'purple']}
        valueFormatter={(value) => value.toFixed(2)}
        showLegend={true}
        className="mt-4 h-64"
      />
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-600 rounded" />
          <span>p&lt;0.001 (Very Strong)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-cyan-600 rounded" />
          <span>p&lt;0.01 (Strong)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded" />
          <span>p&lt;0.05 (Moderate)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500 rounded" />
          <span>ns (Not Significant)</span>
        </div>
      </div>
    </div>
  )
}
