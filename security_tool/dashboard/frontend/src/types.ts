export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'CLEAR'

export interface Finding {
  file: string
  line: number | null
  severity: Severity
  cwe: string | null
  title: string
  description: string
  recommendation: string
  _source: 'SENTINEL' | 'PATROL'
  _checkpoint: string | null
}

export interface ScanResults {
  scan_id: string
  target: string
  mode: string
  timestamp: string
  duration_seconds: number
  all_findings: Finding[]
  severity_counts: Record<Severity, number>
  highest_severity: Severity | 'CLEAR'
  total_findings: number
  sentinel: {
    checkpoints: Record<string, { files_analyzed: number; findings: Finding[]; summary: string }>
    total_findings: number
  }
  patrol: {
    total_files: number
    total_findings: number
  }
}

export interface ScanSummary {
  scan_id: string
  target: string
  mode: string
  timestamp: string
  status: 'queued' | 'running' | 'complete' | 'error'
  total_findings: number
  highest_severity: string
  duration_seconds: number
  error?: string | null
}

export type ScanStatus = ScanSummary['status']

export interface WsEvent {
  type: 'progress' | 'complete' | 'error'
  stage?: string
  message?: string
  current?: number
  total?: number
  scan_id?: string
}
