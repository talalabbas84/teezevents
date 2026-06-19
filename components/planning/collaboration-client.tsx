"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"
import {
  createEventComment,
  deleteEventComment,
  togglePinComment,
  updateEventComment,
} from "@/actions/event-comments"
import {
  addCommentAttachment,
  removeCommentAttachment,
} from "@/actions/attachments"
import { AttachmentUploader } from "@/components/planning/attachment-uploader"
import { AttachmentPreview, type AttachmentItem } from "@/components/planning/attachment-preview"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Exported types ──────────────────────────────────────────────────────────

export type CommentAttachmentSerialized = {
  id: string
  url: string
  name: string
  mimeType?: string | null
}

export type CollaborationCommentSerialized = {
  id: string
  eventId: string
  authorEmail: string
  authorName: string | null
  body: string
  entityType: string | null
  entityId: string | null
  mentions: string[]
  isEdited: boolean
  isPinned: boolean
  parentId: string | null
  createdAt: string
  updatedAt: string
  replies: CollaborationCommentSerialized[]
  attachments?: CommentAttachmentSerialized[]
}

export type CollaborationMemberSerialized = {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  avatarColor: string | null
  lastActiveAt: string | null
  accessLevel: string | null
}

export type CollaborationActivitySerialized = {
  id: string
  actorEmail: string
  action: string
  entityType: string | null
  entityName: string | null
  createdAt: string
}

export type CollaborationResourceSerialized = {
  id: string
  name: string
  url: string
  category: string | null
  uploadedBy: string | null
  createdAt: string
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  eventId: string
  eventTitle: string
  currentEmail: string
  initialComments: CollaborationCommentSerialized[]
  teamMembers: CollaborationMemberSerialized[]
  activity: CollaborationActivitySerialized[]
  resources: CollaborationResourceSerialized[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarHue(email: string): string {
  const hue = (email.charCodeAt(0) * 137) % 360
  return `hsl(${hue}, 65%, 50%)`
}

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 30) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function isRecentlyActive(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false
  return Date.now() - new Date(lastActiveAt).getTime() < 5 * 60 * 1000
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    CREATED_EVENT_COMMENT: "posted a comment",
    REPLIED_TO_COMMENT: "replied to a comment",
    COMMENT_UPDATED: "edited a comment",
    COMMENT_DELETED: "deleted a comment",
    COMMENT_PINNED: "pinned a comment",
    COMMENT_UNPINNED: "unpinned a comment",
  }
  return map[action] ?? action.toLowerCase().replace(/_/g, " ")
}

function activityIcon(action: string): string {
  if (action.includes("PIN")) return "📌"
  if (action.includes("DELETE")) return "🗑️"
  if (action.includes("REPL")) return "↩️"
  if (action.includes("UPDAT") || action.includes("EDIT")) return "✏️"
  return "💬"
}

function highlightMentions(body: string): React.ReactNode {
  const parts = body.split(/(@[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g)
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-primary font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  email,
  name,
  size = "md",
}: {
  email: string
  name: string | null
  size?: "sm" | "md" | "lg"
}) {
  const sz =
    size === "sm"
      ? "h-7 w-7 text-xs"
      : size === "lg"
      ? "h-10 w-10 text-sm"
      : "h-8 w-8 text-xs"
  return (
    <div
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center font-semibold text-white",
        sz
      )}
      style={{ backgroundColor: avatarHue(email) }}
      title={name ?? email}
    >
      {initials(name, email)}
    </div>
  )
}

// ─── @Mention Textarea ────────────────────────────────────────────────────────

type MentionTextareaProps = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  teamMembers: CollaborationMemberSerialized[]
  rows?: number
  className?: string
  onSubmit?: () => void
  autoFocus?: boolean
}

