import { useState } from 'react'

interface QuizQuestion {
  id: number
  question: string
  options: Record<string, string>
  correct: string
  explanation: string
}

interface Simulation {
  simulation_id: string
  attack_name: string
  owasp_category: string
  cwe: string
  mitre_technique: string
  difficulty: string
  cvss_estimate: number
  narrative: string
  target?: { file: string; line?: number; description: string }
  kill_chain?: Array<{ phase: string; action: string; detail: string; mitre_technique: string }>
  proof_of_concept?: { disclaimer: string; payload: string; request_example: string; expected_result: string }
  impact_assessment?: { confidentiality: string; integrity: string; availability: string; business_impact: string }
  detection?: { log_indicators: string[]; siem_query: string; anomaly_patterns: string[] }
  defense?: { immediate: string[]; code_fix: string; architectural: string[]; defense_in_depth: string[] }
  training_assessment?: { learning_objectives: string[]; questions: QuizQuestion[]; further_reading: string[] }
  real_world_parallels?: Array<{ incident: string; year: number; impact: string; attack_similarity: string; lesson: string }>
}

interface FeedbackForm {
  realism: number
  clarity: number
  accuracy: number
  comment: string
}

const DIFF_COLORS: Record<string, string> = {
  BEGINNER: '#52c41a', INTERMEDIATE: '#ffc53d', ADVANCED: '#ff7a45', EXPERT: '#ff4d4f',
}

