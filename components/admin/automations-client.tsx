"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Zap,
  Plus,
  Pencil,
  Trash2,
  Play,
  Clock,
} from "lucide-react"
import { toast } from "sonner"

import {
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
} from "@/actions/automations"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type AutomationRuleSerialized = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  trigger: string
  triggerValue: string | null
  action: string
  actionPayload: unknown
  eventId: string | null
  daysBeforeEvent: number | null
  lastRunAt: string | null
  runCount: number
  createdAt: string
}

type Props = {
  rules: AutomationRuleSerialized[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTOMATION_TRIGGERS = [
  "EVENT_CREATED",
  "EVENT_STATUS_CHANGED",
  "BLUEPRINT_APPLIED",
  "TASK_OVERDUE",
  "TASK_COMPLETED",
  "VENDOR_NOT_CONFIRMED",
  "BUDGET_LIMIT_EXCEEDED",
  "EVENT_DAYS_BEFORE",
  "CHECKLIST_COMPLETED",
  "EVENT_COMPLETED",
] as const

const AUTOMATION_ACTIONS = [
  "CREATE_TASK",
  "SEND_NOTIFICATION",
  "SEND_EMAIL",
  "UPDATE_STATUS",
  "CREATE_CHECKLIST",
  "ADD_COMMENT",
] as const

const TRIGGER_LABELS: Record<string, string> = {
  EVENT_CREATED: "Event Created",
  EVENT_STATUS_CHANGED: "Status Changed",
  BLUEPRINT_APPLIED: "Blueprint Applied",
  TASK_OVERDUE: "Task Overdue",
  TASK_COMPLETED: "Task Completed",
  VENDOR_NOT_CONFIRMED: "Vendor Not Confirmed",
  BUDGET_LIMIT_EXCEEDED: "Budget Limit Exceeded",
  EVENT_DAYS_BEFORE: "N Days Before Event",
  CHECKLIST_COMPLETED: "Checklist Completed",
  EVENT_COMPLETED: "Event Completed",
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_TASK: "Create Task",
  SEND_NOTIFICATION: "Send Notification",
  SEND_EMAIL: "Send Email",
  UPDATE_STATUS: "Update Status",
  CREATE_CHECKLIST: "Create Checklist",
  ADD_COMMENT: "Add Comment",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const TRIGGER_NEEDS_VALUE = new Set(["EVENT_STATUS_CHANGED", "EVENT_DAYS_BEFORE"])

// ─── Form State ───────────────────────────────────────────────────────────────

type FormState = {
  name: string
  description: string
  trigger: string
  triggerValue: string
  action: string
  actionPayload: string
  daysBeforeEvent: string
  isActive: boolean
}

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  trigger: "",
  triggerValue: "",
  action: "",
  actionPayload: "",
  daysBeforeEvent: "",
  isActive: true,
}

function ruleToForm(rule: AutomationRuleSerialized): FormState {
  return {
    name: rule.name,
    description: rule.description ?? "",
    trigger: rule.trigger,
    triggerValue: rule.triggerValue ?? "",
    action: rule.action,
    actionPayload: rule.actionPayload ? JSON.stringify(rule.actionPayload, null, 2) : "",
    daysBeforeEvent: rule.daysBeforeEvent != null ? String(rule.daysBeforeEvent) : "",
    isActive: rule.isActive,
  }
}

// ─── Rule Dialog ─────────────────────────────────────────────────────────────

function RuleDialog({
  open,
  onClose,
  editRule,
}: {
  open: boolean
  onClose: () => void
  editRule: AutomationRuleSerialized | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>(() =>
    editRule ? ruleToForm(editRule) : DEFAULT_FORM,
  )
  const [formError, setFormError] = useState<string | null>(null)

  // Re-sync form when dialog opens/closes or editRule changes
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose()
    }
  }

  // Reset form when dialog opens
  useState(() => {
    if (open) {
      setForm(editRule ? ruleToForm(editRule) : DEFAULT_FORM)
      setFormError(null)
    }
  })

  const isEditing = editRule !== null

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const showTriggerValue = TRIGGER_NEEDS_VALUE.has(form.trigger) && form.trigger !== "EVENT_DAYS_BEFORE"
  const showDaysBefore = form.trigger === "EVENT_DAYS_BEFORE"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setFormError("Rule name is required.")
      return
    }
    if (!form.trigger) {
      setFormError("Please select a trigger.")
      return
    }
    if (!form.action) {
      setFormError("Please select an action.")
      return
    }
    if (showDaysBefore && !form.daysBeforeEvent) {
      setFormError("Days before event is required for this trigger.")
      return
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      trigger: form.trigger as (typeof AUTOMATION_TRIGGERS)[number],
      triggerValue: form.triggerValue.trim() || undefined,
      action: form.action as (typeof AUTOMATION_ACTIONS)[number],
      actionPayload: form.actionPayload.trim() || undefined,
      daysBeforeEvent: showDaysBefore && form.daysBeforeEvent ? Number(form.daysBeforeEvent) : undefined,
      isActive: form.isActive,
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateAutomationRule(editRule.id, payload)
        : await createAutomationRule(payload)

      if (result.success) {
        toast.success(isEditing ? "Rule updated." : "Rule created.")
        router.refresh()
        onClose()
      } else {
        setFormError(result.error ?? "Something went wrong.")
        toast.error(result.error ?? "Something went wrong.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEditing ? "Edit Automation Rule" : "New Automation Rule"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the rule configuration below."
              : "Configure a trigger and action to automate your workflow."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rule-name"
              placeholder="e.g. Notify team when task is overdue"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={100}
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-description">Description</Label>
            <Textarea
              id="rule-description"
              placeholder="Optional description of what this rule does"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              maxLength={500}
              disabled={isPending}
              className="resize-none"
            />
          </div>

          {/* Trigger */}
          <div className="space-y-1.5">
            <Label>
              Trigger <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.trigger}
              onValueChange={(v) => {
                set("trigger", v)
                set("triggerValue", "")
                set("daysBeforeEvent", "")
              }}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a trigger..." />
              </SelectTrigger>
              <SelectContent>
                {AUTOMATION_TRIGGERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRIGGER_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trigger Value (for STATUS_CHANGED) */}
          {showTriggerValue && (
            <div className="space-y-1.5">
              <Label htmlFor="trigger-value">Trigger Value</Label>
              <Input
                id="trigger-value"
                placeholder="e.g. CONFIRMED, CANCELLED"
                value={form.triggerValue}
                onChange={(e) => set("triggerValue", e.target.value)}
                maxLength={200}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Specify the exact status value to match.
              </p>
            </div>
          )}

          {/* Days Before Event */}
          {showDaysBefore && (
            <div className="space-y-1.5">
              <Label htmlFor="days-before">
                Days Before Event <span className="text-destructive">*</span>
              </Label>
              <Input
                id="days-before"
                type="number"
                min={1}
                max={365}
                placeholder="e.g. 7"
                value={form.daysBeforeEvent}
                onChange={(e) => set("daysBeforeEvent", e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                How many days before the event this trigger fires.
              </p>
            </div>
          )}

          {/* Action */}
          <div className="space-y-1.5">
            <Label>
              Action <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.action}
              onValueChange={(v) => set("action", v)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an action..." />
              </SelectTrigger>
              <SelectContent>
                {AUTOMATION_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Payload */}
          <div className="space-y-1.5">
            <Label htmlFor="action-payload">JSON Payload (optional)</Label>
            <Textarea
              id="action-payload"
              placeholder={'{\n  "subject": "Task overdue",\n  "body": "Please review."\n}'}
              value={form.actionPayload}
              onChange={(e) => set("actionPayload", e.target.value)}
              rows={3}
              disabled={isPending}
              className="resize-none font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Optional JSON configuration passed to the action handler.
            </p>
          </div>

          {/* Is Active */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Enable or disable this rule immediately.
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => set("isActive", v)}
              disabled={isPending}
            />
          </div>

          {/* Error */}
          {formError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onEdit,
  onDelete,
}: {
  rule: AutomationRuleSerialized
  onEdit: (rule: AutomationRuleSerialized) => void
  onDelete: (rule: AutomationRuleSerialized) => void
}) {
  const router = useRouter()
  const [isToggling, startToggle] = useTransition()

  function handleToggle(value: boolean) {
    startToggle(async () => {
      const result = await toggleAutomationRule(rule.id, value)
      if (result.success) {
        toast.success(value ? "Rule enabled." : "Rule disabled.")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to toggle rule.")
      }
    })
  }

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md",
        !rule.isActive && "opacity-60",
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F7EDDB]">
          <Zap size={17} className="text-primary" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* Name + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{rule.name}</span>
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
            </Badge>
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
              {ACTION_LABELS[rule.action] ?? rule.action}
            </Badge>
          </div>

          {/* Description */}
          {rule.description && (
            <p className="text-xs text-muted-foreground">{rule.description}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Play size={11} />
              Run {rule.runCount}x
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {rule.lastRunAt ? `Last ran ${timeAgo(rule.lastRunAt)}` : "Never run"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Active toggle */}
          <Switch
            checked={rule.isActive}
            onCheckedChange={handleToggle}
            disabled={isToggling}
            aria-label={rule.isActive ? "Disable rule" : "Enable rule"}
          />

          {/* Edit */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(rule)}
            aria-label="Edit rule"
          >
            <Pencil size={14} />
          </Button>

          {/* Delete */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(rule)}
            aria-label="Delete rule"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7EDDB]">
        <Zap size={30} className="text-primary" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-foreground">No automation rules yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Automations run automatically based on triggers. Create your first rule to get started.
      </p>
      <Button
        className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={onCreate}
      >
        <Plus size={16} className="mr-2" />
        Create Rule
      </Button>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function AutomationsClient({ rules }: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRuleSerialized | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AutomationRuleSerialized | null>(null)
  const [isDeleting, startDelete] = useTransition()

  function handleOpenCreate() {
    setEditingRule(null)
    setDialogOpen(true)
  }

  function handleOpenEdit(rule: AutomationRuleSerialized) {
    setEditingRule(rule)
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingRule(null)
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    startDelete(async () => {
      const result = await deleteAutomationRule(deleteTarget.id)
      if (result.success) {
        toast.success("Rule deleted.")
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to delete rule.")
      }
      setDeleteTarget(null)
    })
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Automation Rules</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rules.length === 0
              ? "No rules configured"
              : `${rules.length} rule${rules.length === 1 ? "" : "s"} — ${rules.filter((r) => r.isActive).length} active`}
          </p>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleOpenCreate}
        >
          <Plus size={16} className="mr-2" />
          New Rule
        </Button>
      </div>

      {/* Rules list / Empty state */}
      {rules.length === 0 ? (
        <EmptyState onCreate={handleOpenCreate} />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={handleOpenEdit}
              onDelete={(r) => setDeleteTarget(r)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <RuleDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        editRule={editingRule}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
