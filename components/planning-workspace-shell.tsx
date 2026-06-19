"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Radio,
  Share2,
  Sparkles,
  StickyNote,
} from "lucide-react"
import { toast } from "sonner"

import { updateEventPlanningStatus } from "@/actions/planning"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SUB_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, slug: "dashboard" },
  { label: "Tasks", icon: CheckSquare, slug: "tasks" },
  { label: "Collaboration", icon: MessageSquare, slug: "collaboration" },
  { label: "Checklists", icon: ListChecks, slug: "checklists" },
  { label: "Timeline", icon: CalendarDays, slug: "timeline" },
  { label: "Budget", icon: DollarSign, slug: "budget" },
  { label: "Vendors", icon: Building2, slug: "vendors" },
  { label: "Files", icon: FolderOpen, slug: "files" },
  { label: "Notes", icon: StickyNote, slug: "notes" },
  { label: "Run Sheet", icon: ClipboardList, slug: "run-sheet" },
  { label: "Risks", icon: AlertTriangle, slug: "risks" },
  { label: "Reports", icon: BarChart3, slug: "reports" },
  { label: "Post-Event", icon: ClipboardCheck, slug: "post-event" },
  { label: "Distribution", icon: Share2, slug: "distribution" },

  { label: "AI Assistant", icon: Sparkles, slug: "ai" },
]

type PlanningStatus = "DRAFT" | "PLANNING" | "READY" | "LIVE" | "COMPLETED" | "CANCELLED" | "ARCHIVED"

const STATUS_OPTIONS: { value: PlanningStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PLANNING", label: "Planning" },
  { value: "READY", label: "Ready" },
  { value: "LIVE", label: "Live" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ARCHIVED", label: "Archived" },
]

function getStatusStyles(status: string): string {
  switch (status) {
    case "DRAFT":
      return "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
    case "PLANNING":
      return "border-blue-400/40 bg-blue-500/10 text-blue-700"
    case "READY":
      return "border-amber-400/40 bg-amber-500/10 text-amber-700"
    case "LIVE":
      return "border-green-500/40 bg-green-500/10 text-green-700"
    case "COMPLETED":
      return "border-indigo-400/40 bg-indigo-500/10 text-indigo-700"
    case "CANCELLED":
      return "border-red-400/40 bg-red-500/10 text-red-700"
    case "ARCHIVED":
      return "border-muted-foreground/20 bg-muted/30 text-muted-foreground/70"
    default:
      return "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
  }
}

function getStatusLabel(status: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status
}

interface PlanningWorkspaceShellProps {
  eventId: string
  eventTitle: string
  eventDate: string | null
  planningStatus: string
  children: React.ReactNode
}

export function PlanningWorkspaceShell({
  eventId,
  eventTitle,
  eventDate,
  planningStatus,
  children,
}: PlanningWorkspaceShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(newStatus: PlanningStatus) {
    if (newStatus === planningStatus) return
    startTransition(async () => {
      const result = await updateEventPlanningStatus(eventId, newStatus)
      if (result.success) {
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to update status")
      }
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky header + sub-nav */}
      <div className="sticky top-0 z-20 bg-background/95 shadow-sm backdrop-blur-xl">
        {/* Top header bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 lg:px-6 lg:py-3">
          <div className="flex min-w-0 items-center gap-2 lg:gap-4">
            <Link
              href={`/admin/events/${eventId}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-sm text-muted-foreground shadow-sm transition-colors hover:text-foreground lg:h-auto lg:w-auto lg:border-0 lg:bg-transparent lg:shadow-none"
            >
              <span aria-hidden="true">←</span>
              <span className="sr-only lg:not-sr-only lg:ml-1.5">Event Studio</span>
            </Link>

            <div className="hidden h-4 w-px bg-border lg:block" aria-hidden="true" />

            <div className="min-w-0">
              <h1 className="truncate font-serif text-base font-bold leading-tight lg:text-lg">{eventTitle}</h1>
              {eventDate && (
                <p className="truncate text-xs text-muted-foreground">{eventDate}</p>
              )}
            </div>
          </div>

          {/* Planning status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isPending}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-opacity disabled:opacity-60",
                  getStatusStyles(planningStatus)
                )}
              >
                {planningStatus === "LIVE" && (
                  <Radio size={11} className="animate-pulse" />
                )}
                {getStatusLabel(planningStatus)}
                <ChevronDown size={11} className="opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={cn(
                    "cursor-pointer text-xs font-medium",
                    opt.value === planningStatus && "font-semibold"
                  )}
                >
                  <span
                    className={cn(
                      "mr-2 inline-block h-2 w-2 rounded-full border",
                      getStatusStyles(opt.value)
                    )}
                  />
                  {opt.label}
                  {opt.value === planningStatus && (
                    <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Horizontal scrollable sub-nav */}
        <div className="no-scrollbar overflow-x-auto border-b border-border">
          <nav className="flex w-max min-w-full snap-x items-center gap-0.5 px-2 py-1.5 lg:gap-1 lg:px-6 lg:py-2">
            {SUB_NAV_ITEMS.map(({ label, icon: Icon, slug }) => {
              const href = `/admin/planning/${eventId}/${slug}`
              const isActive = pathname.startsWith(href)
              const isAI = slug === "ai"

              return (
                <Link
                  key={slug}
                  href={href}
                  title={label}
                  className={cn(
                    "flex snap-start items-center justify-center rounded-full transition-all",
                    /* Mobile: compact icon-only square; lg: pill with text */
                    "h-9 w-9 lg:h-auto lg:w-auto lg:gap-1.5 lg:px-4 lg:py-2 lg:whitespace-nowrap",
                    isAI
                      ? isActive
                        ? "bg-gradient-to-r from-[#c57a3a] to-amber-500 text-white shadow-sm"
                        : "border border-[#c57a3a]/30 bg-[#c57a3a]/8 text-[#c57a3a] hover:border-[#c57a3a]/60 hover:bg-[#c57a3a]/15"
                      : isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/60 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={15} className={cn(isAI && !isActive && "text-[#c57a3a]")} />
                  {/* Label: sr-only on mobile, visible on lg */}
                  <span className="sr-only lg:not-sr-only lg:text-sm lg:font-medium">{label}</span>
                  {isAI && !isActive && (
                    <span className="hidden lg:inline ml-0.5 rounded-sm bg-[#c57a3a]/20 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-[#c57a3a]">
                      AI
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1">{children}</div>
    </div>
  )
}
