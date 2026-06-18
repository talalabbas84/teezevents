"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Send, Bot } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Message = { role: "user" | "assistant"; content: string }

type Props = { eventId: string; eventTitle: string }

const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  {
    label: "Generate Task Plan",
    prompt:
      "Based on this event, generate a comprehensive task plan organized by category. Include all critical tasks for a successful event.",
  },
  {
    label: "Suggest Checklists",
    prompt:
      "Create detailed checklists for this event: one for 30 days before, one for 1 week before, one for day-of, and one for post-event wrap-up.",
  },
  {
    label: "Identify Risks",
    prompt:
      "Identify the top 10 potential risks for this event with their severity levels and specific mitigation strategies.",
  },
  {
    label: "Create Timeline",
    prompt:
      "Create a detailed planning timeline with key milestones, working backwards from the event date.",
  },
  {
    label: "Budget Guidance",
    prompt:
      "Analyze the current budget setup and provide recommendations for budget allocation across categories, with typical percentages for an event of this size.",
  },
  {
    label: "Summarize Progress",
    prompt:
      "Analyze the current planning progress for this event. What's going well? What are the critical gaps that need immediate attention?",
  },
]

function renderMarkdown(text: string): React.ReactNode {
  const paragraphs = text.split(/\n\n+/)
  return (
    <div className="space-y-3">
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n")
        // Check if this paragraph is a list block
        const isList = lines.every(
          (l) => l.trim().startsWith("- ") || l.trim().startsWith("* ") || l.trim() === ""
        )
        if (isList) {
          return (
            <ul key={pi} className="space-y-1 pl-1">
              {lines
                .filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "))
                .map((l, li) => (
                  <li key={li} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c57a3a]" />
                    <span>{renderInline(l.replace(/^[-*]\s+/, ""))}</span>
                  </li>
                ))}
            </ul>
          )
        }
        return (
          <p key={pi} className="text-sm leading-relaxed">
            {lines.map((line, li) => {
              // Heading lines (start with ##)
              if (line.startsWith("### ")) {
                return (
                  <span key={li} className="block font-semibold text-[#c57a3a] text-xs uppercase tracking-wide mt-2 mb-0.5">
                    {renderInline(line.replace(/^###\s+/, ""))}
                  </span>
                )
              }
              if (line.startsWith("## ")) {
                return (
                  <span key={li} className="block font-bold text-foreground text-sm mt-2 mb-0.5">
                    {renderInline(line.replace(/^##\s+/, ""))}
                  </span>
                )
              }
              if (line.startsWith("# ")) {
                return (
                  <span key={li} className="block font-bold text-foreground text-base mt-3 mb-1">
                    {renderInline(line.replace(/^#\s+/, ""))}
                  </span>
                )
              }
              // List item inside a mixed paragraph
              if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                return (
                  <span key={li} className="flex gap-2 mt-1">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c57a3a]" />
                    <span>{renderInline(line.replace(/^[-*]\s+/, ""))}</span>
                  </span>
                )
              }
              return (
                <span key={li}>
                  {li > 0 && <br />}
                  {renderInline(line)}
                </span>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#c57a3a]/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

export function AiAssistantClient({ eventId, eventTitle }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom after each message update
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading) return
    setError(null)

    const newMessages: Message[] = [...messages, { role: "user", content: content.trim() }]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch(`/api/admin/planning/ai/${eventId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })

      const data = await res.json() as { message?: string; error?: string }

      if (!res.ok || data.error) {
        setError(data.error ?? "An unexpected error occurred.")
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message ?? "" },
        ])
      }
    } catch {
      setError("Network error — please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-gradient-to-r from-[#c57a3a]/10 via-[#c57a3a]/5 to-transparent px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#c57a3a] to-amber-600 shadow-sm">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold leading-tight">AI Planning Assistant</h2>
            <p className="text-xs text-muted-foreground">{eventTitle}</p>
          </div>
          <div className="ml-auto">
            <span className="rounded-full border border-[#c57a3a]/30 bg-[#c57a3a]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#c57a3a]">
              Powered by Claude
            </span>
          </div>
        </div>
      </div>

      {/* Quick actions strip */}
      <div className="shrink-0 overflow-x-auto border-b border-border bg-background/80 px-4 py-2.5">
        <div className="flex w-max items-center gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              disabled={isLoading}
              onClick={() => void sendMessage(action.prompt)}
              className="whitespace-nowrap rounded-full border border-[#c57a3a]/30 bg-[#c57a3a]/5 px-3 py-1 text-xs font-medium text-[#c57a3a] transition-all hover:border-[#c57a3a]/60 hover:bg-[#c57a3a]/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 bg-[#F7EDDB]/40">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          {/* Welcome / empty state */}
          {!hasMessages && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c57a3a] to-amber-500 shadow-lg">
                  <Sparkles size={28} className="text-white" />
                </div>
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 shadow">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-foreground">AI Planning Assistant</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Your intelligent event planning companion. Ask me anything about tasks, timelines, budgets, risks, or use the quick actions above to get started.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => void sendMessage(action.prompt)}
                    className="rounded-xl border border-[#c57a3a]/25 bg-white px-3 py-2.5 text-xs font-medium text-foreground/80 shadow-sm transition-all hover:border-[#c57a3a]/50 hover:bg-[#c57a3a]/5 hover:text-[#c57a3a]"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex items-end gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {/* AI avatar */}
              {msg.role === "assistant" && (
                <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#c57a3a] to-amber-600 shadow-sm">
                  <Bot size={13} className="text-white" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[85%] px-4 py-3 shadow-sm",
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-sm bg-[#c57a3a] text-white"
                    : "rounded-2xl rounded-bl-sm border border-border bg-white"
                )}
              >
                {msg.role === "user" ? (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="text-foreground">{renderMarkdown(msg.content)}</div>
                )}
              </div>
            </div>
          ))}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
              <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#c57a3a] to-amber-600 shadow-sm">
                <Bot size={13} className="text-white" />
              </div>
              <div className="rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-3 shadow-sm">
                <LoadingDots />
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <span className="font-medium">Error:</span> {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-xs underline underline-offset-2 hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your event planning…"
            disabled={isLoading}
            rows={1}
            className="max-h-28 min-h-[2.5rem] resize-none rounded-xl border-border bg-muted/30 text-sm focus-visible:ring-[#c57a3a]/40 disabled:opacity-60"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Button
            size="icon"
            disabled={isLoading || !input.trim()}
            onClick={() => void sendMessage(input)}
            className="h-10 w-10 shrink-0 rounded-xl bg-[#c57a3a] text-white hover:bg-[#c57a3a]/90 disabled:opacity-40"
          >
            <Send size={15} />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1 font-mono text-[9px]">⌘</kbd>+<kbd className="rounded bg-muted px-1 font-mono text-[9px]">↵</kbd> to send
        </p>
      </div>
    </div>
  )
}
