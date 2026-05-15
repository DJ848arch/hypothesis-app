'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, ChevronRight, Sparkles, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SSEEvent } from '@/types'
import { useSWRConfig } from 'swr'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolResults?: Array<{ toolName: string; success: boolean }>
  streaming?: boolean
}

const TOOL_LABELS: Record<string, string> = {
  create_task: 'Created task',
  update_task: 'Updated task',
  list_tasks: 'Fetched tasks',
  create_project: 'Created project',
  list_projects: 'Fetched projects',
  create_habit: 'Created habit',
  log_habit: 'Logged habit',
  list_habits: 'Fetched habits',
  get_daily_summary: 'Got daily summary',
}

const TOOL_KEYS: Record<string, string[]> = {
  create_task: ['/api/tasks'],
  update_task: ['/api/tasks'],
  create_project: ['/api/projects'],
  create_habit: ['/api/habits?with_logs=true'],
  log_habit: ['/api/habits?with_logs=true'],
}

export default function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI planning assistant. Ask me to add tasks, create projects, set up habits, or just tell me what's on your mind and I'll help you get organized.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { mutate } = useSWRConfig()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const invalidateCache = useCallback((toolName: string) => {
    const keys = TOOL_KEYS[toolName]
    if (keys) {
      keys.forEach(key => mutate(key))
    }
    // Also invalidate any date-specific task queries
    if (toolName === 'create_task' || toolName === 'update_task') {
      mutate((key: string) => typeof key === 'string' && key.startsWith('/api/tasks'), undefined, { revalidate: true })
    }
  }, [mutate])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userText = input.trim()
    setInput('')
    setLoading(true)

    setMessages(prev => [...prev, { role: 'user', content: userText }])

    const assistantMsg: Message = { role: 'assistant', content: '', streaming: true, toolResults: [] }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data) continue

          try {
            const event: SSEEvent = JSON.parse(data)

            if (event.type === 'text' && event.delta) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + event.delta }
                }
                return updated
              })
            } else if (event.type === 'tool_result' && event.toolName) {
              invalidateCache(event.toolName)
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    toolResults: [...(last.toolResults || []), { toolName: event.toolName!, success: event.success !== false }],
                  }
                }
                return updated
              })
            } else if (event.type === 'done') {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, streaming: false }
                }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: 'Something went wrong. Please try again.', streaming: false }
        }
        return updated
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (collapsed) {
    return (
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 cursor-pointer z-50 flex items-center gap-2 px-3 py-4 rounded-l-xl"
        style={{ background: 'var(--primary)' }}
        onClick={() => setCollapsed(false)}
      >
        <Sparkles className="w-4 h-4 text-white" />
        <span className="text-white text-xs font-medium" style={{ writingMode: 'vertical-rl' }}>AI Assistant</span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full border-l"
      style={{ background: 'var(--card)', borderColor: 'var(--border)', width: '360px', minWidth: '360px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>AI Assistant</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:opacity-70 transition-opacity"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: msg.role === 'assistant' ? 'var(--primary)' : 'var(--muted)' }}
            >
              {msg.role === 'assistant'
                ? <Bot className="w-3.5 h-3.5 text-white" />
                : <User className="w-3.5 h-3.5" style={{ color: 'var(--muted-foreground)' }} />
              }
            </div>
            <div className={cn('flex flex-col gap-1.5 max-w-[80%]', msg.role === 'user' ? 'items-end' : 'items-start')}>
              {/* Tool results */}
              {msg.toolResults && msg.toolResults.length > 0 && (
                <div className="flex flex-col gap-1">
                  {msg.toolResults.map((tr, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                      {tr.success
                        ? <CheckCircle className="w-3 h-3 text-emerald-400" />
                        : <XCircle className="w-3 h-3 text-red-400" />
                      }
                      {TOOL_LABELS[tr.toolName] || tr.toolName}
                    </div>
                  ))}
                </div>
              )}

              {/* Message bubble */}
              {(msg.content || msg.streaming) && (
                <div
                  className="px-3 py-2.5 rounded-xl text-sm leading-relaxed"
                  style={{
                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--secondary)',
                    color: msg.role === 'user' ? 'white' : 'var(--foreground)',
                  }}
                >
                  {msg.content || (msg.streaming && <Loader2 className="w-3.5 h-3.5 animate-spin" />)}
                  {msg.streaming && msg.content && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current opacity-70 animate-pulse" />}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-2 items-end rounded-xl p-2" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything... (e.g. add 'workout' for tomorrow)"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed min-h-[24px] max-h-[120px]"
            style={{ color: 'var(--foreground)' }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
            style={{ background: 'var(--primary)' }}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
        <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--muted-foreground)' }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}
