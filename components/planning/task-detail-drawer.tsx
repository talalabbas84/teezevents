"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { PlanningTaskSerialized, TaskStatus, TaskPriority, TaskCommentSerialized } from "@/lib/planning/types"
import {
  MultiAssigneeSelect,
  areValidAssignees,
  type TeamMemberOption,
} from "@/components/planning/assignee-select"
import {
  addTaskComment,
  getTaskCommentsAction,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from "@/actions/planning"
import {
  addTaskAttachment,
  removeTaskAttachment,
  getTaskAttachmentsAction,
} from "@/actions/attachments"
import { AttachmentUploader } from "@/components/planning/attachment-uploader"
import { AttachmentPreview, type AttachmentItem } from "@/components/planning/attachment-preview"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { AlertCircle, Clock, User, Tag, CalendarDays, Trash2, MessageCircle, Paperclip } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  task: PlanningTaskSerialized | null
  eventId: string
  session: { email: string }
  assignees: TeamMemberOption[]
  onClose: () => void
}

type AssignmentFormErrors = Partial<Record<"assigneeEmails" | "dueDate", string>>

// ─── Display maps ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  NEEDS_REVIEW: "Needs Review",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

const STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700 border-gray-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  BLOCKED: "bg-red-100 text-red-700 border-red-200",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-700 border-yellow-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-400 border-gray-200",
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

const PRIORITY_BADGE_CLASSES: Record<TaskPriority, string> = {
  LOW: "bg-gray-100 text-gray-500 border-gray-200",
  MEDIUM: "bg-blue-100 text-blue-600 border-blue-200",
  HIGH: "bg-orange-100 text-orange-600 border-orange-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
}

const ALL_STATUSES: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "NEEDS_REVIEW",
  "COMPLETED",
  "CANCELLED",
]

const ALL_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"]

// ─── Avatar helper ────────────────────────────────────────────────────────────