const IMPACT_COLORS: Record<string, string> = {
  CRITICAL: '#ff4d4f', HIGH: '#ff7a45', MEDIUM: '#ffc53d', LOW: '#40a9ff', NONE: '#8b949e',
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={`text-xl transition-colors ${star <= value ? 'text-[#ffc53d]' : 'text-border hover:text-[#ffc53d]/50'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

function KillChainView({ steps }: { steps: Simulation['kill_chain'] }) {
  if (!steps?.length) return null
  const phaseColors: Record<string, string> = {
    Reconnaissance: '#36cfc9', Weaponization: '#ffc53d', Delivery: '#ff7a45',
    Exploitation: '#ff4d4f', Installation: '#b37feb', C2: '#f759ab', Impact: '#ff4d4f',
  }
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff4d4f] to-[#ff7a45] text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: phaseColors[step.phase] ?? '#8b949e' }}>
                {step.phase}
              </span>
              {step.mitre_technique && (
                <span className="text-xs bg-surface2 border border-border px-2 py-0.5 rounded text-muted">{step.mitre_technique}</span>
              )}
            </div>
            <div className="font-semibold text-sm mb-1">{step.action}</div>
            {step.detail && <div className="text-xs text-muted">{step.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

function QuizPanel({ questions, simulationId, attackType, onScoreSubmit }: {
  questions: QuizQuestion[]
  simulationId: string
  attackType: string
  onScoreSubmit: (correct: number, total: number) => void
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const score = submitted ? questions.filter(q => answers[q.id] === q.correct).length : null

  const submit = async () => {
    setSubmitted(true)
    const correct = questions.filter(q => answers[q.id] === q.correct).length
    onScoreSubmit(correct, questions.length)
    try {
      await fetch(`/api/quiz-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulation_id: simulationId, attack_type: attackType, correct, total: questions.length, answers }),
      })
    } catch { /* non-critical */ }
  }

  const passed = score !== null && score / questions.length >= 0.7

  return (
    <div className="space-y-4">
      {submitted && (
        <div className={`p-4 rounded-xl border font-bold text-center ${passed ? 'bg-[#52c41a]/10 border-[#52c41a]/30 text-[#52c41a]' : 'bg-[#ff4d4f]/10 border-[#ff4d4f]/30 text-[#ff4d4f]'}`}>
          {passed ? '✅' : '❌'} Score: {score}/{questions.length} ({Math.round(score! / questions.length * 100)}%)
          {!passed && ' — Review the material and try again.'}
        </div>
      )}

      {questions.map((q) => {
        const selected = answers[q.id]
        return (
          <div key={q.id} className="bg-surface2 rounded-xl p-4 border border-border">
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Question {q.id}</div>
            <div className="font-semibold mb-3">{q.question}</div>
            <div className="space-y-2 mb-3">
              {Object.entries(q.options).map(([letter, text]) => {
                let cls = 'border-border bg-surface text-[#c9d1d9]'
                if (submitted) {
                  if (letter === q.correct) cls = 'border-[#52c41a]/50 bg-[#52c41a]/10 text-[#7ee787]'
                  else if (letter === selected) cls = 'border-[#ff4d4f]/50 bg-[#ff4d4f]/10 text-[#ff4d4f]'
                } else if (letter === selected) {
                  cls = 'border-white/30 bg-white/5 text-white'
                }
                return (
                  <button
                    key={letter}
                    onClick={() => !submitted && setAnswers(a => ({ ...a, [q.id]: letter }))}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${cls}`}
                  >
                    <strong>{letter}.</strong> {text}
                  </button>
                )
              })}
            </div>
            {submitted && (
              <div className="text-xs text-muted bg-bg p-3 rounded-lg border border-border">
                <span className="font-bold text-white">Explanation: </span>{q.explanation}
              </div>
            )}
          </div>
        )
      })}

      {!submitted && (
        <button
          onClick={submit}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full py-3 bg-gradient-to-r from-[#1f6feb] to-[#388bfd] text-white font-bold rounded-xl disabled:opacity-40 transition-opacity"
        >
          Submit Answers ({Object.keys(answers).length}/{questions.length} answered)
        </button>
      )}
    </div>
  )
}

function FeedbackPanel({ simulationId, attackType }: { simulationId: string; attackType: string }) {
  const [form, setForm] = useState<FeedbackForm>({ realism: 0, clarity: 0, accuracy: 0, comment: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!form.realism || !form.clarity || !form.accuracy) return
    setLoading(true)
    try {
      await fetch('/api/simulation-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulation_id: simulationId, attack_type: attackType, ...form }),
      })
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-4 bg-[#52c41a]/10 border border-[#52c41a]/30 rounded-xl text-[#52c41a] text-sm font-semibold text-center">
        ✅ Thank you — your feedback improves future simulations.
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <h4 className="font-bold text-sm">Rate this simulation</h4>
      <p className="text-xs text-muted">Your ratings directly improve future simulations — the AI learns from this feedback.</p>
      <div className="grid grid-cols-3 gap-4">
        <StarRating label="Realism" value={form.realism} onChange={(v) => setForm(f => ({ ...f, realism: v }))} />
        <StarRating label="Clarity" value={form.clarity} onChange={(v) => setForm(f => ({ ...f, clarity: v }))} />
        <StarRating label="Accuracy" value={form.accuracy} onChange={(v) => setForm(f => ({ ...f, accuracy: v }))} />
      </div>
      <div>
        <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Comments (optional)</div>
        <textarea
          value={form.comment}
          onChange={(e) => setForm(f => ({ ...f, comment: e.target.value }))}
          placeholder="What could be better? Was the PoC realistic? Was the explanation clear?"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted resize-none h-20 focus:outline-none focus:border-white/30"
        />
      </div>
      <button
        onClick={submit}
        disabled={loading || !form.realism || !form.clarity || !form.accuracy}
        className="px-5 py-2 bg-surface2 border border-border hover:border-white/30 text-sm font-bold rounded-lg disabled:opacity-40 transition-colors"
      >
        {loading ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </div>
  )
}

interface Props {
  simulation: Simulation
  onClose: () => void
}

export default function SimulationView({ simulation: sim, onClose }: Props) {
  const [activeSection, setActiveSection] = useState('narrative')
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number } | null>(null)

  const diffColor = DIFF_COLORS[sim.difficulty] ?? '#888'
  const poc = sim.proof_of_concept
  const assessment = sim.training_assessment
  const questions = assessment?.questions ?? []

  const sections = [
    { id: 'narrative', label: '📖 Attack Story' },
    { id: 'killchain', label: '⚔ Kill Chain' },
    { id: 'poc', label: '🔬 Proof of Concept' },
    { id: 'detection', label: '🔍 Detection' },
    { id: 'defense', label: '🛡 Defense' },
    { id: 'quiz', label: `📝 Quiz (${questions.length}Q)` },
    { id: 'feedback', label: '⭐ Rate' },
  ]

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto bg-[#161b22] border border-border rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-[#21262d] to-[#161b22]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Attack Simulation</span>
                <span className="text-xs px-2 py-0.5 rounded-full border font-bold" style={{ color: diffColor, borderColor: `${diffColor}40` }}>
                  {sim.difficulty}
                </span>
              </div>
              <h2 className="text-2xl font-black mb-2">{sim.attack_name}</h2>
              <div className="flex flex-wrap gap-2">
                {[sim.owasp_category, sim.cwe, sim.mitre_technique].filter(Boolean).map((tag) => (
                  <span key={tag} className="text-xs bg-surface2 border border-border px-2 py-0.5 rounded text-muted">{tag}</span>
                ))}
                <span className="text-xs bg-surface2 border border-border px-2 py-0.5 rounded text-[#ff7a45]">
                  CVSS {sim.cvss_estimate}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-muted hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
          </div>

          {/* Target */}
          {sim.target && (
            <div className="mt-4 p-3 bg-bg rounded-lg border border-border text-sm">
              <span className="text-muted">Target: </span>
              <code className="text-[#79c0ff]">{sim.target.file}{sim.target.line ? `:${sim.target.line}` : ''}</code>
              {sim.target.description && <span className="text-muted ml-2">— {sim.target.description}</span>}
            </div>
          )}

          {/* Impact strip */}
          {sim.impact_assessment && (
            <div className="flex gap-3 mt-3">
              {(['confidentiality', 'integrity', 'availability'] as const).map((axis) => {
                const val = sim.impact_assessment![axis]
                return (
                  <div key={axis} className="flex-1 text-center p-2 bg-surface2 rounded-lg border border-border">
                    <div className="text-xs text-muted capitalize">{axis}</div>
                    <div className="font-bold text-sm" style={{ color: IMPACT_COLORS[val] ?? '#888' }}>{val}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Section tabs */}
        <div className="flex overflow-x-auto border-b border-border">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeSection === s.id ? 'border-white text-white' : 'border-transparent text-muted hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="p-6">
          {activeSection === 'narrative' && (
            <div>
              {assessment?.learning_objectives && (
                <div className="mb-4 p-4 bg-surface2 rounded-xl border border-border">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Learning Objectives</div>
                  <ul className="space-y-1">
                    {assessment.learning_objectives.map((o, i) => (
                      <li key={i} className="text-sm text-[#c9d1d9] flex gap-2"><span className="text-[#52c41a]">✓</span>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-sm text-[#c9d1d9] leading-relaxed whitespace-pre-wrap bg-surface2 border-l-4 border-[#ff4d4f] p-5 rounded-r-xl">
                {sim.narrative}
              </div>
              {sim.real_world_parallels && sim.real_world_parallels.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider">Real-World Parallels</div>
                  {sim.real_world_parallels.map((rw, i) => (
                    <div key={i} className="p-4 bg-surface2 border border-border rounded-xl text-sm">
                      <div className="font-bold text-[#ffc53d] mb-1">{rw.incident} ({rw.year})</div>
                      <div><span className="text-muted">Similarity: </span>{rw.attack_similarity}</div>
                      <div><span className="text-muted">Impact: </span>{rw.impact}</div>
                      <div><span className="text-muted">Lesson: </span><span className="text-[#7ee787]">{rw.lesson}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'killchain' && <KillChainView steps={sim.kill_chain} />}

          {activeSection === 'poc' && poc && (
            <div className="space-y-4">
              <div className="p-3 bg-[#ffc53d]/10 border border-[#ffc53d]/30 rounded-xl text-[#ffc53d] text-sm font-semibold">
                ⚠ {poc.disclaimer}
              </div>
              <div>
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Payload</div>
                <pre className="bg-bg border border-border rounded-lg p-4 font-mono text-sm text-[#79c0ff] overflow-x-auto whitespace-pre-wrap">{poc.payload}</pre>
              </div>
              {poc.request_example && (
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Example Request</div>
                  <pre className="bg-bg border border-border rounded-lg p-4 font-mono text-xs text-[#c9d1d9] overflow-x-auto whitespace-pre-wrap">{poc.request_example}</pre>
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Expected Result</div>
                <div className="text-sm text-[#ff7a45] italic">{poc.expected_result}</div>
              </div>
            </div>
          )}

          {activeSection === 'detection' && sim.detection && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Log Indicators</div>
                <ul className="space-y-1">
                  {sim.detection.log_indicators.map((l, i) => <li key={i} className="text-sm text-[#c9d1d9] flex gap-2"><span className="text-[#36cfc9]">▸</span>{l}</li>)}
                </ul>
                <div className="text-xs font-bold text-muted uppercase tracking-wider mt-4 mb-2">Anomaly Patterns</div>
                <ul className="space-y-1">
                  {sim.detection.anomaly_patterns.map((a, i) => <li key={i} className="text-sm text-[#c9d1d9] flex gap-2"><span className="text-[#ffc53d]">⚠</span>{a}</li>)}
                </ul>
              </div>
              {sim.detection.siem_query && (
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">SIEM Query</div>
                  <pre className="bg-bg border border-border rounded-lg p-3 font-mono text-xs text-[#36cfc9] overflow-x-auto whitespace-pre-wrap">{sim.detection.siem_query}</pre>
                </div>
              )}
            </div>
          )}

          {activeSection === 'defense' && sim.defense && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Immediate Mitigations</div>
                  <ul className="space-y-1">{sim.defense.immediate.map((d, i) => <li key={i} className="text-sm text-[#c9d1d9] flex gap-2"><span className="text-[#52c41a]">✓</span>{d}</li>)}</ul>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Architectural Improvements</div>
                  <ul className="space-y-1">{sim.defense.architectural.map((d, i) => <li key={i} className="text-sm text-[#c9d1d9] flex gap-2"><span className="text-[#40a9ff]">→</span>{d}</li>)}</ul>
                </div>
              </div>
              {sim.defense.code_fix && (
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Code Fix</div>
                  <div className="text-sm text-[#7ee787] bg-[#7ee787]/10 border border-[#7ee787]/20 rounded-lg p-4">{sim.defense.code_fix}</div>
                </div>
              )}
              {sim.defense.defense_in_depth?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Defense in Depth</div>
                  <ul className="space-y-1">{sim.defense.defense_in_depth.map((d, i) => <li key={i} className="text-sm text-[#c9d1d9] flex gap-2"><span className="text-[#b37feb]">⬡</span>{d}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {activeSection === 'quiz' && (
            <div>
              {quizScore && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-bold text-center ${quizScore.correct / quizScore.total >= 0.7 ? 'bg-[#52c41a]/10 text-[#52c41a]' : 'bg-[#ff4d4f]/10 text-[#ff4d4f]'}`}>
                  Last score: {quizScore.correct}/{quizScore.total}
                </div>
              )}
              {questions.length > 0
                ? <QuizPanel questions={questions} simulationId={sim.simulation_id} attackType={sim.attack_name} onScoreSubmit={(c, t) => setQuizScore({ correct: c, total: t })} />
                : <div className="text-center py-10 text-muted">No quiz questions generated for this simulation.</div>
              }
              {assessment?.further_reading?.length && (
                <div className="mt-6">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Further Reading</div>
                  <ul className="space-y-1">{assessment.further_reading.map((r, i) => <li key={i} className="text-sm text-[#58a6ff]">{r}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {activeSection === 'feedback' && (
            <FeedbackPanel simulationId={sim.simulation_id} attackType={sim.attack_name} />
          )}
        </div>
      </div>
    </div>
  )
}
