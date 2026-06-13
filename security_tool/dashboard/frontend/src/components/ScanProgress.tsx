import { useEffect, useRef, useState } from 'react'
import { type WsEvent } from '../types'

interface LogLine {
  ts: string
  stage: string
  message: string
}

interface Props {
  scanId: string
  onComplete: () => void
  onError: (msg: string) => void
}

export default function ScanProgress({ scanId, onComplete, onError }: Props) {
  const [logs, setLogs] = useState<LogLine[]>([])
  const [stage, setStage] = useState('Initializing...')
  const bottomRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/scan/${scanId}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const event: WsEvent = JSON.parse(e.data)
      const ts = new Date().toLocaleTimeString()

      if (event.type === 'progress') {
        const s = event.stage ?? ''
        const m = event.message ?? ''
        setStage(`${s}: ${m}`)
        setLogs((prev) => [...prev, { ts, stage: s, message: m }])
      } else if (event.type === 'complete') {
        setStage('Scan complete!')
        setLogs((prev) => [...prev, { ts, stage: 'done', message: 'Scan complete.' }])
        onComplete()
      } else if (event.type === 'error') {
        setStage(`Error: ${event.message}`)
        onError(event.message ?? 'Unknown error')
      }
    }

    ws.onerror = () => onError('WebSocket connection failed')
    return () => ws.close()
  }, [scanId, onComplete, onError])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const stageIcon: Record<string, string> = {
    sentinel: '🛡',
    patrol: '🔍',
    done: '✅',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border">
        <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
        <span className="text-sm font-medium text-muted">{stage}</span>
      </div>

      <div className="bg-bg border border-border rounded-xl p-4 font-mono text-xs h-64 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 py-0.5">
            <span className="text-muted shrink-0">{log.ts}</span>
            <span className="shrink-0">{stageIcon[log.stage] ?? '·'}</span>
            <span className="text-[#c9d1d9]">{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
