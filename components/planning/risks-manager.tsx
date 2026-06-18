"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type {
  RiskSerialized,
  RiskSeverity,
  RiskProbability,
  RiskStatus,
} from "@/lib/planning/types"
import { createRisk, updateRiskStatus, deleteRisk } from "@/actions/planning"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { AlertOctagon, AlertTriangle, Plus, Shield, Trash2 } from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityBadge(severity: RiskSeverity): { label: string; className: string } {
  switch (severity) {
    case "LOW":
      return { label: "Low", className: "bg-green-100 text-green-700 border-green-300" }
    case "MEDIUM":
      return { label: "Medium", className: "bg-yellow-100 text-yellow-700 border-yellow-300" }
    case "HIGH":
      return { label: "High", className: "bg-orange-100 text-orange-700 border-orange-300" }
    case "CRITICAL":
      return { label: "Critical", className: "bg-red-100 text-red-700 border-red-300" }
  }
}

function probabilityBadge(prob: RiskProbability): { label: string; className: string } {
  switch (prob) {
    case "UNLIKELY":
      return { label: "Unlikely", className: "bg-gray-100 text-gray-600 border-gray-300" }
    case "POSSIBLE":
      return { label: "Possible", className: "bg-blue-100 text-blue-600 border-blue-300" }
    case "LIKELY":
      return { label: "Likely", className: "bg-orange-100 text-orange-600 border-orange-300" }
    case "ALMOST_CERTAIN":
      return { label: "Almost Certain", className: "bg-red-100 text-red-700 border-red-300" }
  }
}

function statusBadge(status: RiskStatus): { label: string; className: string } {
  switch (status) {
    case "OPEN":
      return { label: "Open", className: "bg-red-100 text-red-700 border-red-300" }
    case "MITIGATED":
      return { label: "Mitigated", className: "bg-blue-100 text-blue-700 border-blue-300" }
    case "RESOLVED":
      return { label: "Resolved", className: "bg-green-100 text-green-700 border-green-300" }
    case "ACCEPTED":
      return { label: "Accepted", className: "bg-gray-100 text-gray-500 border-gray-300" }
  }
}

type FormState = {
  title: string
  description: string
  category: string
  severity: RiskSeverity
  probability: RiskProbability
  mitigationPlan: string
  assignedTo: string
}

