'use client'

import { Card, CardContent } from '@/components/ui'
import { LineChart, BarChart } from '@tremor/react'

interface MetaAnalysisData {
  totalStudies: number
  totalParticipants: number
  pooledEffectSize: number
  heterogeneityI2: number
  confidenceLevel: number
  studies: Array<{
    name: string
    sampleSize: number
    effectSize: number
    year: number
    pValue: number
  }>
}

interface MetaAnalysisDashboardProps {
  data: MetaAnalysisData
  title?: string
}

/**
 * Meta-Analysis Dashboard
 * Comprehensive visualization of multiple studies combined
 * Shows pooled effect, heterogeneity, study quality
 *
 * Useful for:
 * - Systematic reviews
 * - Multi-study meta-analyses
 * - Replication meta-analysis
 */
export function MetaAnalysisDashboard({
  data,
  title = 'Meta-Analysis Summary',
}: MetaAnalysisDashboardProps) {
  const effectGuide = {
    small: 0.2,
    medium: 0.5,
    large: 0.8,
  }

  // Study timeline data
  const timelineData = data.studies.map((study) => ({
    Year: study.year,
    'Effect Size': parseFloat(study.effectSize.toFixed(2)),
    'N (÷100)': Math.round(study.sampleSize / 100),
  }))

  // Study power visualization (scatter-like with bar chart)
  const studyData = data.studies.map((study) => ({
    Study: study.name.substring(0, 15),
    'N': Math.round(study.sampleSize / 100),
    'Effect': parseFloat(study.effectSize.toFixed(2)),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Combined analysis of {data.totalStudies} studies with {data.totalParticipants.toLocaleString()} total participants
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Pooled Effect Size</p>
              <p className="text-3xl font-bold mt-2">{data.pooledEffectSize.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.pooledEffectSize < effectGuide.small
                  ? 'Negligible'
                  : data.pooledEffectSize < effectGuide.medium
                    ? 'Small'
                    : data.pooledEffectSize < effectGuide.large
                      ? 'Medium'
                      : 'Large'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Heterogeneity (I²)</p>
              <p className="text-3xl font-bold mt-2">{data.heterogeneityI2.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.heterogeneityI2 < 25
                  ? 'Low'
                  : data.heterogeneityI2 < 75
                    ? 'Moderate'
                    : 'High'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Studies</p>
              <p className="text-3xl font-bold mt-2">{data.totalStudies}</p>
              <p className="text-xs text-muted-foreground mt-1">Included in analysis</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Participants</p>
              <p className="text-3xl font-bold mt-2">{(data.totalParticipants / 1000).toFixed(1)}k</p>
              <p className="text-xs text-muted-foreground mt-1">Combined N</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Effect Size Timeline */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Study Effect Sizes Over Time</h3>
          <LineChart
            data={timelineData}
            index="Year"
            categories={['Effect Size', 'N (÷100)']}
            colors={['blue', 'emerald']}
            valueFormatter={(value) => value.toFixed(2)}
            showLegend={true}
            className="h-64"
          />
        </CardContent>
      </Card>

      {/* Individual Studies Chart */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Individual Study Effect Sizes</h3>
          <BarChart
            data={studyData}
            index="Study"
            categories={['Effect', 'N (÷100)']}
            colors={['blue', 'emerald']}
            valueFormatter={(value) => value.toFixed(2)}
            showLegend={true}
            className="h-64"
          />
        </CardContent>
      </Card>

      {/* Study Quality Table */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Individual Study Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Study</th>
                  <th className="text-right py-2 px-2">N</th>
                  <th className="text-right py-2 px-2">Effect Size</th>
                  <th className="text-right py-2 px-2">P-Value</th>
                  <th className="text-right py-2 px-2">Year</th>
                </tr>
              </thead>
              <tbody>
                {data.studies.map((study) => (
                  <tr key={study.name} className="border-b hover:bg-accent">
                    <td className="py-2 px-2">{study.name}</td>
                    <td className="text-right py-2 px-2">{study.sampleSize.toLocaleString()}</td>
                    <td className="text-right py-2 px-2 font-semibold">{study.effectSize.toFixed(3)}</td>
                    <td className="text-right py-2 px-2">
                      {study.pValue < 0.001
                        ? '<0.001'
                        : study.pValue < 0.01
                          ? '<0.01'
                          : study.pValue < 0.05
                            ? '<0.05'
                            : study.pValue.toFixed(3)}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{study.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