function getInitials(email: string) {
  const local = email.split("@")[0] ?? email
  const parts = local.split(/[._-]/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}

function formatRelativeTime(isoString: string) {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getDateTimeInputMin() {
  const now = new Date()
  now.setSeconds(0, 0)
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function toDateTimeLocalValue(isoString: string | null) {
  if (!isoString) return ""
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function isValidDateTimeInput(value: string) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()))
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskDetailDrawer({ task, eventId, session, assignees, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [comments, setComments] = useState<TaskCommentSerialized[]>([])
  const [commentBody, setCommentBody] = useState("")
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [assignmentForm, setAssignmentForm] = useState({ assigneeEmails: [] as string[], dueDate: "" })
  const [assignmentErrors, setAssignmentErrors] = useState<AssignmentFormErrors>({})
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const [isAttachmentPending, startAttachmentTransition] = useTransition()

  // Fetch comments whenever the selected task changes
  useEffect(() => {
    if (!task) {
      setComments([])
      setCommentBody("")
      setAssignmentForm({ assigneeEmails: [], dueDate: "" })
      setAssignmentErrors({})
      setAttachments([])
      return
    }
    setAssignmentForm({
      assigneeEmails: task.assigneeEmails.length > 0 ? task.assigneeEmails : task.assignedTo ? [task.assignedTo] : [],
      dueDate: toDateTimeLocalValue(task.dueDate),
    })
    setAssignmentErrors({})
    getTaskCommentsAction(task.id).then((res) => {
      if (res.success) {
        setComments(res.data)
      }
    })
    getTaskAttachmentsAction(task.id).then((res) => {
      if (res.success) {
        setAttachments(res.data)
      }
    })
  }, [task?.id])

  // ─── Handlers ───────────────────────────────────────────────────────

  function handleStatusChange(status: TaskStatus) {
    if (!task) return
    startTransition(async () => {
      const res = await updateTaskStatus(task.id, status)
      if (res.success) {
        toast.success("Status updated")
        router.refresh()
      } else {
        toast.error(res.error ?? "Failed to update status")
      }
    })
  }

  function handlePriorityChange(priority: TaskPriority) {
    if (!task) return
    startTransition(async () => {
      const res = await updateTask(task.id, { priority })
      if (res.success) {
        toast.success("Priority updated")
        router.refresh()
      } else {
        toast.error(res.error ?? "Failed to update priority")
      }
    })
  }

  async function handlePostComment() {
    if (!task || !commentBody.trim()) return
    setIsPostingComment(true)
    try {
      const res = await addTaskComment(task.id, commentBody.trim(), session.email)
      if (res.success) {
        setCommentBody("")
        // Re-fetch to get the new comment
        const refreshed = await getTaskCommentsAction(task.id)
        if (refreshed.success) setComments(refreshed.data)
        toast.success("Comment posted")
      } else {
        toast.error(res.error ?? "Failed to post comment")
      }
    } finally {
      setIsPostingComment(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    setIsDeleting(true)
    try {
      const res = await deleteTask(task.id)
      if (res.success) {
        toast.success("Task deleted")
        onClose()
        router.refresh()
      } else {
        toast.error(res.error ?? "Failed to delete task")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleSaveAssignment() {
    if (!task) return

    const nextErrors: AssignmentFormErrors = {}
    if (!areValidAssignees(assignmentForm.assigneeEmails, assignees)) {
      nextErrors.assigneeEmails = "Select collaborators from the team list."
    }
    if (assignmentForm.dueDate) {
      if (!isValidDateTimeInput(assignmentForm.dueDate)) {
        nextErrors.dueDate = "Enter a valid due date and time."
      } else if (new Date(assignmentForm.dueDate).getTime() < Date.now() - 60_000) {
        nextErrors.dueDate = "Due date and time cannot be in the past."
      }
    }

    setAssignmentErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSavingAssignment(true)
    try {
      const res = await updateTask(task.id, {
        assigneeEmails: assignmentForm.assigneeEmails,
        dueDate: assignmentForm.dueDate ? new Date(assignmentForm.dueDate) : null,
      })
      if (res.success) {
        toast.success("Assignment updated")
        router.refresh()
      } else {
        toast.error(res.error ?? "Failed to update assignment")
      }
    } finally {
      setIsSavingAssignment(false)
    }
  }

  // ─── Attachment handlers ─────────────────────────────────────────────

  function handleAttachmentUpload(file: { url: string; name: string; mimeType: string; sizeBytes: number }) {
    if (!task) return
    // Optimistic: add a temp item
    const tempId = `temp-attach-${Date.now()}`
    const optimistic: AttachmentItem = { id: tempId, url: file.url, name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes }
    setAttachments((prev) => [...prev, optimistic])
    startAttachmentTransition(async () => {
      const res = await addTaskAttachment(task.id, file)
      if (res.success && res.data) {
        setAttachments((prev) => prev.map((a) => a.id === tempId ? res.data as AttachmentItem : a))
        toast.success("Attachment added")
      } else {
        setAttachments((prev) => prev.filter((a) => a.id !== tempId))
        toast.error(res.error ?? "Failed to save attachment")
      }
    })
  }

  function handleAttachmentRemove(attachmentId: string) {
    if (!task) return
    const snapshot = attachments.find((a) => a.id === attachmentId)
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
    startAttachmentTransition(async () => {
      const res = await removeTaskAttachment(attachmentId, task.id)
      if (!res.success) {
        if (snapshot) setAttachments((prev) => [...prev, snapshot])
        toast.error(res.error ?? "Failed to remove attachment")
      } else {
        toast.success("Attachment removed")
      }
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <Sheet open={task !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col gap-0 p-0 bg-[#F7EDDB] overflow-y-auto"
      >
        {task && (
          <>
            {/* Header */}
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
              <div className="flex items-start gap-3">
                <SheetTitle className="flex-1 font-serif text-xl font-bold text-[#c57a3a] leading-snug">
                  {task.title}
                </SheetTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[task.status]}`}
                >
                  {STATUS_LABELS[task.status]}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASSES[task.priority]}`}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>
              </div>
            </SheetHeader>

            <div className="flex-1 px-6 py-5 space-y-6">
              {/* Description */}
              {task.description && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Description
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Meta */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {task.dueDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 shrink-0 text-[#c57a3a]" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
                {(task.assigneeEmails.length > 0 ? task.assigneeEmails : task.assignedTo ? [task.assignedTo] : []).length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4 shrink-0 text-[#c57a3a]" />
                    <span className="truncate">
                      {(task.assigneeEmails.length > 0 ? task.assigneeEmails : task.assignedTo ? [task.assignedTo] : []).join(", ")}
                    </span>
                  </div>
                )}
                {task.category && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="h-4 w-4 shrink-0 text-[#c57a3a]" />
                    <span>{task.category}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0 text-[#c57a3a]" />
                  <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* Inline status / priority changers */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Update
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Select
                      value={task.status}
                      onValueChange={(v) => handleStatusChange(v as TaskStatus)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-9 text-sm bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <Select
                      value={task.priority}
                      onValueChange={(v) => handlePriorityChange(v as TaskPriority)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-9 text-sm bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_LABELS[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Assignment &amp; Schedule
                </p>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Collaborators</Label>
                    <MultiAssigneeSelect
                      value={assignmentForm.assigneeEmails}
                      members={assignees}
                      onChange={(value) => {
                        setAssignmentForm((form) => ({ ...form, assigneeEmails: value }))
                        setAssignmentErrors((errors) => ({ ...errors, assigneeEmails: undefined }))
                      }}
                      disabled={isSavingAssignment}
                    />
                    <FieldError message={assignmentErrors.assigneeEmails} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="task-detail-due" className="text-xs text-muted-foreground">
                      Due Date &amp; Time
                    </Label>
                    <Input
                      id="task-detail-due"
                      type="datetime-local"
                      min={getDateTimeInputMin()}
                      value={assignmentForm.dueDate}
                      onChange={(event) => {
                        setAssignmentForm((form) => ({ ...form, dueDate: event.target.value }))
                        setAssignmentErrors((errors) => ({ ...errors, dueDate: undefined }))
                      }}
                      aria-invalid={Boolean(assignmentErrors.dueDate)}
                      className="bg-white text-sm"
                      disabled={isSavingAssignment}
                    />
                    <FieldError message={assignmentErrors.dueDate} />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => void handleSaveAssignment()}
                      disabled={isSavingAssignment}
                      className="bg-[#c57a3a] text-white hover:bg-[#b06830]"
                    >
                      {isSavingAssignment ? "Saving..." : "Save Assignment"}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* Comments section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#c57a3a]" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Comments ({comments.length})
                  </p>
                </div>

                {/* Comment list */}
                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        {/* Avatar */}
                        <div className="shrink-0 h-8 w-8 rounded-full bg-[#c57a3a]/20 flex items-center justify-center text-[#c57a3a] text-xs font-bold">
                          {getInitials(comment.authorEmail)}
                        </div>
                        {/* Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {comment.authorEmail}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No comments yet.</p>
                )}

                {/* Add comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write a comment..."
                    rows={3}
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    className="bg-white text-sm resize-none"
                    disabled={isPostingComment}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        void handlePostComment()
                      }
                    }}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => void handlePostComment()}
                      disabled={isPostingComment || !commentBody.trim()}
                      className="bg-[#c57a3a] hover:bg-[#b06830] text-white"
                    >
                      {isPostingComment ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* Attachments section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-[#c57a3a]" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Attachments ({attachments.length})
                  </p>
                </div>
                {attachments.length > 0 && (
                  <AttachmentPreview
                    attachments={attachments}
                    onRemove={handleAttachmentRemove}
                  />
                )}
                <AttachmentUploader
                  onUpload={handleAttachmentUpload}
                  disabled={isAttachmentPending}
                />
              </div>
            </div>

            {/* Footer — delete */}
            <div className="px-6 py-4 border-t border-border/40 bg-white/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={isDeleting || isPending}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete Task"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
