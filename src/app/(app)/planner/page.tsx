import DailyPlannerView from '@/components/planner/DailyPlannerView'

export default function PlannerPage() {
  return (
    <div className="max-w-2xl h-full">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Daily Planner</h1>
      <DailyPlannerView />
    </div>
  )
}
