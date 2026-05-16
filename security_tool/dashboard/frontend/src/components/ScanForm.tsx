import { useState } from 'react'

interface Props {
  onScanStarted: (scanId: string) => void
}

export default function ScanForm({ onScanStarted }: Props) {
  const [target, setTarget] = useState('')
  const [mode, setMode] = useState('both')
  const [failOn, setFailOn] = useState('NONE')
  const [apiKey, setApiKey] = useState('')
  const [remediate, setRemediate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, mode, fail_on: failOn, remediate, api_key: apiKey || undefined }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { scan_id } = await res.json()
      onScanStarted(scan_id)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-muted mb-1.5">Target Directory</label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="/absolute/path/to/project"
          required
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg font-mono text-sm focus:outline-none focus:border-white/30 text-white placeholder-muted"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-muted mb-1.5">Scan Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-white/30 text-white"
          >
            <option value="both">Both (Sentinel + Patrol)</option>
            <option value="sentinel">Sentinel only</option>
            <option value="patrol">Patrol only</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-muted mb-1.5">Fail Threshold</label>
          <select
            value={failOn}
            onChange={(e) => setFailOn(e.target.value)}
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-white/30 text-white"
          >
            <option value="NONE">Never fail</option>
            <option value="CRITICAL">Critical only</option>
            <option value="HIGH">High+</option>
            <option value="MEDIUM">Medium+</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-muted mb-1.5">
          Anthropic API Key
          <span className="ml-2 font-normal text-xs">(optional if set server-side)</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg font-mono text-sm focus:outline-none focus:border-white/30 text-white placeholder-muted"
        />
      </div>

      {/* Remediation toggle */}
      <div
        className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
          remediate ? 'border-[#ffc53d]/50 bg-[#ffc53d]/8' : 'border-border bg-surface2'
        }`}
        onClick={() => setRemediate((v) => !v)}
      >
        <div className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 mt-0.5 ${remediate ? 'bg-[#ffc53d]' : 'bg-border'}`}>
          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${remediate ? 'left-5' : 'left-0.5'}`} />
        </div>
        <div>
          <div className="text-sm font-semibold">🤖 AI Auto-Remediation</div>
          <div className="text-xs text-muted mt-0.5">
            Responder AI will propose fixes for confirmed findings.
            <strong className="text-[#ffc53d]"> Human approval is always required before any code change.</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-critical/10 border border-critical/30 rounded-lg text-sm text-[#ff4d4f]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-[#ff4d4f] to-[#ff7a45] text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Starting scan...' : '⚔ Arm BASS & Scan'}
      </button>
    </form>
  )
}
