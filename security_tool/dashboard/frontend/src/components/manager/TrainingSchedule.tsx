import { useState, useEffect } from 'react'

interface TrainingItem {
  training_id: string
  member_id: string
  member_name: string
  topic: string
  reason: string
  wrong_questions: string[]
  scheduled_for: string
  status: 'scheduled' | 'completed'
  ai_plan: AIPlan | null
  created_at: string
}

interface AIPlan {
  objectives?: string[]
  modules?: { title: string; duration_mins: number; content_summary: string; exercises: string }[]
  key_concepts?: string[]
  practical_lab?: string
  assessment?: { question: string; answer?: string }[]
}

export default function TrainingSchedule() {
  const [items, setItems] = useState<TrainingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('scheduled')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/training')
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setError('Failed to load training schedule'))
      .finally(() => setLoading(false))
  }, [])

  async function markComplete(id: string) {
    setCompleting(id)
    try {
      await fetch(`/api/training/${id}/complete`, { method: 'PATCH' })
      setItems((prev) =>
        prev.map((t) => (t.training_id === id ? { ...t, status: 'completed' } : t))
      )
    } finally {
      setCompleting(null)
    }
  }

  const filtered = items.filter((t) => filter === 'all' || t.status === filter)

  const scheduledCount = items.filter((t) => t.status === 'scheduled').length
  const completedCount = items.filter((t) => t.status === 'completed').length

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center text-muted">Loading training schedule…</div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Training Schedule</h1>
          <p className="text-muted text-sm mt-0.5">AI-generated training plans for wrong quiz answers</p>
        </div>
        <div className="text-right text-sm text-muted">
          <div><span className="text-[#ffc53d] font-bold">{scheduledCount}</span> pending</div>
          <div><span className="text-[#52c41a] font-bold">{completedCount}</span> completed</div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 rounded-xl text-[#ff4d4f] text-sm">{error}</div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-surface2 border border-border rounded-xl w-fit">
        {(['scheduled', 'completed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f ? 'bg-surface text-white border border-border' : 'text-muted hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-muted">
          <div className="text-4xl mb-3">📚</div>
          <div>
            {filter === 'scheduled' ? 'No pending training — team is up to date!' : `No ${filter} training items.`}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.training_id}
              className="bg-surface border border-border rounded-2xl overflow-hidden"
              style={t.status === 'completed' ? { opacity: 0.7 } : undefined}
            >
              {/* Header row */}
              <div className="flex items-start gap-4 p-5">
                {/* Status dot */}
                <div className="mt-0.5 shrink-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: t.status === 'completed' ? '#52c41a' : '#ffc53d',
                      boxShadow: t.status === 'scheduled' ? '0 0 6px #ffc53d' : 'none',
                    }}
                  />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{t.topic}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: t.status === 'completed' ? '#52c41a20' : '#ffc53d20',
                        color: t.status === 'completed' ? '#52c41a' : '#ffc53d',
                      }}
                    >
                      {t.status}
                    </span>
                    {t.ai_plan && (
                      <span className="text-xs text-[#36cfc9] px-2 py-0.5 bg-[#36cfc9]/10 rounded-full">
                        AI plan ready
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted mt-0.5">
                    <span className="text-white">{t.member_name}</span>
                    {' · '}
                    {t.reason}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    Scheduled for {new Date(t.scheduled_for).toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                    {' · '}created {new Date(t.created_at).toLocaleDateString()}
                  </div>

                  {/* Wrong questions preview */}
                  {t.wrong_questions?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.wrong_questions.slice(0, 2).map((q, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-muted bg-surface2 border border-border px-2 py-0.5 rounded truncate max-w-xs"
                          title={q}
                        >
                          {q.length > 60 ? q.slice(0, 60) + '…' : q}
                        </span>
                      ))}
                      {t.wrong_questions.length > 2 && (
                        <span className="text-[10px] text-muted">+{t.wrong_questions.length - 2} more</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {t.ai_plan && (
                    <button
                      onClick={() => setExpanded(expanded === t.training_id ? null : t.training_id)}
                      className="text-xs px-3 py-1.5 border border-border rounded-lg hover:border-white/30 transition-colors"
                    >
                      {expanded === t.training_id ? 'Hide Plan' : 'View Plan'}
                    </button>
                  )}
                  {t.status === 'scheduled' && (
                    <button
                      onClick={() => markComplete(t.training_id)}
                      disabled={completing === t.training_id}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-[#52c41a]/20 text-[#52c41a] border border-[#52c41a]/30 hover:bg-[#52c41a]/30 transition-colors disabled:opacity-50"
                    >
                      {completing === t.training_id ? '…' : '✓ Complete'}
                    </button>
                  )}
                </div>
              </div>

              {/* AI Plan panel */}
              {expanded === t.training_id && t.ai_plan && (
                <div className="border-t border-border p-5 space-y-5 bg-surface2/40">
                  <h4 className="font-bold text-sm text-[#36cfc9]">AI-Generated Training Plan</h4>

                  {/* Objectives */}
                  {t.ai_plan.objectives?.length > 0 && (
                    <div>
                      <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Learning Objectives</div>
                      <ul className="space-y-1.5">
                        {t.ai_plan.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-[#36cfc9] shrink-0 mt-0.5">→</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Modules */}
                  {t.ai_plan.modules?.length > 0 && (
                    <div>
                      <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Modules</div>
                      <div className="space-y-3">
                        {t.ai_plan.modules.map((mod, i) => (
                          <div key={i} className="p-3 bg-surface border border-border rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm">{mod.title}</span>
                              <span className="text-xs text-muted">{mod.duration_mins} min</span>
                            </div>
                            <p className="text-xs text-muted leading-relaxed">{mod.content_summary}</p>
                            {mod.exercises && (
                              <div className="mt-2 text-xs">
                                <span className="text-[#ffc53d]">Exercise: </span>
                                <span className="text-muted">{mod.exercises}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key concepts */}
                  {t.ai_plan.key_concepts?.length > 0 && (
                    <div>
                      <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Key Concepts</div>
                      <div className="flex flex-wrap gap-2">
                        {t.ai_plan.key_concepts.map((c, i) => (
                          <span key={i} className="text-xs bg-surface border border-border px-2.5 py-1 rounded-full">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Practical lab */}
                  {t.ai_plan.practical_lab && (
                    <div>
                      <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Practical Lab</div>
                      <p className="text-sm leading-relaxed p-3 bg-surface border border-border rounded-xl">{t.ai_plan.practical_lab}</p>
                    </div>
                  )}

                  {/* Assessment */}
                  {t.ai_plan.assessment?.length > 0 && (
                    <div>
                      <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Follow-up Assessment</div>
                      <div className="space-y-2">
                        {t.ai_plan.assessment.map((q, i) => (
                          <div key={i} className="p-3 bg-surface border border-border rounded-xl">
                            <p className="text-sm font-medium">Q{i + 1}: {q.question}</p>
                            {q.answer && <p className="text-xs text-muted mt-1">A: {q.answer}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
