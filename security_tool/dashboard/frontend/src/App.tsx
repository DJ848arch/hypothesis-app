import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { type ScanResults, type ScanSummary } from './types'
import ScanForm from './components/ScanForm'
import ScanProgress from './components/ScanProgress'
import FindingsTable from './components/FindingsTable'
import SeverityChart from './components/SeverityChart'
import SeverityBadge from './components/SeverityBadge'
import RemediationPanel from './components/RemediationPanel'
import QuizPopup from './components/manager/QuizPopup'
import ManagerConsole from './components/manager/ManagerConsole'
import TrainingSchedule from './components/manager/TrainingSchedule'

// ──────────────────────────────────────────────────────────────
// Layout
// ──────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-black bg-gradient-to-r from-[#ff4d4f] to-[#ffc53d] bg-clip-text text-transparent">
            ⚔ BASS
          </span>
          <span className="text-muted text-xs hidden sm:block">Base Alert Security System</span>
        </Link>
        <div className="flex-1" />
        <Link to="/" className="text-sm text-muted hover:text-white transition-colors">New Scan</Link>
        <Link to="/history" className="text-sm text-muted hover:text-white transition-colors">History</Link>
        <Link to="/manager" className="text-sm text-muted hover:text-white transition-colors">Manager</Link>
        <Link to="/training" className="text-sm text-muted hover:text-white transition-colors">Training</Link>
      </div>
    </nav>
  )
}

// ──────────────────────────────────────────────────────────────
// Home — new scan form
// ──────────────────────────────────────────────────────────────

