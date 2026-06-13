import { type Severity } from '../types'

const styles: Record<string, string> = {
  CRITICAL: 'text-critical bg-critical border border-critical/40',
  HIGH:     'text-high     bg-high     border border-high/40',
  MEDIUM:   'text-medium   bg-medium   border border-medium/40',
  LOW:      'text-low      bg-low      border border-low/40',
  INFO:     'text-info     bg-info     border border-info/40',
  CLEAR:    'text-clear    bg-clear    border border-clear/40',
}

export default function SeverityBadge({ severity }: { severity: string }) {
  const cls = styles[severity.toUpperCase()] ?? 'text-muted bg-surface2 border border-border'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wide ${cls}`}>
      {severity.toUpperCase()}
    </span>
  )
}
