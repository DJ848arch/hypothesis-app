import { useState, useEffect } from 'react'

interface Member {
  member_id: string
  name: string
  email: string
  role: string
  quizzes_taken?: number
  avg_score?: number | null
  pending_quizzes?: number
  pending_training?: number
}

interface AttackCatalogEntry {
  key: string
  name: string
  owasp: string
  difficulty: string
}

interface TeamDashboard {
  team_size: number
  members: Record<string, Member>
  total_quizzes_taken: number
  avg_team_score: number | null
  team_pass_rate: number | null
  training_scheduled: number
  manager_notifications: any[]
}

export default function ManagerConsole() {
  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null)
  const [catalog, setCatalog] = useState<AttackCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // New member form
  const [showAddMember, setShowAddMember] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('Security Analyst')
  const [addingMember, setAddingMember] = useState(false)

  // Quiz scheduling
  const [showScheduleQuiz, setShowScheduleQuiz] = useState(false)
  const [quizTitle, setQuizTitle] = useState('Security Knowledge Check')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [selectedAttacks, setSelectedAttacks] = useState<Set<string>>(new Set())
  const [scheduling, setScheduling] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/team/dashboard').then((r) => r.json()),
      fetch('/api/attack-catalog').then((r) => r.json()),
    ])
      .then(([dash, cat]) => {
        setDashboard(dash)
        setCatalog(Array.isArray(cat) ? cat : Object.values(cat))
      })
      .catch(() => setError('Failed to load team data'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAddMember() {
    if (!newName.trim() || !newEmail.trim()) return
    setAddingMember(true)
    try {
      await fetch('/api/team/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), role: newRole }),
      })
      const dash = await fetch('/api/team/dashboard').then((r) => r.json())
      setDashboard(dash)
      setNewName('')
      setNewEmail('')
      setShowAddMember(false)
    } finally {
      setAddingMember(false)
    }
  }

  async function handleScheduleQuiz() {
    if (selectedMembers.size === 0 || selectedAttacks.size === 0) return
    setScheduling(true)
    setScheduleSuccess('')
    try {
      const res = await fetch('/api/quiz/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_ids: Array.from(selectedMembers),
          attack_types: Array.from(selectedAttacks),
          title: quizTitle,
          scheduled_by: 'manager',
        }),
      })
      const data = await res.json()
      if (data.assignment_id) {
        setScheduleSuccess(
          `Quiz "${quizTitle}" sent to ${selectedMembers.size} member(s) with ${data.questions?.length ?? '?'} questions.`
        )
        setSelectedMembers(new Set())
        setSelectedAttacks(new Set())
        setShowScheduleQuiz(false)
        const dash = await fetch('/api/team/dashboard').then((r) => r.json())
        setDashboard(dash)
      }
    } finally {
      setScheduling(false)
    }
  }

  function toggleMember(id: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAttack(key: string) {
    setSelectedAttacks((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const difficultyColor: Record<string, string> = {
    BEGINNER: '#52c41a', INTERMEDIATE: '#ffc53d', ADVANCED: '#ff7a45', EXPERT: '#ff4d4f',
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center text-muted">
        Loading team data…
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="p-4 bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 rounded-xl text-[#ff4d4f]">{error}</div>
      </div>
    )
  }

  const members = Object.values(dashboard?.members ?? {})

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Manager Console</h1>
          <p className="text-muted text-sm mt-0.5">Schedule quizzes, track team performance, manage training</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddMember(true)}
            className="px-4 py-2 bg-surface2 border border-border rounded-lg text-sm hover:border-white/30 transition-colors"
          >
            + Add Member
          </button>
          <button
            onClick={() => setShowScheduleQuiz(true)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-colors bg-[#ffc53d] text-[#0d1117] hover:bg-[#ffa940]"
          >
            ⚡ Send Quiz
          </button>
        </div>
      </div>

      {/* Success banner */}
      {scheduleSuccess && (
        <div className="p-4 bg-[#52c41a]/10 border border-[#52c41a]/30 rounded-xl text-[#52c41a] text-sm">
          ✓ {scheduleSuccess}
        </div>
      )}

      {/* Manager notifications */}
      {(dashboard?.manager_notifications?.length ?? 0) > 0 && (
        <div className="bg-surface border border-[#ffc53d]/30 rounded-2xl p-5">
          <h3 className="font-bold text-sm text-[#ffc53d] mb-3">
            📬 {dashboard!.manager_notifications.length} New Notification(s)
          </h3>
          <div className="space-y-2">
            {dashboard!.manager_notifications.map((n: any) => (
              <div key={n.notification_id} className="text-sm p-3 bg-surface2 rounded-lg border border-border">
                <span className="font-semibold text-white">{n.member_name}</span>
                <span className="text-muted">
                  {' '}scored {n.score_pct}% — {n.wrong_count} wrong answer(s) →{' '}
                </span>
                <span className="text-[#ffc53d]">{n.training_items?.length} training item(s) scheduled</span>
                <span className="text-muted ml-2 text-xs">
                  {new Date(n.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Team Size', value: dashboard?.team_size ?? 0, color: '#58a6ff' },
          { label: 'Quizzes Taken', value: dashboard?.total_quizzes_taken ?? 0, color: '#36cfc9' },
          { label: 'Avg Score', value: dashboard?.avg_team_score != null ? `${dashboard.avg_team_score}%` : '—', color: '#ffc53d' },
          { label: 'Training Pending', value: dashboard?.training_scheduled ?? 0, color: '#ff7a45' },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-4 text-center" style={{ borderTopWidth: 3, borderTopColor: s.color }}>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Member table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-bold">Team Members</h3>
        </div>
        {members.length === 0 ? (
          <div className="p-10 text-center text-muted">
            No team members yet.{' '}
            <button onClick={() => setShowAddMember(true)} className="text-[#58a6ff] underline">Add one.</button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div key={m.member_id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-surface2 border border-border flex items-center justify-center text-sm font-black">
                  {m.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{m.name}</div>
                  <div className="text-xs text-muted truncate">{m.email} · {m.role}</div>
                </div>
                <div className="text-right text-xs text-muted space-y-0.5 shrink-0">
                  <div>
                    Avg:{' '}
                    <span className="text-white font-semibold">
                      {m.avg_score != null ? `${m.avg_score}%` : '—'}
                    </span>
                  </div>
                  <div>{m.quizzes_taken ?? 0} quiz(zes)</div>
                  {(m.pending_training ?? 0) > 0 && (
                    <div className="text-[#ffc53d]">{m.pending_training} training due</div>
                  )}
                  {(m.pending_quizzes ?? 0) > 0 && (
                    <div className="text-[#ff7a45]">{m.pending_quizzes} quiz pending</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Member modal ────────────────────────────────────── */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">Add Team Member</h3>
              <button onClick={() => setShowAddMember(false)} className="text-muted hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted block mb-1">Full Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm focus:outline-none focus:border-white/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Email</label>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jane@company.com"
                  type="email"
                  className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm focus:outline-none focus:border-white/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm focus:outline-none focus:border-white/40"
                >
                  {['Security Analyst', 'Senior Security Engineer', 'DevSecOps Engineer', 'Penetration Tester', 'Security Manager'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 py-2.5 border border-border rounded-lg text-sm hover:border-white/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={addingMember || !newName.trim() || !newEmail.trim()}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#58a6ff] text-[#0d1117] hover:bg-[#79c0ff] transition-colors disabled:opacity-50"
                >
                  {addingMember ? 'Adding…' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Quiz modal ─────────────────────────────────── */}
      {showScheduleQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-xl shadow-2xl my-4">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold">Schedule Quiz</h3>
                <p className="text-xs text-muted mt-0.5">AI will generate questions from the selected attack topics</p>
              </div>
              <button onClick={() => setShowScheduleQuiz(false)} className="text-muted hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-5">
              {/* Title */}
              <div>
                <label className="text-xs text-muted block mb-1">Quiz Title</label>
                <input
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm focus:outline-none focus:border-white/40"
                />
              </div>

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted">Select Team Members</label>
                  {members.length > 0 && (
                    <button
                      onClick={() =>
                        selectedMembers.size === members.length
                          ? setSelectedMembers(new Set())
                          : setSelectedMembers(new Set(members.map((m) => m.member_id)))
                      }
                      className="text-xs text-[#58a6ff]"
                    >
                      {selectedMembers.size === members.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>
                {members.length === 0 ? (
                  <p className="text-sm text-muted">No members — add some first.</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {members.map((m) => (
                      <label
                        key={m.member_id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(m.member_id)}
                          onChange={() => toggleMember(m.member_id)}
                          className="accent-[#ffc53d]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{m.name}</div>
                          <div className="text-xs text-muted">{m.role}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Attack topics */}
              <div>
                <label className="text-xs text-muted block mb-2">Attack Topics (pick 1–3)</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                  {catalog.map((a) => (
                    <label
                      key={a.key}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedAttacks.has(a.key)
                          ? 'border-[#ffc53d]/60 bg-[#ffc53d]/5'
                          : 'border-border hover:border-white/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAttacks.has(a.key)}
                        onChange={() => toggleAttack(a.key)}
                        className="accent-[#ffc53d] mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{a.name}</div>
                        <div
                          className="text-[10px] font-bold mt-0.5"
                          style={{ color: difficultyColor[a.difficulty] ?? '#8b949e' }}
                        >
                          {a.difficulty}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowScheduleQuiz(false)}
                  className="flex-1 py-2.5 border border-border rounded-lg text-sm hover:border-white/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleQuiz}
                  disabled={scheduling || selectedMembers.size === 0 || selectedAttacks.size === 0}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#ffc53d] text-[#0d1117] hover:bg-[#ffa940] transition-colors disabled:opacity-50"
                >
                  {scheduling
                    ? 'Scheduling…'
                    : `Send to ${selectedMembers.size} Member(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
