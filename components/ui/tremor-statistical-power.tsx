'use client'

import { LineChart } from '@tremor/react'

interface StatisticalPowerProps {
  alphaLevel?: number
  title?: string
}

/**
 * Statistical Power Analysis Widget
 * Shows relationship between sample size, effect size, and statistical power
 * Helps researchers plan required sample sizes
 *
 * Power = 1 - β (beta error)
 * Higher power = lower chance of Type II error (false negative)
 */
export function StatisticalPowerWidget({
  alphaLevel = 0.05,
  title = 'Statistical Power Analysis',
}: StatisticalPowerProps) {
  // Simplified power calculation for visualization
  // In production, use pwr package or similar
  const generatePowerData = () => {
    const data = []
    for (let n = 10; n <= 500; n += 10) {
      data.push({
        'Sample Size': n,
        'Small (d=0.2)': Math.min(100, Math.round((Math.sqrt(n) * 0.2 / 1.5) * 100)),
        'Medium (d=0.5)': Math.min(100, Math.round((Math.sqrt(n) * 0.5 / 1) * 100)),
        'Large (d=0.8)': Math.min(100, Math.round((Math.sqrt(n) * 0.8 / 0.8) * 100)),
      })
    }
    return data
  }

  const powerData = generatePowerData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">
          Statistical power (1-β) by sample size and effect size (α = {alphaLevel})
        </p>
      </div>
      <LineChart
        data={powerData}
        index="Sample Size"
        categories={['Small (d=0.2)', 'Medium (d=0.5)', 'Large (d=0.8)']}
        colors={['amber', 'blue', 'emerald']}
        valueFormatter={(value) => `${value}%`}
        showLegend={true}
        className="h-80"
      />

      {/* Interpretation Guide */}
      <div className="bg-accent/50 rounded-lg p-4 space-y-3 text-sm">
        <h4 className="font-semibold">Interpretation Guide:</h4>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <strong className="text-foreground">Power &gt; 80%:</strong> Standard target for hypothesis testing
          </li>
          <li>
            <strong className="text-foreground">Power &gt; 90%:</strong> Recommended for important claims
          </li>
          <li>
            <strong className="text-foreground">Large effects:</strong> Require smaller sample sizes
          </li>
          <li>
            <strong className="text-foreground">Small effects:</strong> Require much larger sample sizes
          </li>
        </ul>
      </div>

      {/* Quick Reference Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent">
            <tr>
              <th className="text-left py-2 px-3">Effect Size</th>
              <th className="text-center py-2 px-3">For 80% Power</th>
              <th className="text-center py-2 px-3">For 90% Power</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t hover:bg-accent/50">
              <td className="py-2 px-3">Small (d=0.2)</td>
              <td className="text-center py-2 px-3">N ≈ 394</td>
              <td className="text-center py-2 px-3">N ≈ 526</td>
            </tr>
            <tr className="border-t hover:bg-accent/50">
              <td className="py-2 px-3">Medium (d=0.5)</td>
              <td className="text-center py-2 px-3">N ≈ 64</td>
              <td className="text-center py-2 px-3">N ≈ 86</td>
            </tr>
            <tr className="border-t hover:bg-accent/50">
              <td className="py-2 px-3">Large (d=0.8)</td>
              <td className="text-center py-2 px-3">N ≈ 25</td>
              <td className="text-center py-2 px-3">N ≈ 34</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
