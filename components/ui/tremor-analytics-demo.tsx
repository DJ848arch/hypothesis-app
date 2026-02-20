'use client'

import { ReplicationChart } from './tremor-replication-chart'
import { ConfidenceGraph } from './tremor-confidence-graph'
import { EffectSizeChart } from './tremor-effect-size-chart'
import { MetaAnalysisDashboard } from './tremor-meta-analysis'
import { StatisticalPowerWidget } from './tremor-statistical-power'

/**
 * Tremor Analytics Demo
 * Comprehensive dashboard showing all analytics components
 * Perfect for meta-analysis, replication studies, and research dashboards
 */
export default function TremorAnalyticsDemo() {
  // Sample data for replication studies
  const replicationStudies = [
    { studyName: 'Original Study (Smith 2023)', successRate: 85, sampleSize: 2500, year: 2023 },
    { studyName: 'Replication A (Jones 2024)', successRate: 78, sampleSize: 2100, year: 2024 },
    { studyName: 'Replication B (Wang 2024)', successRate: 81, sampleSize: 2300, year: 2024 },
    { studyName: 'Replication C (Kumar 2025)', successRate: 76, sampleSize: 1900, year: 2025 },
    { studyName: 'Replication D (Lee 2025)', successRate: 79, sampleSize: 2200, year: 2025 },
  ]

  // Sample data for confidence intervals
  const confidenceData = [
    { sampleSize: 30, mean: 0.45, ci95Lower: 0.15, ci95Upper: 0.75, pValue: 0.08 },
    { sampleSize: 50, mean: 0.52, ci95Lower: 0.26, ci95Upper: 0.78, pValue: 0.04 },
    { sampleSize: 100, mean: 0.58, ci95Lower: 0.38, ci95Upper: 0.78, pValue: 0.008 },
    { sampleSize: 200, mean: 0.62, ci95Lower: 0.46, ci95Upper: 0.78, pValue: 0.001 },
    { sampleSize: 300, mean: 0.64, ci95Lower: 0.52, ci95Upper: 0.76, pValue: 0.0001 },
  ]

  // Sample data for effect sizes
  const effectSizeData = [
    { hypothesisName: 'Hypothesis A', effectSize: 0.65, cohensD: 0.72, r2: 0.28, significance: 'p<0.001' as const },
    { hypothesisName: 'Hypothesis B', effectSize: 0.48, cohensD: 0.51, r2: 0.16, significance: 'p<0.01' as const },
    { hypothesisName: 'Hypothesis C', effectSize: 0.32, cohensD: 0.34, r2: 0.09, significance: 'p<0.05' as const },
    { hypothesisName: 'Hypothesis D', effectSize: 0.15, cohensD: 0.15, r2: 0.02, significance: 'ns' as const },
    { hypothesisName: 'Hypothesis E', effectSize: 0.55, cohensD: 0.61, r2: 0.22, significance: 'p<0.001' as const },
  ]

  // Sample data for meta-analysis
  const metaAnalysisData = {
    totalStudies: 12,
    totalParticipants: 8500,
    pooledEffectSize: 0.58,
    heterogeneityI2: 45.2,
    confidenceLevel: 95,
    studies: [
      { name: 'Smith et al. 2023', sampleSize: 2500, effectSize: 0.62, year: 2023, pValue: 0.001 },
      { name: 'Jones et al. 2024', sampleSize: 2100, effectSize: 0.55, year: 2024, pValue: 0.002 },
      { name: 'Wang et al. 2024', sampleSize: 2300, effectSize: 0.58, year: 2024, pValue: 0.001 },
      { name: 'Kumar et al. 2025', sampleSize: 1900, effectSize: 0.54, year: 2025, pValue: 0.003 },
      { name: 'Lee et al. 2025', sampleSize: 2200, effectSize: 0.61, year: 2025, pValue: 0.0005 },
      { name: 'Martinez et al. 2025', sampleSize: 1800, effectSize: 0.57, year: 2025, pValue: 0.004 },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Tremor-powered visualizations for hypothesis research and meta-analysis
          </p>
        </div>

        {/* Replication Studies Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <ReplicationChart
            data={replicationStudies}
            title="Hypothesis Replication Success Across Studies"
          />
        </div>

        {/* Confidence Intervals Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <ConfidenceGraph
            data={confidenceData}
            title="Confidence Interval Convergence as N Increases"
            threshold={0.05}
          />
        </div>

        {/* Effect Size Comparison Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <EffectSizeChart data={effectSizeData} title="Comparative Effect Sizes" />
        </div>

        {/* Statistical Power Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <StatisticalPowerWidget alphaLevel={0.05} title="Sample Size & Statistical Power Analysis" />
        </div>

        {/* Meta-Analysis Dashboard Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <MetaAnalysisDashboard
            data={metaAnalysisData}
            title="Comprehensive Meta-Analysis Dashboard"
          />
        </div>

        {/* Usage Guide */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-8 space-y-4">
          <h2 className="text-xl font-bold">Usage Guide</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                ReplicationChart
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                Shows success rates across multiple replication studies. Use for tracking replication
                consistency and identifying robust effects.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                ConfidenceGraph
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                Visualizes how confidence intervals narrow with sample size. Perfect for showing
                statistical precision improvement.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                EffectSizeChart
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                Compares effect sizes across hypotheses with significance indicators. Color-coded
                for easy interpretation of statistical strength.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                StatisticalPowerWidget
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                Shows power curves for study planning. Helps determine required sample sizes for
                different effect sizes.
              </p>
            </div>
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                MetaAnalysisDashboard
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                Comprehensive view combining metrics, timelines, scatter plots, and study details.
                Perfect for full meta-analysis reporting with pooled effect sizes and heterogeneity
                analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Import Examples */}
        <div className="bg-slate-900 dark:bg-slate-800 rounded-xl p-8 font-mono text-sm text-slate-100 overflow-x-auto">
          <h2 className="text-xl font-bold mb-4 text-slate-100">Import Examples</h2>
          <pre>{`import {
  ReplicationChart,
  ConfidenceGraph,
  EffectSizeChart,
  MetaAnalysisDashboard,
  StatisticalPowerWidget,
} from '@/components/ui'

// Use in your page
<MetaAnalysisDashboard 
  data={studiesData} 
  title="Our Meta-Analysis Results"
/>

<StatisticalPowerWidget alphaLevel={0.05} />`}</pre>
        </div>
      </div>
    </div>
  )
}
