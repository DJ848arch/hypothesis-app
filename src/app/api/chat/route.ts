import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, AI_TOOLS, SYSTEM_PROMPT } from '@/lib/anthropic'
import { handleToolCall } from '@/lib/ai-tools'
import { todayString } from '@/lib/utils'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { message } = await request.json()

  // Load recent chat history
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role,content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const pastMessages = (history || []).reverse().map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content as string,
  }))

  const userMessage = `[Today is ${todayString()}] ${message}`

  // Save user message
  await supabase.from('chat_messages').insert({
    user_id: user.id,
    role: 'user',
    content: message,
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        let messages: Anthropic.MessageParam[] = [
          ...pastMessages,
          { role: 'user', content: userMessage },
        ]

        let fullResponse = ''

        // Agentic loop — keeps running until no more tool calls
        while (true) {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools: AI_TOOLS,
            messages,
          })

          // Collect text content
          let assistantText = ''
          const toolUseBlocks: Anthropic.ToolUseBlock[] = []

          for (const block of response.content) {
            if (block.type === 'text') {
              assistantText += block.text
              // Stream text token by token (split into words for smoother effect)
              const words = block.text.split(/(\s+)/)
              for (const word of words) {
                if (word) {
                  send({ type: 'text', delta: word })
                  await new Promise(r => setTimeout(r, 8))
                }
              }
            } else if (block.type === 'tool_use') {
              toolUseBlocks.push(block)
            }
          }

          if (assistantText) fullResponse += assistantText

          // If no tool calls, we're done
          if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
            break
          }

          // Execute tool calls
          const toolResults: Anthropic.ToolResultBlockParam[] = []

          for (const toolBlock of toolUseBlocks) {
            const result = await handleToolCall(
              toolBlock.name,
              toolBlock.input as Record<string, unknown>,
              supabase,
              user.id
            )

            send({
              type: 'tool_result',
              toolName: toolBlock.name,
              result,
              success: result.success !== false,
            })

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: JSON.stringify(result),
            })
          }

          // Continue the loop with tool results
          messages = [
            ...messages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: toolResults },
          ]
        }

        // Save assistant response
        if (fullResponse) {
          await supabase.from('chat_messages').insert({
            user_id: user.id,
            role: 'assistant',
            content: fullResponse,
          })
        }

        send({ type: 'done' })
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
