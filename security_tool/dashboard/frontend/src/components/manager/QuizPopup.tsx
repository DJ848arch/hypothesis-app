import { useState, useEffect } from 'react'

interface Question {
  id: number | string
  question: string
  options: Record<string, string>
  correct: string
  explanation: string
  attack_type?: string
}

interface Assignment {
  assignment_id: string
  title: string
  questions: Question[]
  attack_types: string[]
}

interface Props {
  memberId: string
  onComplete: () => void
}

type Phase = 'quiz' | 'results'

interface WrongItem {
  question: Question
  chosen: string
}

export default function QuizPopup({ memberId, onComplete }: Props) {
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [chosen, setChosen] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('quiz')
  const [result, setResult] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/quiz/pending/${memberId}`)
      .then((r) => r.json())
      .then((quizzes: Assignment[]) => {
        if (quizzes.length > 0) setAssignment(quizzes[0])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [memberId])

  if (loading || !assignment) return null

  const questions = assignment.questions
  const q = questions[current]
  const qid = String(q.id ?? q)
  const totalQ = questions.length
  const isLast = current === totalQ - 1
  const progress = Math.round(((current + 1) / totalQ) * 100)

  function handleSelect(letter: string) {
    if (chosen) return
    setChosen(letter)
    setAnswers((prev) => ({ ...prev, [qid]: letter }))
  }

  function handleNext() {
    setChosen(null)
    if (isLast) {
      handleSubmit({ ...answers, [qid]: chosen! })
    } else {
      setCurrent((c) => c + 1)
    }
  }

  async function handleSubmit(finalAnswers: Record<string, string>) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignment!.assignment_id,
          member_id: memberId,
          answers: finalAnswers,
        }),
      })
      const data = await res.json()
      setResult(data)
      setPhase('results')
    } finally {
      setSubmitting(false)
    }
  }

  const optionColors: Record<string, string> = {
    correct: 'border-[#52c41a] bg-[#52c41a]/10 text-[#52c41a]',
    wrong: 'border-[#ff4d4f] bg-[#ff4d4f]/10 text-[#ff4d4f]',
    neutral: 'border-border hover:border-white/40 text-white cursor-pointer',
    disabled: 'border-border text-muted opacity-50',
  }

  function optionClass(letter: string): string {
    if (!chosen) return optionColors.neutral
    if (letter === q.correct) return optionColors.correct
    if (letter === chosen && chosen !== q.correct) return optionColors.wrong
    return optionColors.disabled
  }

  // ── Results phase ──────────────────────────────────────────────
  if (phase === 'results' && result) {
    const passed = result.passed
    const wrongItems: WrongItem[] = (result.wrong_questions ?? []).map((wq: any) => ({
      question: wq,
      chosen: wq.chosen,
    }))

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl">
          <div className="p-6 border-b border-border text-center">
            <div className="text-5xl mb-3">{passed ? '🏆' : '📚'}</div>
            <h2 className="text-2xl font-black" style={{ color: passed ? '#52c41a' : '#ffc53d' }}>
              {passed ? 'Quiz Passed!' : 'Quiz Complete'}
            </h2>
            <p className="text-muted text-sm mt-1">{assignment.title}</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Score */}
            <div className="flex items-center justify-between p-4 bg-surface2 rounded-xl border border-border">
              <div>
                <div className="text-3xl font-black" style={{ color: passed ? '#52c41a' : '#ffc53d' }}>
                  {result.score_pct}%
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {result.correct}/{result.total} correct · {passed ? 'PASSED' : 'NEEDS REVIEW'}
                </div>
              </div>
              <div className="w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#21262d" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={passed ? '#52c41a' : '#ffc53d'}
                    strokeWidth="3"
                    strokeDasharray={`${result.score_pct} ${100 - result.score_pct}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Wrong answers + training notice */}
            {wrongItems.length > 0 && (
              <div className="p-4 bg-[#ffc53d]/5 border border-[#ffc53d]/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-[#ffc53d] font-semibold text-sm">
                  <span>📅</span>
                  <span>Training auto-scheduled for {wrongItems.length} topic(s)</span>
                </div>
                {(result.training_scheduled ?? []).map((t: any) => (
                  <div key={t.training_id} className="text-xs text-muted pl-4 border-l-2 border-[#ffc53d]/40">
                    <span className="text-white font-medium">{t.topic}</span>
                    {' · '}scheduled for{' '}
                    {new Date(t.scheduled_for).toLocaleDateString()}
                    {t.ai_plan && <span className="ml-1 text-[#52c41a]">· AI plan generated ✓</span>}
                  </div>
                ))}
                <p className="text-xs text-muted">
                  Your manager has been notified. Check your training schedule for details.
                </p>
              </div>
            )}

            {passed && wrongItems.length === 0 && (
              <div className="p-4 bg-[#52c41a]/5 border border-[#52c41a]/30 rounded-xl text-sm text-[#52c41a]">
                Perfect score! No training required. Great work.
              </div>
            )}

            <button
              onClick={onComplete}
              className="w-full py-3 rounded-xl font-bold text-sm transition-colors"
              style={{ background: passed ? '#52c41a' : '#ffc53d', color: '#0d1117' }}
            >
              {passed ? 'Close' : 'Got it — I\'ll complete my training'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz phase ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-black text-lg">{assignment.title}</h2>
              <p className="text-xs text-muted">
                Question {current + 1} of {totalQ}
                {assignment.attack_types?.length > 0 && (
                  <> · Topics: {assignment.attack_types.join(', ')}</>
                )}
              </p>
            </div>
            <div className="text-xs text-muted bg-surface2 border border-border rounded-lg px-3 py-1.5">
              Required — complete to continue
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: '#ffc53d' }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="p-6 space-y-4">
          <p className="font-semibold leading-snug">{q.question}</p>

          <div className="space-y-2">
            {Object.entries(q.options).map(([letter, text]) => (
              <button
                key={letter}
                onClick={() => handleSelect(letter)}
                disabled={!!chosen}
                className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all text-sm ${optionClass(letter)}`}
              >
                <span className="font-black shrink-0 w-5">{letter}.</span>
                <span>{text}</span>
                {chosen && letter === q.correct && (
                  <span className="ml-auto shrink-0 text-[#52c41a]">✓</span>
                )}
                {chosen && letter === chosen && chosen !== q.correct && (
                  <span className="ml-auto shrink-0 text-[#ff4d4f]">✗</span>
                )}
              </button>
            ))}
          </div>

          {/* Explanation shown after answering */}
          {chosen && q.explanation && (
            <div className="p-4 bg-surface2 border border-border rounded-xl text-sm text-muted leading-relaxed">
              <span className="text-white font-semibold">Explanation: </span>
              {q.explanation}
            </div>
          )}

          {/* Next / Submit */}
          {chosen && (
            <button
              onClick={handleNext}
              disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-sm bg-[#ffc53d] text-[#0d1117] hover:bg-[#ffa940] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : isLast ? 'Submit Quiz' : 'Next Question →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
