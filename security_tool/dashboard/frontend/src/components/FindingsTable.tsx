import { useState } from 'react'
import { type Finding, type Severity } from '../types'
import SeverityBadge from './SeverityBadge'

const SEVERITIES: Array<Severity | 'ALL'> = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

interface Props {
  findings: Finding[]
}

export default function FindingsTable({ findings }: Props) {
  const [filter, setFilter] = useState<Severity | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const visible = findings.filter((f) => {
    if (filter !== 'ALL' && f.severity.toUpperCase() !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        f.file.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        (f.cwe ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const counts = Object.fromEntries(
    SEVERITIES.filter((s) => s !== 'ALL').map((s) => [
      s,
      findings.filter((f) => f.severity.toUpperCase() === s).length,
    ])
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              filter === s
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-surface2 border-border text-muted hover:border-white/20'
            }`}
          >
            {s === 'ALL' ? `ALL (${findings.length})` : `${s} (${counts[s] ?? 0})`}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search file, title, CWE..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto px-3 py-1.5 bg-surface2 border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-white/30 w-60"
        />
      </div>

      {/* Findings */}
      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <div className="text-4xl mb-3">✅</div>
            <div>No findings match the current filter.</div>
          </div>
        ) : (
          visible.map((f, i) => {
            const sev = f.severity.toUpperCase()
            const isOpen = expanded.has(i)
            const borderCls: Record<string, string> = {
              CRITICAL: 'border-l-[3px] border-l-[#ff4d4f]',
              HIGH:     'border-l-[3px] border-l-[#ff7a45]',
              MEDIUM:   'border-l-[3px] border-l-[#ffc53d]',
              LOW:      'border-l-[3px] border-l-[#40a9ff]',
              INFO:     'border-l-[3px] border-l-[#36cfc9]',
            }

            return (
              <div
                key={i}
                className={`bg-surface border border-border rounded-lg overflow-hidden ${borderCls[sev] ?? ''}`}
              >
                <button
                  className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-surface2 transition-colors"
                  onClick={() => toggle(i)}
                >
                  <SeverityBadge severity={sev} />
                  <span className="font-semibold text-sm flex-1 min-w-0">{f.title}</span>
                  <span className="font-mono text-xs text-muted bg-bg px-2 py-0.5 rounded max-w-xs truncate">
                    {f.file}{f.line ? `:${f.line}` : ''}
                  </span>
                  {f.cwe && (
                    <span className="text-xs text-muted bg-surface2 border border-border px-2 py-0.5 rounded">
                      {f.cwe}
                    </span>
                  )}
                  <span className="text-xs text-muted">
                    {f._source}{f._checkpoint ? `/${f._checkpoint}` : ''}
                  </span>
                  <span className="text-muted text-sm ml-auto">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 bg-bg border-t border-border space-y-3">
                    {f.description && (
                      <div>
                        <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Description</div>
                        <p className="text-sm text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">{f.description}</p>
                      </div>
                    )}
                    {f.recommendation && (
                      <div>
                        <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Recommendation</div>
                        <p className="text-sm text-[#7ee787] leading-relaxed whitespace-pre-wrap">{f.recommendation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