function MentionTextarea({
  value,
  onChange,
  placeholder,
  teamMembers,
  rows = 3,
  className,
  onSubmit,
  autoFocus,
}: MentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  const filteredMembers =
    mentionQuery !== null
      ? teamMembers.filter(
          (m) =>
            (m.name ?? "").toLowerCase().includes(mentionQuery.toLowerCase()) ||
            m.email.toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : []

  const detectMention = useCallback(() => {
    const el = ref.current
    if (!el) return
    const pos = el.selectionStart
    const before = el.value.slice(0, pos)
    const match = before.match(/@([a-zA-Z0-9._%+\-]*)$/)
    if (match) {
      const typed = match[1]
      // Don't trigger if already includes an @ (i.e. it's a full email)
      if (typed.includes("@")) {
        setMentionQuery(null)
        return
      }
      setMentionQuery(typed)
      setMentionStart(pos - typed.length - 1)
      setActiveIdx(0)
    } else {
      setMentionQuery(null)
    }
  }, [])

  const insertMention = useCallback(
    (member: CollaborationMemberSerialized) => {
      const el = ref.current
      if (!el) return
      const pos = el.selectionStart
      const newVal =
        value.slice(0, mentionStart) + `@${member.email}` + value.slice(pos) + " "
      onChange(newVal)
      setMentionQuery(null)
      setTimeout(() => {
        if (el) {
          const newPos = mentionStart + member.email.length + 2
          el.focus()
          el.setSelectionRange(newPos, newPos)
        }
      }, 0)
    },
    [value, mentionStart, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, filteredMembers.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(filteredMembers[activeIdx])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      onSubmit?.()
    }
  }

  // Auto-resize
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }, [value])

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          detectMention()
        }}
        onKeyDown={handleKeyDown}
        onSelect={detectMention}
        onKeyUp={detectMention}
        placeholder={placeholder}
        rows={rows}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        className={cn(
          "w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-15",
          className
        )}
      />
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="absolute z-50 left-0 top-full mt-1 w-72 rounded-xl border border-border bg-white shadow-xl max-h-60 overflow-y-auto">
          {filteredMembers.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(m)
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted/40 transition-colors",
                i === activeIdx && "bg-primary/10"
              )}
            >
              <Avatar email={m.email} name={m.name} size="sm" />
              <div className="min-w-0">
                <div className="font-medium leading-tight truncate">{m.name ?? m.email}</div>
                {m.name && (
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Reply Component ──────────────────────────────────────────────────────────

function ReplyCard({
  reply,
  currentEmail,
  isAdmin,
  teamMembers,
  onDelete,
  onEdit,
}: {
  reply: CollaborationCommentSerialized
  currentEmail: string
  isAdmin: boolean
  teamMembers: CollaborationMemberSerialized[]
  onDelete: (id: string) => void
  onEdit: (id: string, body: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(reply.body)
  const [isPending, startTransition] = useTransition()
  const isOwn = reply.authorEmail === currentEmail
  const canEdit = isOwn
  const canDelete = isOwn || isAdmin

  const handleSave = () => {
    if (!editBody.trim()) return
    startTransition(async () => {
      const res = await updateEventComment(reply.id, editBody.trim())
      if (res.success) {
        onEdit(reply.id, editBody.trim())
        setEditing(false)
        toast.success("Reply updated")
      } else {
        toast.error(res.error ?? "Failed to update reply")
      }
    })
  }

  return (
    <div className="flex gap-2.5">
      <Avatar email={reply.authorEmail} name={reply.authorName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-sm">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-semibold text-sm leading-tight">
              {reply.authorName ?? reply.authorEmail}
            </span>
            <span className="text-xs text-muted-foreground">{reply.authorEmail}</span>
          </div>
          {editing ? (
            <div className="mt-1.5 space-y-2">
              <MentionTextarea
                value={editBody}
                onChange={setEditBody}
                teamMembers={teamMembers}
                rows={2}
                autoFocus
                onSubmit={handleSave}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isPending || !editBody.trim()}
                  className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setEditBody(reply.body)
                  }}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted/40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
              {highlightMentions(reply.body)}
            </p>
          )}
          {reply.isEdited && !editing && (
            <span className="text-[10px] text-muted-foreground italic"> · edited</span>
          )}
          {/* Existing attachments on this reply */}
          {reply.attachments && reply.attachments.length > 0 && !editing && (
            <div className="mt-2">
              <AttachmentPreview attachments={reply.attachments} compact />
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground">{timeAgo(reply.createdAt)}</span>
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(reply.id)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Comment Card ─────────────────────────────────────────────────────────────

function CommentCard({
  comment,
  currentEmail,
  isAdmin,
  teamMembers,
  eventId,
  onDelete,
  onEdit,
  onTogglePin,
  onAddReply,
  onDeleteReply,
  onEditReply,
  onAddAttachment,
  onRemoveAttachment,
}: {
  comment: CollaborationCommentSerialized
  currentEmail: string
  isAdmin: boolean
  teamMembers: CollaborationMemberSerialized[]
  eventId: string
  onDelete: (id: string) => void
  onEdit: (id: string, body: string) => void
  onTogglePin: (id: string, current: boolean) => void
  onAddReply: (parentId: string, reply: CollaborationCommentSerialized) => void
  onDeleteReply: (parentId: string, replyId: string) => void
  onEditReply: (parentId: string, replyId: string, body: string) => void
  onAddAttachment: (commentId: string, attachment: CommentAttachmentSerialized) => void
  onRemoveAttachment: (commentId: string, attachmentId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [replying, setReplying] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [pendingReplyAttachments, setPendingReplyAttachments] = useState<AttachmentItem[]>([])
  const [showAllReplies, setShowAllReplies] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [isReplyPending, startReplyTransition] = useTransition()
  const [isAttachPending, startAttachTransition] = useTransition()

  const isOwn = comment.authorEmail === currentEmail
  const canEdit = isOwn
  const canDelete = isOwn || isAdmin
  const canPin = isOwn || isAdmin

  const visibleReplies =
    comment.replies.length > 2 && !showAllReplies
      ? comment.replies.slice(0, 2)
      : comment.replies

  const handleSaveEdit = () => {
    if (!editBody.trim()) return
    startTransition(async () => {
      const res = await updateEventComment(comment.id, editBody.trim())
      if (res.success) {
        onEdit(comment.id, editBody.trim())
        setEditing(false)
        toast.success("Comment updated")
      } else {
        toast.error(res.error ?? "Failed to update comment")
      }
    })
  }

  const handleReplySubmit = () => {
    if (!replyBody.trim()) return
    const tempId = `temp-reply-${Date.now()}`
    const attachmentsSnapshot = [...pendingReplyAttachments]
    const optimistic: CollaborationCommentSerialized = {
      id: tempId,
      eventId: comment.eventId,
      authorEmail: currentEmail,
      authorName: teamMembers.find((m) => m.email === currentEmail)?.name ?? null,
      body: replyBody.trim(),
      entityType: null,
      entityId: null,
      mentions: [],
      isEdited: false,
      isPinned: false,
      parentId: comment.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
      attachments: attachmentsSnapshot,
    }
    onAddReply(comment.id, optimistic)
    const bodySnapshot = replyBody.trim()
    setReplyBody("")
    setPendingReplyAttachments([])
    setReplying(false)
    setShowAllReplies(true)
    startReplyTransition(async () => {
      const res = await createEventComment({
        eventId: comment.eventId,
        body: bodySnapshot,
        parentId: comment.id,
      })
      if (res.success && res.data) {
        const newCommentId = (res.data as { id: string }).id
        onEditReply(comment.id, tempId, bodySnapshot)
        // Save pending attachments
        for (const att of attachmentsSnapshot) {
          const attRes = await addCommentAttachment(newCommentId, comment.eventId, {
            url: att.url,
            name: att.name,
            mimeType: att.mimeType ?? undefined,
            sizeBytes: att.sizeBytes ?? undefined,
          })
          if (!attRes.success) {
            toast.error(`Failed to save attachment: ${att.name}`)
          }
        }
      } else {
        onDeleteReply(comment.id, tempId)
        toast.error(res.error ?? "Failed to post reply")
      }
    })
  }

  function handleCommentAttachUpload(file: { url: string; name: string; mimeType: string; sizeBytes: number }) {
    const tempId = `temp-att-${Date.now()}`
    const optimistic: CommentAttachmentSerialized = { id: tempId, url: file.url, name: file.name, mimeType: file.mimeType }
    onAddAttachment(comment.id, optimistic)
    startAttachTransition(async () => {
      const res = await addCommentAttachment(comment.id, eventId, file)
      if (res.success && res.data) {
        // Replace temp with real id via remove+add
        onRemoveAttachment(comment.id, tempId)
        onAddAttachment(comment.id, res.data as CommentAttachmentSerialized)
        toast.success("Attachment added")
      } else {
        onRemoveAttachment(comment.id, tempId)
        toast.error(res.error ?? "Failed to save attachment")
      }
    })
  }

  function handleCommentAttachRemove(attachmentId: string) {
    onRemoveAttachment(comment.id, attachmentId)
    startAttachTransition(async () => {
      const res = await removeCommentAttachment(attachmentId, comment.id, eventId)
      if (!res.success) {
        toast.error(res.error ?? "Failed to remove attachment")
      } else {
        toast.success("Attachment removed")
      }
    })
  }

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm transition-colors",
        comment.isPinned ? "bg-amber-50 border-amber-200" : "bg-white border-border"
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar email={comment.authorEmail} name={comment.authorName} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm leading-tight">
                {comment.authorName ?? comment.authorEmail}
              </span>
              {comment.isPinned && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                  📌 Pinned
                </span>
              )}
              {comment.isEdited && (
                <span className="text-[10px] text-muted-foreground italic">edited</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{comment.authorEmail}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-3 pl-11">
          {editing ? (
            <div className="space-y-2">
              <div className="rounded-xl border-2 border-primary/30 bg-white px-3 py-2 focus-within:border-primary/50 transition-colors">
                <MentionTextarea
                  value={editBody}
                  onChange={setEditBody}
                  teamMembers={teamMembers}
                  rows={2}
                  autoFocus
                  onSubmit={handleSaveEdit}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isPending || !editBody.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {isPending ? "Saving…" : "Save changes"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setEditBody(comment.body)
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground">
                {highlightMentions(comment.body)}
              </p>
              {/* Comment attachments */}
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="mt-2">
                  <AttachmentPreview
                    attachments={comment.attachments}
                    onRemove={
                      (comment.authorEmail === currentEmail || isAdmin)
                        ? handleCommentAttachRemove
                        : undefined
                    }
                  />
                </div>
              )}
            </>
          )}

          {/* Actions */}
          {!editing && (
            <div className="mt-2 flex items-center gap-1 flex-wrap">
              <button
                onClick={() => {
                  setLiked((v) => !v)
                  setLikeCount((c) => (liked ? c - 1 : c + 1))
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-muted/40",
                  liked ? "text-blue-600" : "text-muted-foreground"
                )}
              >
                <svg
                  className={cn("h-3.5 w-3.5", liked ? "fill-blue-600" : "fill-none")}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
                {likeCount > 0 ? `Like · ${likeCount}` : "Like"}
              </button>

              <button
                onClick={() => setReplying((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40"
              >
                💬 Reply
              </button>

              {/* Attach file to this comment */}
              {(comment.authorEmail === currentEmail || isAdmin) && (
                <span className="inline-flex items-center">
                  <AttachmentUploader
                    onUpload={handleCommentAttachUpload}
                    disabled={isAttachPending}
                    compact
                  />
                </span>
              )}

              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  Edit
                </button>
              )}

              {canPin && (
                <button
                  onClick={() => onTogglePin(comment.id, comment.isPinned)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  {comment.isPinned ? "Unpin" : "📌 Pin"}
                </button>
              )}

              {canDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/5"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Replies section */}
      {(comment.replies.length > 0 || replying) && (
        <div className="border-t border-border/50 px-4 pb-4 pt-3">
          <div className="ml-10 space-y-3 border-l-2 border-primary/20 pl-3">
            {visibleReplies.map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                currentEmail={currentEmail}
                isAdmin={isAdmin}
                teamMembers={teamMembers}
                onDelete={(id) => onDeleteReply(comment.id, id)}
                onEdit={(id, body) => onEditReply(comment.id, id, body)}
              />
            ))}

            {comment.replies.length > 2 && !showAllReplies && (
              <button
                onClick={() => setShowAllReplies(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                View {comment.replies.length - 2} more{" "}
                {comment.replies.length - 2 === 1 ? "reply" : "replies"}
              </button>
            )}

            {replying && (
              <div className="flex gap-2.5 mt-2">
                <Avatar email={currentEmail} name={null} size="sm" />
                <div className="flex-1 space-y-2">
                  <div className="rounded-xl border-2 border-primary/20 bg-white px-3 py-2 focus-within:border-primary/50 transition-colors shadow-sm">
                    <MentionTextarea
                      value={replyBody}
                      onChange={setReplyBody}
                      placeholder="Write a reply…"
                      teamMembers={teamMembers}
                      rows={2}
                      autoFocus
                      onSubmit={handleReplySubmit}
                    />
                  </div>
                  {/* Pending reply attachments preview */}
                  {pendingReplyAttachments.length > 0 && (
                    <AttachmentPreview
                      attachments={pendingReplyAttachments}
                      onRemove={(id) => setPendingReplyAttachments((prev) => prev.filter((a) => a.id !== id))}
                      compact
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <AttachmentUploader
                      compact
                      onUpload={(file) => {
                        const tempId = `pending-${Date.now()}`
                        setPendingReplyAttachments((prev) => [
                          ...prev,
                          { id: tempId, url: file.url, name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes },
                        ])
                      }}
                    />
                    <button
                      onClick={handleReplySubmit}
                      disabled={isReplyPending || !replyBody.trim()}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
                    >
                      {isReplyPending ? "Posting…" : "Reply"}
                    </button>
                    <button
                      onClick={() => {
                        setReplying(false)
                        setReplyBody("")
                        setPendingReplyAttachments([])
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/40 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CollaborationClient({
  eventId,
  currentEmail,
  initialComments,
  teamMembers,
  activity,
  resources,
}: Props) {
  const [comments, setComments] = useState<CollaborationCommentSerialized[]>(initialComments)
  const [body, setBody] = useState("")
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([])
  const [isPending, startTransition] = useTransition()

  const currentMember = teamMembers.find((m) => m.email === currentEmail)
  const isAdmin =
    currentMember?.role === "ADMIN" ||
    currentMember?.role === "SUPER_ADMIN" ||
    currentMember?.accessLevel === "MANAGE"

  // ── Submit new comment ────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!body.trim()) return
    const tempId = `temp-${Date.now()}`
    const optimistic: CollaborationCommentSerialized = {
      id: tempId,
      eventId,
      authorEmail: currentEmail,
      authorName: currentMember?.name ?? null,
      body: body.trim(),
      entityType: null,
      entityId: null,
      mentions: [],
      isEdited: false,
      isPinned: false,
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
    }
    setComments((prev) => [optimistic, ...prev])
    const snapshot = body.trim()
    const attachmentsSnapshot = [...pendingAttachments]
    setBody("")
    setPendingAttachments([])
    startTransition(async () => {
      const res = await createEventComment({ eventId, body: snapshot })
      if (res.success && res.data) {
        const d = res.data as unknown as CollaborationCommentSerialized & {
          createdAt: string | Date
          updatedAt: string | Date
        }
        const newCommentId = (d as { id: string }).id
        setComments((prev) =>
          prev.map((c) =>
            c.id === tempId
              ? {
                  ...d,
                  createdAt:
                    typeof d.createdAt === "string"
                      ? d.createdAt
                      : new Date(d.createdAt).toISOString(),
                  updatedAt:
                    typeof d.updatedAt === "string"
                      ? d.updatedAt
                      : new Date(d.updatedAt).toISOString(),
                  replies: [],
                  attachments: attachmentsSnapshot,
                }
              : c
          )
        )
        // Save pending attachments to DB
        for (const att of attachmentsSnapshot) {
          const attRes = await addCommentAttachment(newCommentId, eventId, {
            url: att.url,
            name: att.name,
            mimeType: att.mimeType ?? undefined,
            sizeBytes: att.sizeBytes ?? undefined,
          })
          if (!attRes.success) {
            toast.error(`Failed to save attachment: ${att.name}`)
          }
        }
      } else {
        setComments((prev) => prev.filter((c) => c.id !== tempId))
        toast.error(res.error ?? "Failed to post comment")
      }
    })
  }

  // ── Delete comment ────────────────────────────────────────────────────────

  const handleDelete = useCallback((id: string) => {
    const snapshot = comments.find((c) => c.id === id)
    setComments((prev) => prev.filter((c) => c.id !== id))
    startTransition(async () => {
      const res = await deleteEventComment(id)
      if (!res.success) {
        if (snapshot) setComments((prev) => [snapshot, ...prev])
        toast.error(res.error ?? "Failed to delete comment")
      } else {
        toast.success("Comment deleted")
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments])

  // ── Edit comment body ─────────────────────────────────────────────────────

  const handleEdit = useCallback((id: string, newBody: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, body: newBody, isEdited: true } : c))
    )
  }, [])

  // ── Toggle pin ────────────────────────────────────────────────────────────

  const handleTogglePin = useCallback((id: string, currentPinned: boolean) => {
    const newPinned = !currentPinned
    setComments((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, isPinned: newPinned } : c
      )
      return [...updated].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    })
    startTransition(async () => {
      const res = await togglePinComment(id, newPinned)
      if (!res.success) {
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isPinned: currentPinned } : c))
        )
        toast.error(res.error ?? "Failed to update pin")
      } else {
        toast.success(newPinned ? "Comment pinned" : "Comment unpinned")
      }
    })
  }, [])

  // ── Reply helpers ─────────────────────────────────────────────────────────

  const handleAddReply = useCallback(
    (parentId: string, reply: CollaborationCommentSerialized) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c
        )
      )
    },
    []
  )

  const handleDeleteReply = useCallback((parentId: string, replyId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: c.replies.filter((r) => r.id !== replyId) }
          : c
      )
    )
    startTransition(async () => {
      const res = await deleteEventComment(replyId)
      if (!res.success) {
        toast.error(res.error ?? "Failed to delete reply")
      }
    })
  }, [])

  const handleEditReply = useCallback(
    (parentId: string, replyId: string, newBody: string) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === replyId ? { ...r, body: newBody, isEdited: true } : r
                ),
              }
            : c
        )
      )
    },
    []
  )

  // ── Attachment helpers ────────────────────────────────────────────────────

  const handleAddAttachment = useCallback((commentId: string, attachment: CommentAttachmentSerialized) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, attachments: [...(c.attachments ?? []), attachment] }
          : c
      )
    )
  }, [])

  const handleRemoveAttachment = useCallback((commentId: string, attachmentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, attachments: (c.attachments ?? []).filter((a) => a.id !== attachmentId) }
          : c
      )
    )
  }, [])

  const charCount = body.length

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* ── Left: Feed ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Composer */}
        <div className="rounded-2xl border-2 border-primary/20 bg-white focus-within:border-primary/50 shadow-sm transition-colors p-4">
          <div className="flex gap-3">
            <Avatar email={currentEmail} name={currentMember?.name ?? null} />
            <div className="flex-1 min-w-0">
              <MentionTextarea
                value={body}
                onChange={setBody}
                placeholder="Write an update or ask a question…"
                teamMembers={teamMembers}
                rows={3}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="mt-2 pl-11">
              <AttachmentPreview
                attachments={pendingAttachments}
                onRemove={(id) => setPendingAttachments((prev) => prev.filter((a) => a.id !== id))}
                compact
              />
            </div>
          )}
          <div className="mt-3 flex items-center justify-between pl-11">
            <div className="flex items-center gap-3">
              {charCount > 200 && (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    charCount > 4800
                      ? "text-destructive font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {charCount} / 5000
                </span>
              )}
              <AttachmentUploader
                compact
                onUpload={(file) => {
                  const tempId = `pending-main-${Date.now()}`
                  setPendingAttachments((prev) => [
                    ...prev,
                    { id: tempId, url: file.url, name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes },
                  ])
                }}
              />
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                ⌘ + Enter to post
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isPending || !body.trim()}
              className="rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-primary/90 transition-colors shadow-sm"
            >
              {isPending ? "Posting…" : "Post"}
            </button>
          </div>
        </div>

        {/* Comment Feed */}
        {comments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white shadow-sm p-10 flex flex-col items-center gap-3 text-center">
            <div className="text-5xl select-none">💬</div>
            <div className="font-semibold text-lg">No updates yet</div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Start the conversation by posting an update, question, or note for your team.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                currentEmail={currentEmail}
                isAdmin={!!isAdmin}
                teamMembers={teamMembers}
                eventId={eventId}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onTogglePin={handleTogglePin}
                onAddReply={handleAddReply}
                onDeleteReply={handleDeleteReply}
                onEditReply={handleEditReply}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={handleRemoveAttachment}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right: Sidebar ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Team Members */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            Team ({teamMembers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="relative group"
                title={`${member.name ?? member.email}${
                  isRecentlyActive(member.lastActiveAt) ? " · Active now" : ""
                }`}
              >
                <Avatar email={member.email} name={member.name} size="sm" />
                {isRecentlyActive(member.lastActiveAt) && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
                )}
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10">
                  <div className="whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg">
                    {member.name ?? member.email}
                    {isRecentlyActive(member.lastActiveAt) && (
                      <span className="ml-1 text-green-400">· Active</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            Recent Activity
          </h3>
          {activity.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
          ) : (
            <ul className="space-y-2.5">
              {activity.map((item) => {
                const member = teamMembers.find((m) => m.email === item.actorEmail)
                const displayName = member?.name ?? item.actorEmail.split("@")[0]
                return (
                  <li key={item.id} className="flex items-start gap-2.5 text-xs">
                    <span className="mt-px text-sm leading-none shrink-0">
                      {activityIcon(item.action)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{displayName}</span>{" "}
                      <span className="text-muted-foreground">
                        {formatAction(item.action)}
                      </span>
                      {item.entityName && (
                        <span className="block truncate text-muted-foreground mt-0.5 italic">
                          &ldquo;{item.entityName}&rdquo;
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-muted-foreground whitespace-nowrap">
                      {timeAgo(item.createdAt)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Recent Files */}
        {resources.length > 0 && (
          <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Recent Files
              </h3>
              <a
                href={`/admin/planning/${eventId}/files`}
                className="text-xs text-primary hover:underline font-medium"
              >
                View all →
              </a>
            </div>
            <div className="space-y-2">
              {resources.map((file) => {
                const cat = (file.category ?? "").toLowerCase()
                const icon = cat.includes("image")
                  ? "🖼️"
                  : cat.includes("video")
                  ? "🎬"
                  : cat.includes("audio")
                  ? "🎵"
                  : "📄"
                return (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 hover:bg-muted/30 transition-colors group"
                  >
                    <span className="text-base leading-none shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                        {file.name}
                      </div>
                      {file.category && (
                        <div className="mt-0.5">
                          <span className="inline-block rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
                            {file.category}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {timeAgo(file.createdAt)}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