function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-[#ff4d4f] via-[#ff7a45] to-[#ffc53d] bg-clip-text text-transparent">
          BASS Security Scanner
        </h1>
        <p className="text-muted">
          AI-powered vulnerability detection — Sentinel guards your checkpoints, Patrol sweeps every file.
        </p>
      </div>
      <div className="bg-surface border border-border rounded-2xl p-6">
        <ScanForm onScanStarted={(id) => navigate(`/scan/${id}`)} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Scan page — progress then results
// ──────────────────────────────────────────────────────────────

function ScanPage() {
  const { scanId } = useParams<{ scanId: string }>()
  const [results, setResults] = useState<ScanResults | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'findings' | 'remediations' | 'integrations' | 'compliance' | 'threat'>('findings')
  const [remediations, setRemediations] = useState<any[]>([])
  const [complianceData, setComplianceData] = useState<any>(null)
  const [loadingCompliance, setLoadingCompliance] = useState(false)
  const [threatIntel, setThreatIntel] = useState<any>(null)
  const [loadingThreat, setLoadingThreat] = useState(false)

  const fetchRemediations = useCallback(async () => {
    if (!scanId) return
    const res = await fetch(`/api/scan/${scanId}/remediations`)
    if (res.ok) setRemediations(await res.json())
  }, [scanId])

  const fetchResults = useCallback(async () => {
    if (!scanId) return
    const res = await fetch(`/api/scan/${scanId}/results`)
    if (res.ok) {
      const data = await res.json()
      setResults(data)
      if (data.remediations?.length) setRemediations(data.remediations)
    }
  }, [scanId])

  const highest = results?.highest_severity ?? 'CLEAR'
  const statusColor: Record<string, string> = {
    CRITICAL: '#ff4d4f', HIGH: '#ff7a45', MEDIUM: '#ffc53d', LOW: '#40a9ff', INFO: '#36cfc9', CLEAR: '#52c41a',
  }

  if (!scanId) return null

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {!results ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-lg">Scan in progress…</h2>
            <ScanProgress
              scanId={scanId}
              onComplete={fetchResults}
              onError={setError}
            />
            {error && (
              <div className="p-3 bg-critical/10 border border-critical/30 rounded-lg text-sm text-[#ff4d4f]">
                {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Status bar */}
          <div
            className="flex items-center gap-4 p-5 rounded-2xl border"
            style={{
              background: `${statusColor[highest]}18`,
              borderColor: `${statusColor[highest]}40`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: statusColor[highest], boxShadow: `0 0 8px ${statusColor[highest]}` }}
            />
            <div>
              <span className="font-black text-xl" style={{ color: statusColor[highest] }}>{highest}</span>
              <span className="text-muted text-sm ml-3">{results.total_findings} finding(s) in {results.duration_seconds}s</span>
            </div>
            <div className="ml-auto flex gap-3">
              <a
                href={`/api/scan/${scanId}/report`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-surface2 border border-border rounded-lg text-sm hover:border-white/30 transition-colors"
              >
                📄 Full Report
              </a>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map((sev) => (
              <div
                key={sev}
                className="bg-surface border border-border rounded-xl p-4 text-center"
                style={{ borderTopWidth: 3, borderTopColor: statusColor[sev] }}
              >
                <div className="text-3xl font-black" style={{ color: statusColor[sev] }}>
                  {results.severity_counts[sev] ?? 0}
                </div>
                <div className="text-xs font-bold text-muted mt-1 tracking-wide">{sev}</div>
              </div>
            ))}
          </div>

          {/* Chart + Sentinel coverage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="font-bold mb-4">Severity Distribution</h3>
              <SeverityChart counts={results.severity_counts} />
            </div>
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="font-bold mb-4">Sentinel Checkpoints</h3>
              <div className="space-y-2">
                {Object.entries(results.sentinel.checkpoints).map(([cp, data]) => (
                  <div key={cp} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                    <span className="text-muted capitalize">{cp.replace('_', ' ')}</span>
                    {data.findings.length > 0 ? (
                      <span className="text-[#ff4d4f] font-semibold">✖ {data.findings.length} finding(s)</span>
                    ) : (
                      <span className="text-[#52c41a] font-semibold">✔ Clean</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="flex border-b border-border overflow-x-auto">
              {[
                { id: 'findings', label: `Findings (${results.total_findings})` },
                { id: 'remediations', label: `AI Fix Proposals (${remediations.length})` },
                { id: 'integrations', label: `Integrations (${results.integrations?.total ?? 0})` },
                { id: 'compliance', label: '📋 Compliance' },
                { id: 'threat', label: '🌐 Threat Intel' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as typeof activeTab)
                    if (tab.id === 'compliance' && !complianceData && !loadingCompliance) {
                      setLoadingCompliance(true)
                      fetch(`/api/scan/${scanId}/compliance`)
                        .then((r) => r.json())
                        .then((d) => setComplianceData(d))
                        .finally(() => setLoadingCompliance(false))
                    }
                  }}
                  className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-white text-white'
                      : 'border-transparent text-muted hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-5">
              {activeTab === 'findings' && <FindingsTable findings={results.all_findings} />}
              {activeTab === 'remediations' && (
                <RemediationPanel
                  scanId={scanId!}
                  remediations={remediations}
                  onUpdate={fetchRemediations}
                />
              )}
              {activeTab === 'integrations' && (
                <div className="space-y-3">
                  <div className="text-sm text-muted mb-3">
                    Tools run: {results.integrations?.tools_run?.join(', ') || 'none detected'}
                  </div>
                  <FindingsTable findings={results.integrations?.findings ?? []} />
                </div>
              )}
              {activeTab === 'compliance' && (
                <CompliancePanel
                  data={complianceData}
                  loading={loadingCompliance}
                  scanId={scanId!}
                />
              )}
              {activeTab === 'threat' && (
                <ThreatIntelPanel
                  scanId={scanId!}
                  findings={results.all_findings}
                  data={threatIntel}
                  loading={loadingThreat}
                  onEnrich={() => {
                    setLoadingThreat(true)
                    fetch(`/api/scan/${scanId}/threat-intel`, { method: 'POST' })
                      .then((r) => r.json())
                      .then((d) => setThreatIntel(d))
                      .finally(() => setLoadingThreat(false))
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Compliance panel
// ──────────────────────────────────────────────────────────────

const FRAMEWORK_NAMES: Record<string, string> = {
  soc2: 'SOC 2',
  pci_dss: 'PCI DSS 4.0',
  nist_800_53: 'NIST 800-53',
  owasp_asvs: 'OWASP ASVS',
}

function CompliancePanel({ data, loading, scanId }: { data: any; loading: boolean; scanId: string }) {
  const [activeFramework, setActiveFramework] = useState<string>('')

  useEffect(() => {
    if (data && !activeFramework) {
      setActiveFramework(Object.keys(data)[0] ?? '')
    }
  }, [data])

  if (loading) return <div className="text-center py-12 text-muted">Loading compliance data…</div>

  if (!data) return (
    <div className="text-center py-12 text-muted">
      <div className="text-3xl mb-3">📋</div>
      <p>Compliance data unavailable.</p>
    </div>
  )

  const frameworks = Object.entries(data) as [string, any][]

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {frameworks.map(([key, fw]) => {
          const pct = fw.compliance_pct
          const color = pct >= 80 ? '#52c41a' : pct >= 60 ? '#ffc53d' : '#ff4d4f'
          return (
            <button
              key={key}
              onClick={() => setActiveFramework(key)}
              className={`text-center p-4 rounded-xl border transition-all ${
                activeFramework === key ? 'border-white/40 bg-surface2' : 'border-border hover:border-white/20'
              }`}
            >
              <div className="text-2xl font-black" style={{ color }}>{pct}%</div>
              <div className="text-xs font-semibold mt-1">{FRAMEWORK_NAMES[key] ?? key}</div>
              <div className="text-[10px] text-muted">{fw.compliant}/{fw.total_controls} controls</div>
            </button>
          )
        })}
      </div>

      {/* Full report link */}
      <div className="flex justify-end">
        <a
          href={`/api/scan/${scanId}/compliance/report`}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-3 py-1.5 bg-surface2 border border-border rounded-lg hover:border-white/30 transition-colors"
        >
          📄 Full Compliance Report
        </a>
      </div>

      {/* Control list for active framework */}
      {activeFramework && data[activeFramework] && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">{data[activeFramework].framework_name}</h3>
          {Object.entries(data[activeFramework].controls as Record<string, any>).map(([ctrlId, ctrl]) => (
            <details key={ctrlId} className="bg-surface2 border border-border rounded-xl overflow-hidden" open={ctrl.violated}>
              <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
                <span style={{ color: ctrl.violated ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
                  {ctrl.violated ? '✖' : '✔'}
                </span>
                <span className="font-mono text-xs bg-[#21262d] px-2 py-0.5 rounded text-muted">{ctrlId}</span>
                <span className="text-sm font-semibold flex-1">{ctrl.title}</span>
                {ctrl.violated ? (
                  <span className="text-xs text-[#ff4d4f] bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 px-2 py-0.5 rounded-full">
                    {ctrl.finding_count} violation(s)
                  </span>
                ) : (
                  <span className="text-xs text-[#52c41a] bg-[#52c41a]/10 border border-[#52c41a]/30 px-2 py-0.5 rounded-full">
                    Compliant
                  </span>
                )}
              </summary>
              {ctrl.violated && ctrl.findings.length > 0 && (
                <div className="px-4 pb-3 space-y-1 border-t border-border pt-3">
                  <p className="text-xs text-muted mb-2">{ctrl.description}</p>
                  {ctrl.findings.map((f: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-border last:border-0">
                      <SeverityBadge severity={f.severity} />
                      <span className="flex-1 font-medium">{f.title}</span>
                      <span className="font-mono text-muted">{f.file}:{f.line ?? '?'}</span>
                      <span className="text-muted">{f.cwe}</span>
                    </div>
                  ))}
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Threat Intel panel
// ──────────────────────────────────────────────────────────────

function ThreatIntelPanel({
  scanId, findings, data, loading, onEnrich,
}: {
  scanId: string
  findings: any[]
  data: any
  loading: boolean
  onEnrich: () => void
}) {
  const enrichedFindings = findings.filter((f) => f.threat_intel)

  if (loading) return <div className="text-center py-12 text-muted">Fetching threat intelligence data…</div>

  if (!data && enrichedFindings.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-4xl">🌐</div>
        <p className="text-muted text-sm">
          Enrich findings with live CVE/NVD data, EPSS exploit probabilities, and CISA KEV status.
        </p>
        <button
          onClick={onEnrich}
          className="px-5 py-2.5 rounded-lg font-bold text-sm bg-[#58a6ff] text-[#0d1117] hover:bg-[#79c0ff] transition-colors"
        >
          Fetch Threat Intelligence
        </button>
        <p className="text-xs text-muted">Queries NVD, FIRST EPSS, and CISA KEV APIs — takes ~10s</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'CVEs Found', value: data.total_cves_found, color: '#ffc53d' },
            { label: 'Active Exploits', value: data.findings_with_active_exploits, color: '#ff4d4f' },
            { label: 'CISA KEV', value: data.cisa_kev_cves?.length ?? 0, color: '#ff4d4f' },
            { label: 'Max EPSS', value: `${(data.max_epss_score * 100).toFixed(1)}%`, color: '#ff7a45' },
          ].map((s) => (
            <div key={s.label} className="bg-surface2 border border-border rounded-xl p-4 text-center"
              style={{ borderTopWidth: 3, borderTopColor: s.color }}>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {data?.cisa_kev_cves?.length > 0 && (
        <div className="p-4 bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 rounded-xl">
          <div className="font-bold text-[#ff4d4f] text-sm mb-1">⚠ CISA Known Exploited Vulnerabilities</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.cisa_kev_cves.map((cve: string) => (
              <span key={cve} className="font-mono text-xs bg-[#ff4d4f]/20 text-[#ff4d4f] px-2 py-1 rounded">{cve}</span>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">These CVEs are actively exploited in the wild per CISA's KEV catalog.</p>
        </div>
      )}

      {enrichedFindings.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">Per-Finding CVE Details</h3>
          {enrichedFindings.map((f, i) => {
            const ti = f.threat_intel
            return (
              <details key={i} className="bg-surface2 border border-border rounded-xl overflow-hidden">
                <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
                  <SeverityBadge severity={f.severity} />
                  <span className="flex-1 font-medium text-sm">{f.title}</span>
                  {ti.actively_exploited && (
                    <span className="text-xs text-[#ff4d4f] font-bold bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 px-2 py-0.5 rounded-full">
                      ACTIVELY EXPLOITED
                    </span>
                  )}
                  <span className="text-xs text-muted">{ti.cve_count} CVE(s)</span>
                  <span className="text-xs font-mono" style={{ color: ti.epss_max > 0.1 ? '#ff4d4f' : '#8b949e' }}>
                    EPSS {(ti.epss_max * 100).toFixed(1)}%
                  </span>
                </summary>
                <div className="border-t border-border p-4 space-y-2">
                  {ti.cves.map((cve: any) => (
                    <div key={cve.cve_id} className="flex items-start gap-3 text-xs py-2 border-b border-border last:border-0">
                      <div className="shrink-0">
                        <div className="font-mono font-bold text-[#58a6ff]">{cve.cve_id}</div>
                        <div className="text-muted mt-0.5">{cve.published}</div>
                      </div>
                      <div className="flex-1 text-muted leading-relaxed">{cve.description}</div>
                      <div className="shrink-0 text-right space-y-1">
                        {cve.cvss_score != null && (
                          <div className="font-bold" style={{ color: cve.cvss_score >= 9 ? '#ff4d4f' : cve.cvss_score >= 7 ? '#ff7a45' : '#ffc53d' }}>
                            CVSS {cve.cvss_score}
                          </div>
                        )}
                        {cve.in_kev && (
                          <div className="text-[#ff4d4f] font-bold">KEV ⚠</div>
                        )}
                        <div className="text-muted">EPSS {(cve.epss * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// History page
// ──────────────────────────────────────────────────────────────

function HistoryPage() {
  const [scans, setScans] = useState<ScanSummary[]>([])

  useEffect(() => {
    fetch('/api/scans').then((r) => r.json()).then(setScans)
  }, [])

  const statusIcon: Record<string, string> = { queued: '🕐', running: '⚡', complete: '✅', error: '❌' }
  const severityColor: Record<string, string> = {
    CRITICAL: '#ff4d4f', HIGH: '#ff7a45', MEDIUM: '#ffc53d', LOW: '#40a9ff', INFO: '#36cfc9',
    CLEAR: '#52c41a', '—': '#8b949e',
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-black mb-6">Scan History</h2>
      {scans.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <div className="text-5xl mb-4">📋</div>
          <div>No scans yet. <Link to="/" className="text-[#58a6ff]">Start one.</Link></div>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((s) => (
            <Link
              key={s.scan_id}
              to={`/scan/${s.scan_id}`}
              className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl hover:border-white/20 transition-colors"
            >
              <span className="text-xl">{statusIcon[s.status] ?? '·'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm truncate">{s.target}</div>
                <div className="text-xs text-muted mt-0.5">
                  {new Date(s.timestamp).toLocaleString()} · {s.mode.toUpperCase()} · {s.duration_seconds}s
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold" style={{ color: severityColor[s.highest_severity] ?? '#8b949e' }}>
                  {s.highest_severity}
                </div>
                <div className="text-xs text-muted">{s.total_findings} findings</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
// Root — quiz pop-up is shown globally whenever pending quizzes exist
// ──────────────────────────────────────────────────────────────

const MEMBER_ID_KEY = 'bass_member_id'

export default function App() {
  const [memberId, setMemberId] = useState<string>(() => {
    return localStorage.getItem(MEMBER_ID_KEY) || ''
  })
  const [showMemberPrompt, setShowMemberPrompt] = useState(!localStorage.getItem(MEMBER_ID_KEY))
  const [memberInput, setMemberInput] = useState('')
  const [showQuiz, setShowQuiz] = useState(false)

  // After member ID is set, check for pending quizzes every 60s
  useEffect(() => {
    if (!memberId) return
    let alive = true

    async function check() {
      try {
        const r = await fetch(`/api/quiz/pending/${memberId}`)
        const data = await r.json()
        if (alive && Array.isArray(data) && data.length > 0) setShowQuiz(true)
      } catch {
        // ignore network errors
      }
    }

    check()
    const timer = setInterval(check, 60_000)
    return () => { alive = false; clearInterval(timer) }
  }, [memberId])

  function saveMember() {
    const id = memberInput.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
    if (!id) return
    localStorage.setItem(MEMBER_ID_KEY, id)
    setMemberId(id)
    setShowMemberPrompt(false)
  }

  return (
    <div className="min-h-screen">
      <Nav />

      {/* One-time member ID prompt */}
      {showMemberPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="text-center">
              <div className="text-3xl mb-2">⚔</div>
              <h2 className="font-black text-lg">Welcome to BASS</h2>
              <p className="text-sm text-muted mt-1">Enter your name to identify yourself for quizzes and training.</p>
            </div>
            <input
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveMember()}
              placeholder="Your name (e.g. Jane Smith)"
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm focus:outline-none focus:border-white/40"
              autoFocus
            />
            <button
              onClick={saveMember}
              disabled={!memberInput.trim()}
              className="w-full py-2.5 rounded-lg font-bold text-sm bg-[#ffc53d] text-[#0d1117] hover:bg-[#ffa940] transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Quiz pop-up — non-dismissible */}
      {showQuiz && memberId && (
        <QuizPopup
          memberId={memberId}
          onComplete={() => setShowQuiz(false)}
        />
      )}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scan/:scanId" element={<ScanPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/manager" element={<ManagerConsole />} />
        <Route path="/training" element={<TrainingSchedule />} />
      </Routes>
    </div>
  )
}
