import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { type ScanResults, type ScanSummary } from './types'
import ScanForm from './components/ScanForm'
import ScanProgress from './components/ScanProgress'
import FindingsTable from './components/FindingsTable'
import SeverityChart from './components/SeverityChart'
import SeverityBadge from './components/SeverityBadge'

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

  const fetchResults = useCallback(async () => {
    if (!scanId) return
    const res = await fetch(`/api/scan/${scanId}/results`)
    if (res.ok) setResults(await res.json())
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

          {/* Findings */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="font-bold mb-4">All Findings ({results.total_findings})</h3>
            <FindingsTable findings={results.all_findings} />
          </div>
        </>
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

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scan/:scanId" element={<ScanPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </div>
  )
}
