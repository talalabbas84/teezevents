"use client"

import { useState, useTransition, useMemo } from "react"
import { updateInquiryStatus } from "@/actions/contact"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Tag,
} from "lucide-react"

type Inquiry = {
  id: string
  name: string
  email: string
  phone: string | null
  eventType: string | null
  preferredDate: string | null
  message: string
  status: string
  adminNotes: string | null
  source: string | null
  createdAt: Date
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  NEW: { label: "New", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Clock className="h-3 w-3" /> },
  READ: { label: "Read", color: "bg-slate-100 text-slate-600 border-slate-200", icon: <Check className="h-3 w-3" /> },
  REPLIED: { label: "Replied", color: "bg-green-100 text-green-700 border-green-200", icon: <MessageSquare className="h-3 w-3" /> },
  ARCHIVED: { label: "Archived", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Archive className="h-3 w-3" /> },
}

const STATUS_OPTIONS = ["NEW", "READ", "REPLIED", "ARCHIVED"]
const FILTER_TABS = ["ALL", "NEW", "READ", "REPLIED", "ARCHIVED"]

function formatDate(date: Date) {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return "Just now"
  if (diffH < 24) return `${diffH}h ago`
  if (diffH < 48) return "Yesterday"
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`))
}

function InquiryCard({ inquiry: initial }: { inquiry: Inquiry }) {
  const [inquiry, setInquiry] = useState(initial)
  const [expanded, setExpanded] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(inquiry.adminNotes ?? "")
  const [isPending, startTransition] = useTransition()

  const statusCfg = STATUS_CONFIG[inquiry.status] ?? STATUS_CONFIG.NEW

  function changeStatus(newStatus: string) {
    const prev = inquiry.status
    setInquiry((q) => ({ ...q, status: newStatus }))
    startTransition(async () => {
      const res = await updateInquiryStatus(inquiry.id, newStatus)
      if (!res.success) {
        setInquiry((q) => ({ ...q, status: prev }))
        toast.error(res.error ?? "Failed to update status")
      }
    })
  }

  function saveNotes() {
    startTransition(async () => {
      const res = await updateInquiryStatus(inquiry.id, inquiry.status, notes)
      if (res.success) {
        setInquiry((q) => ({ ...q, adminNotes: notes }))
        setEditingNotes(false)
        toast.success("Notes saved")
      } else {
        toast.error(res.error ?? "Failed to save notes")
      }
    })
  }

  // Auto-mark as READ when expanded for the first time
  function handleExpand() {
    const opening = !expanded
    setExpanded(opening)
    if (opening && inquiry.status === "NEW") {
      changeStatus("READ")
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-white shadow-sm transition-all",
        inquiry.status === "NEW" && "border-blue-200 ring-1 ring-blue-100",
        inquiry.status !== "NEW" && "border-border"
      )}
    >
      {/* Card header row */}
      <button
        onClick={handleExpand}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c57a3a]/10 text-sm font-bold text-[#c57a3a]">
          {inquiry.name.charAt(0).toUpperCase()}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm leading-tight">{inquiry.name}</span>
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusCfg.color)}>
              {statusCfg.icon}
              {statusCfg.label}
            </span>
            {inquiry.source === "blossom" && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                Blossom
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{inquiry.email}</p>
          <p className="mt-1.5 text-sm text-foreground/80 line-clamp-2 leading-relaxed">
            {inquiry.message}
          </p>
        </div>

        {/* Meta + chevron */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(inquiry.createdAt)}</span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {/* Contact details */}
          <div className="flex flex-wrap gap-2">
            <a
              href={`mailto:${inquiry.email}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-[#c57a3a]" />
              {inquiry.email}
            </a>
            {inquiry.phone && (
              <a
                href={`tel:${inquiry.phone}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-[#c57a3a]" />
                {inquiry.phone}
              </a>
            )}
            <button
              onClick={() => copyToClipboard(inquiry.email, "Email")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy email
            </button>
            {inquiry.phone && (
              <button
                onClick={() => copyToClipboard(inquiry.phone!, "Phone")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy phone
              </button>
            )}
          </div>

          {/* Inquiry meta */}
          {(inquiry.eventType || inquiry.preferredDate) && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {inquiry.eventType && (
                <span className="inline-flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {inquiry.eventType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              )}
              {inquiry.preferredDate && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Preferred: {new Date(inquiry.preferredDate).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
          )}

          {/* Full message */}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Message</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
          </div>

          {/* Admin notes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Internal Notes</p>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add follow-up notes, what was discussed, next steps..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#c57a3a]/50 focus:ring-2 focus:ring-[#c57a3a]/20 resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveNotes}
                    disabled={isPending}
                    className="rounded-lg bg-[#c57a3a] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[#b06830] transition-colors"
                  >
                    {isPending ? "Saving…" : "Save Notes"}
                  </button>
                  <button
                    onClick={() => { setEditingNotes(false); setNotes(inquiry.adminNotes ?? "") }}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/40 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/30",
                  inquiry.adminNotes ? "border-border bg-white" : "border-dashed border-border/60 text-muted-foreground"
                )}
              >
                {inquiry.adminNotes || "Click to add notes…"}
              </button>
            )}
          </div>

          {/* Status actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-muted-foreground mr-1">Status:</span>
            {STATUS_OPTIONS.filter((s) => s !== inquiry.status).map((s) => {
              const cfg = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={isPending}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 hover:opacity-80",
                    cfg.color
                  )}
                >
                  {cfg.icon}
                  Mark as {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function ContactInboxClient({ initialInquiries }: { initialInquiries: Inquiry[] }) {
  const [filter, setFilter] = useState("ALL")
  const [search, setSearch] = useState("")

  const newCount = initialInquiries.filter((i) => i.status === "NEW").length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initialInquiries.filter((i) => {
      if (filter !== "ALL" && i.status !== filter) return false
      if (q) {
        return (
          i.name.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.message.toLowerCase().includes(q) ||
          (i.phone ?? "").includes(q)
        )
      }
      return true
    })
  }, [initialInquiries, filter, search])

  return (
    <div className="space-y-4">
      {/* Filter + search bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter tabs */}
        <div className="flex items-center rounded-lg border border-border bg-white p-0.5 gap-0.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "relative flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                filter === tab ? "bg-[#c57a3a] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "ALL" ? "All" : STATUS_CONFIG[tab].label}
              {tab === "NEW" && newCount > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  filter === "NEW" ? "bg-white/20" : "bg-blue-500 text-white"
                )}>
                  {newCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-white pl-8 pr-3 text-sm placeholder:text-muted-foreground/60 focus:border-[#c57a3a]/50 focus:outline-none focus:ring-2 focus:ring-[#c57a3a]/20"
          />
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length === 0 ? "No inquiries" : `${filtered.length} ${filtered.length === 1 ? "inquiry" : "inquiries"}`}
        {filter !== "ALL" && ` · ${filter.toLowerCase()}`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-4xl">📬</span>
          <p className="font-semibold text-foreground">No inquiries yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            When someone fills out the "Get in Touch" form on your website, their message will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  )
}
