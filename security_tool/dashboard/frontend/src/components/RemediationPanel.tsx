import { useState } from 'react'
import SeverityBadge from './SeverityBadge'

interface Remediation {
  remediation_id: string
  status: string
  approval_status: 'pending' | 'approved' | 'rejected'
  diff?: string
  explanation?: string
  reason?: string
  finding: {
    title: string
    severity: string
    file: string
    line?: number
    cwe?: string
  }
  result?: {
    status: string
    branch?: string
    message: string
    merge_command?: string
    test_output?: string
  }
}

interface Props {
  scanId: string
  remediations: Remediation[]
  onUpdate: () => void
}

function DiffView({ diff }: { diff: string }) {
  return (
    <pre className="text-xs overflow-x-auto p-3 bg-bg rounded-lg border border-border leading-relaxed">
      {diff.split('\n').map((line, i) => {
        let cls = 'text-[#8b949e]'
        if (line.startsWith('+++') || line.startsWith('---')) cls = 'text-white font-bold'
        else if (line.startsWith('@@')) cls = 'text-[#36cfc9]'
        else if (line.startsWith('+')) cls = 'text-[#56d364] bg-[#1a4731]'
        else if (line.startsWith('-')) cls = 'text-[#f85149] bg-[#3d1f20]'
        return <div key={i} className={`${cls} px-1`}>{line || ' '}</div>
      })}
    </pre>
  )
}

export default function RemediationPanel({ scanId, remediations, onUpdate }: Props) {
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const action = async (remediationId: string, act: 'approve' | 'reject') => {
    setLoading((p) => ({ ...p, [remediationId]: true }))
    try {
      await fetch(`/api/scan/${scanId}/remediation/${remediationId}/${act}`, { method: 'POST' })
      onUpdate()
    } finally {
      setLoading((p) => ({ ...p, [remediationId]: false }))
    }
  }

  const statusColors: Record<string, string> = {
    pending:  'text-[#ffc53d] border-[#ffc53d]/30 bg-[#ffc53d]/10',
    approved: 'text-[#52c41a] border-[#52c41a]/30 bg-[#52c41a]/10',
    rejected: 'text-[#8b949e] border-border bg-surface2',
  }

  const resultColors: Record<string, string> = {
    success:      'text-[#52c41a]',
    test_failure: 'text-[#ff4d4f]',
    git_error:    'text-[#ff7a45]',
    cannot_fix:   'text-[#8b949e]',
  }

  if (remediations.length === 0) {
    return (
      <div className="text-center py-10 text-muted">
        <div className="text-4xl mb-3">🤖</div>
        <div>No fix proposals generated.</div>
        <div className="text-sm mt-1">Enable "Auto-Remediate" when starting a scan to generate fix proposals.</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-[#ffc53d]/10 border border-[#ffc53d]/30 rounded-xl text-sm text-[#ffc53d]">
        <span>⚠</span>
        <span><strong>Human approval required</strong> before any fix is applied to your codebase.</span>
      </div>

      {remediations.map((r) => (
        <div key={r.remediation_id} className="bg-surface border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <SeverityBadge severity={r.finding.severity} />
            <span className="font-semibold text-sm flex-1">{r.finding.title}</span>
            <span className="font-mono text-xs text-muted bg-bg px-2 py-0.5 rounded">
              {r.finding.file}{r.finding.line ? `:${r.finding.line}` : ''}
            </span>
            {r.finding.cwe && (
              <span className="text-xs text-muted bg-surface2 border border-border px-2 py-0.5 rounded">
                {r.finding.cwe}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${statusColors[r.approval_status] ?? ''}`}>
              {r.approval_status.toUpperCase()}
            </span>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {r.status === 'cannot_fix' ? (
              <div className="text-sm text-[#8b949e] bg-surface2 rounded-lg p-3">
                <span className="font-bold">Cannot auto-fix: </span>{r.reason}
              </div>
            ) : r.status === 'error' ? (
              <div className="text-sm text-[#ff4d4f] bg-[#ff4d4f]/10 rounded-lg p-3">Error generating fix proposal.</div>
            ) : (
              <>
                {r.diff && (
                  <div>
                    <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Proposed Diff</div>
                    <DiffView diff={r.diff} />
                  </div>
                )}
                {r.explanation && (
                  <div>
                    <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Explanation</div>
                    <p className="text-sm text-[#c9d1d9]">{r.explanation}</p>
                  </div>
                )}

                {/* Result */}
                {r.result && (
                  <div className={`text-sm p-3 rounded-lg bg-surface2 ${resultColors[r.result.status] ?? ''}`}>
                    <div className="font-bold">{r.result.message}</div>
                    {r.result.branch && (
                      <div className="text-xs mt-1 text-muted">Branch: <code>{r.result.branch}</code></div>
                    )}
                    {r.result.merge_command && (
                      <div className="text-xs mt-1">
                        Merge: <code className="bg-bg px-1 rounded">{r.result.merge_command}</code>
                      </div>
                    )}
                    {r.result.test_output && r.result.status === 'test_failure' && (
                      <pre className="text-xs mt-2 overflow-x-auto max-h-32 bg-bg p-2 rounded text-[#f85149]">
                        {r.result.test_output.slice(0, 800)}
                      </pre>
                    )}
                  </div>
                )}

                {/* Approval buttons */}
                {r.approval_status === 'pending' && r.status === 'proposed' && (
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => action(r.remediation_id, 'approve')}
                      disabled={loading[r.remediation_id]}
                      className="px-5 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading[r.remediation_id] ? 'Applying...' : '✔ Approve & Apply'}
                    </button>
                    <button
                      onClick={() => action(r.remediation_id, 'reject')}
                      disabled={loading[r.remediation_id]}
                      className="px-5 py-2 bg-surface2 border border-border hover:border-white/30 text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      ✖ Reject
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
