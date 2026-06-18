"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import {
  Activity,
  ExternalLink,
  FileText,
  MessageSquare,
  Pin,
  PinOff,
  RefreshCw,
  Reply,
  Send,
  Trash2,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import {
  createEventComment,
  deleteEventComment,
  getEventCommentsAction,
  togglePinComment,
} from "@/actions/event-comments"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

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
  category: string
  uploadedBy: string
  createdAt: string
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
}

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function MentionText({ body }: { body: string }) {
  const parts = body.split(/(@[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("@") ? (
          <span key={`${part}-${index}`} className="font-semibold text-primary">
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  )
}

function MemberAvatar({ member }: { member: CollaborationMemberSerialized }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: member.avatarColor ?? "#c57a3a" }}
    >
      {initials(member.name, member.email)}
    </div>
  )
}

function CommentCard({
  comment,
  depth = 0,
  replyBody,
  isReplying,
  onReplyBodyChange,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onTogglePin,
  onDelete,
  disabled,
}: {
  comment: CollaborationCommentSerialized
  depth?: number
  replyBody: string
  isReplying: boolean
  onReplyBodyChange: (value: string) => void
  onStartReply: () => void
  onCancelReply: () => void
  onSubmitReply: () => void
  onTogglePin: () => void
  onDelete: () => void
  disabled: boolean
}) {
  return (
    <div className={cn("space-y-3", depth > 0 && "ml-8 border-l border-border pl-4")}>
      <Card className={cn("border border-border shadow-sm", comment.isPinned && "border-primary/30 bg-primary/5")}>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {initials(comment.authorName, comment.authorEmail)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold">
                  {comment.authorName ?? comment.authorEmail}
                </span>
                {comment.authorName && (
                  <span className="truncate text-xs text-muted-foreground">{comment.authorEmail}</span>
                )}
                {comment.isPinned && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {timeAgo(comment.createdAt)}
                {comment.isEdited ? " · edited" : ""}
              </div>
            </div>
            {depth === 0 && (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onTogglePin}
                  disabled={disabled}
                  title={comment.isPinned ? "Unpin" : "Pin"}
                >
                  {comment.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={onDelete}
                  disabled={disabled}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            <MentionText body={comment.body} />
          </p>

          {depth === 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs"
                onClick={onStartReply}
                disabled={disabled}
              >
                <Reply className="h-3.5 w-3.5" />
                Reply
              </Button>
            </div>
          )}

          {isReplying && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              <Textarea
                value={replyBody}
                onChange={(event) => onReplyBodyChange(event.target.value)}
                rows={3}
                placeholder="Write a reply..."
                disabled={disabled}
                className="resize-none bg-background"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCancelReply} disabled={disabled}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={onSubmitReply} disabled={disabled || !replyBody.trim()}>
                  Reply
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {comment.replies.map((reply) => (
        <CommentCard
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          replyBody={replyBody}
          isReplying={isReplying && false}
          onReplyBodyChange={onReplyBodyChange}
          onStartReply={onStartReply}
          onCancelReply={onCancelReply}
          onSubmitReply={onSubmitReply}
          onTogglePin={() => undefined}
          onDelete={() => undefined}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

export function CollaborationClient({
  eventId,
  eventTitle,
  currentEmail,
  initialComments,
  teamMembers,
  activity,
  resources,
}: {
  eventId: string
  eventTitle: string
  currentEmail: string
  initialComments: CollaborationCommentSerialized[]
  teamMembers: CollaborationMemberSerialized[]
  activity: CollaborationActivitySerialized[]
  resources: CollaborationResourceSerialized[]
}) {
  const [comments, setComments] = useState(initialComments)
  const [body, setBody] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const currentMember = useMemo(
    () => teamMembers.find((member) => member.email === currentEmail),
    [currentEmail, teamMembers],
  )

  const refreshComments = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const result = await getEventCommentsAction(eventId)
      if (result.success) {
        setComments(result.data as CollaborationCommentSerialized[])
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [eventId])

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  function insertMention(email: string) {
    setBody((value) => `${value}${value.endsWith(" ") || value.length === 0 ? "" : " "}@${email} `)
  }

  function submitComment(parentId?: string) {
    const text = parentId ? replyBody.trim() : body.trim()
    if (!text) return

    startTransition(async () => {
      const result = await createEventComment({
        eventId,
        body: text,
        parentId,
      })

      if (!result.success) {
        toast.error(result.error ?? "Failed to post comment.")
        return
      }

      if (parentId) {
        setReplyBody("")
        setReplyingTo(null)
      } else {
        setBody("")
      }
      await refreshComments()
      toast.success(parentId ? "Reply posted." : "Comment posted.")
    })
  }

  function pinComment(comment: CollaborationCommentSerialized) {
    startTransition(async () => {
      const result = await togglePinComment(comment.id, !comment.isPinned)
      if (!result.success) {
        toast.error(result.error ?? "Failed to update comment.")
        return
      }
      await refreshComments()
    })
  }

  function removeComment(comment: CollaborationCommentSerialized) {
    startTransition(async () => {
      const result = await deleteEventComment(comment.id)
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete comment.")
        return
      }
      await refreshComments()
      toast.success("Comment deleted.")
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card className="border border-border shadow-md">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Discussion</div>
                <h2 className="mt-1 font-serif text-2xl font-bold">{eventTitle}</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void refreshComments()}
                disabled={isRefreshing || isPending}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>

            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              placeholder="Post an update, question, or decision..."
              className="resize-none bg-background"
              disabled={isPending}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {teamMembers.slice(0, 5).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => insertMention(member.email)}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    @{member.email.split("@")[0]}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                onClick={() => submitComment()}
                disabled={isPending || !body.trim()}
                className="gap-2 bg-primary text-primary-foreground hover:bg-accent"
              >
                <Send className="h-4 w-4" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background/70 px-6 py-14 text-center">
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-serif text-lg font-bold text-muted-foreground">No discussion yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                replyBody={replyBody}
                isReplying={replyingTo === comment.id}
                onReplyBodyChange={setReplyBody}
                onStartReply={() => {
                  setReplyingTo(comment.id)
                  setReplyBody("")
                }}
                onCancelReply={() => {
                  setReplyingTo(null)
                  setReplyBody("")
                }}
                onSubmitReply={() => submitComment(comment.id)}
                onTogglePin={() => pinComment(comment)}
                onDelete={() => removeComment(comment)}
                disabled={isPending}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <Card className="border border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Users className="h-4 w-4 text-primary" />
              Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentMember && (
              <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
                Signed in as {currentMember.name ?? currentMember.email}
              </div>
            )}
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <MemberAvatar member={member} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{member.name ?? member.email}</div>
                  <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                </div>
                <div className="text-right">
                  <Badge variant={member.status === "ACTIVE" ? "secondary" : "outline"} className="text-[10px]">
                    {member.role.replace("_", " ")}
                  </Badge>
                  <div className="mt-1 text-[10px] text-muted-foreground">{timeAgo(member.lastActiveAt)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between font-serif text-lg">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Resources
              </span>
              <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                <Link href={`/admin/planning/${eventId}/files`}>View All</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No resources yet.</p>
            ) : (
              resources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:border-primary/30"
                >
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{resource.name}</div>
                    <div className="text-xs text-muted-foreground">{resource.category.replace("_", " ")}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Activity className="h-4 w-4 text-primary" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((item) => (
                  <li key={item.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="text-sm font-medium">{formatAction(item.action)}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {item.actorEmail} · {timeAgo(item.createdAt)}
                    </div>
                    {item.entityName && (
                      <div className="mt-1 truncate text-xs text-muted-foreground/80">{item.entityName}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