const emptyForm: FormState = {
  title: "",
  description: "",
  category: "",
  severity: "MEDIUM",
  probability: "POSSIBLE",
  mitigationPlan: "",
  assignedTo: "",
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RisksClientProps {
  eventId: string
  initialRisks: RiskSerialized[]
}

export function RisksClient({ eventId, initialRisks }: RisksClientProps) {
  const router = useRouter()
  const [risks, setRisks] = useState<RiskSerialized[]>(initialRisks)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Derived counts
  const openCount = risks.filter((r) => r.status === "OPEN").length
  const mitigatedCount = risks.filter((r) => r.status === "MITIGATED").length
  const criticalCount = risks.filter((r) => r.severity === "CRITICAL").length
  const highCount = risks.filter((r) => r.severity === "HIGH").length

  async function handleAdd() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await createRisk(eventId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        severity: form.severity,
        probability: form.probability,
        mitigationPlan: form.mitigationPlan.trim() || undefined,
        assignedTo: form.assignedTo.trim() || undefined,
      })
      setDialogOpen(false)
      setForm(emptyForm)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(riskId: string, status: RiskStatus) {
    setRisks((prev) =>
      prev.map((r) => (r.id === riskId ? { ...r, status } : r))
    )
    await updateRiskStatus(riskId, status)
    router.refresh()
  }

  async function handleDelete(riskId: string) {
    setDeletingId(riskId)
    try {
      await deleteRisk(riskId)
      setRisks((prev) => prev.filter((r) => r.id !== riskId))
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#c57a3a]">Risk Register</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage event risks to stay ahead of issues.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-[#c57a3a] text-white hover:bg-[#b06a2a]"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Risk
        </Button>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
            <AlertOctagon className="h-6 w-6 text-red-500" />
            <span className="text-2xl font-bold text-red-600">{openCount}</span>
            <span className="text-xs text-red-500">Open</span>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
            <Shield className="h-6 w-6 text-blue-500" />
            <span className="text-2xl font-bold text-blue-600">{mitigatedCount}</span>
            <span className="text-xs text-blue-500">Mitigated</span>
          </CardContent>
        </Card>
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
            <AlertOctagon className="h-6 w-6 text-red-600" />
            <span className="text-2xl font-bold text-red-700">{criticalCount}</span>
            <span className="text-xs text-red-600">Critical</span>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <span className="text-2xl font-bold text-orange-600">{highCount}</span>
            <span className="text-xs text-orange-500">High</span>
          </CardContent>
        </Card>
      </div>

      {/* Risk list */}
      {risks.length === 0 ? (
        <Card className="border-dashed border-[#c57a3a]/30 bg-white/60">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Shield className="h-8 w-8 text-[#c57a3a]/40" />
            <p className="text-sm text-gray-500">No risks logged yet. Add one to start tracking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {risks.map((risk) => {
            const sev = severityBadge(risk.severity)
            const prob = probabilityBadge(risk.probability)
            const stat = statusBadge(risk.status)
            return (
              <Card
                key={risk.id}
                className={cn(
                  "border border-[#c57a3a]/20 bg-white/80 shadow-sm transition-shadow hover:shadow-md",
                  risk.status === "RESOLVED" && "opacity-70"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{risk.title}</h3>
                        <Badge className={cn("border text-xs", sev.className)}>{sev.label}</Badge>
                        <Badge className={cn("border text-xs", prob.className)}>{prob.label}</Badge>
                        <Badge className={cn("border text-xs", stat.className)}>{stat.label}</Badge>
                      </div>

                      {risk.category && (
                        <span className="inline-block rounded-full bg-[#c57a3a]/10 px-2 py-0.5 text-xs text-[#c57a3a]">
                          {risk.category}
                        </span>
                      )}

                      {risk.description && (
                        <p className="text-sm text-gray-600">{risk.description}</p>
                      )}

                      {risk.mitigationPlan && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium text-gray-600">Mitigation: </span>
                          {risk.mitigationPlan.length > 140
                            ? risk.mitigationPlan.slice(0, 140) + "…"
                            : risk.mitigationPlan}
                        </p>
                      )}

                      {risk.assignedTo && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Assigned:</span> {risk.assignedTo}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-wrap gap-1">
                      {risk.status !== "MITIGATED" && risk.status !== "RESOLVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-blue-300 px-2 text-xs text-blue-600 hover:bg-blue-50"
                          onClick={() => handleStatusChange(risk.id, "MITIGATED")}
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          Mitigate
                        </Button>
                      )}
                      {risk.status !== "RESOLVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-green-300 px-2 text-xs text-green-600 hover:bg-green-50"
                          onClick={() => handleStatusChange(risk.id, "RESOLVED")}
                        >
                          Resolve
                        </Button>
                      )}
                      {risk.status !== "ACCEPTED" && risk.status !== "RESOLVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-gray-300 px-2 text-xs text-gray-500 hover:bg-gray-50"
                          onClick={() => handleStatusChange(risk.id, "ACCEPTED")}
                        >
                          Accept
                        </Button>
                      )}
                      {risk.status === "RESOLVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-red-300 px-2 text-xs text-red-500 hover:bg-red-50"
                          onClick={() => handleStatusChange(risk.id, "OPEN")}
                        >
                          Reopen
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-400 hover:text-red-500"
                        disabled={deletingId === risk.id}
                        onClick={() => handleDelete(risk.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Risk Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-[#F7EDDB]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#c57a3a]">Add Risk</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Venue cancellation"
                value={form.title}
                onChange={(e) => handleField("title", e.target.value)}
                className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Description</Label>
              <Textarea
                placeholder="Describe the risk…"
                value={form.description}
                onChange={(e) => handleField("description", e.target.value)}
                rows={2}
                className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Category</Label>
                <Input
                  placeholder="Logistics"
                  value={form.category}
                  onChange={(e) => handleField("category", e.target.value)}
                  className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Assigned To</Label>
                <Input
                  placeholder="jane@example.com"
                  value={form.assignedTo}
                  onChange={(e) => handleField("assignedTo", e.target.value)}
                  className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Severity</Label>
                <select
                  value={form.severity}
                  onChange={(e) => handleField("severity", e.target.value as RiskSeverity)}
                  className="w-full rounded-md border border-[#c57a3a]/30 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c57a3a]/40"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Probability</Label>
                <select
                  value={form.probability}
                  onChange={(e) => handleField("probability", e.target.value as RiskProbability)}
                  className="w-full rounded-md border border-[#c57a3a]/30 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c57a3a]/40"
                >
                  <option value="UNLIKELY">Unlikely</option>
                  <option value="POSSIBLE">Possible</option>
                  <option value="LIKELY">Likely</option>
                  <option value="ALMOST_CERTAIN">Almost Certain</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Mitigation Plan</Label>
              <Textarea
                placeholder="How will you address this risk?…"
                value={form.mitigationPlan}
                onChange={(e) => handleField("mitigationPlan", e.target.value)}
                rows={3}
                className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                setForm(emptyForm)
              }}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              disabled={saving || !form.title.trim()}
              onClick={handleAdd}
              className="bg-[#c57a3a] text-white hover:bg-[#b06a2a]"
            >
              {saving ? "Saving…" : "Add Risk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
