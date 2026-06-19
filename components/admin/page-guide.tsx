"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, HelpCircle, Lightbulb, X } from "lucide-react"

type Step = { title: string; description: string }
type Tip = string

export type GuideProps = {
  id: string // unique key for localStorage persistence
  title: string
  subtitle?: string
  steps: Step[]
  tips?: Tip[]
  defaultOpen?: boolean
}

export function PageGuide({ id, title, subtitle, steps, tips, defaultOpen = false }: GuideProps) {
  const storageKey = `guide-dismissed-${id}`
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    const wasDismissed = localStorage.getItem(storageKey) === "true"
    setDismissed(wasDismissed)
  }, [storageKey])

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="flex items-center gap-1.5 rounded-full border border-[#c57a3a]/30 bg-[#c57a3a]/5 px-3 py-1.5 text-xs font-medium text-[#c57a3a] transition-colors hover:bg-[#c57a3a]/10"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        How to use this page
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-[#c57a3a]/20 bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#c57a3a]/10">
            <HelpCircle className="h-4 w-4 text-[#c57a3a]" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              localStorage.setItem(storageKey, "true")
              setDismissed(true)
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss guide"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </button>

      {/* Expandable body */}
      {open && (
        <div className="border-t border-[#c57a3a]/10 px-4 pb-4 pt-3">
          {/* Steps */}
          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#c57a3a] text-[10px] font-bold text-white mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* Tips */}
          {tips && tips.length > 0 && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200/60 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">Tips</span>
              </div>
              <ul className="space-y-1">
                {tips.map((tip, i) => (
                  <li key={i} className="text-xs text-amber-800 leading-relaxed">
                    · {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Inline help tooltip for form fields and small UI elements
export function FieldHelp({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="ml-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {visible && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-foreground shadow-lg">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />
        </span>
      )}
    </span>
  )
}

// Callout box for first-time empty states
export function EmptyGuide({ icon, title, description, action }: {
  icon: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="text-4xl">{icon}</span>
      <div className="max-w-xs space-y-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 rounded-xl bg-[#c57a3a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b06830] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
