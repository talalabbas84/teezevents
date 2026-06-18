"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { BudgetItemSerialized } from "@/lib/planning/types"
import { upsertPostEventReview, markReviewSavedToBlueprint } from "@/actions/post-event"
import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

import {
  Star,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PostEventReviewData = {
  id: string
  eventId: string
  actualAttendance: number | null
  actualRevenueCents: number | null
  teamFeedback: string | null
  whatWentWell: string | null
  whatWentWrong: string | null
  lessonsLearned: string | null
  improvementNotes: string | null
  overallRating: number | null
  savedToBlueprint: boolean
  createdAt: string
  updatedAt: string
}

type EventInfo = {
  title: string
  capacity: number
  ticketPriceCents: number
  startsAt: string | null
}

interface PostEventClientProps {
  eventId: string
  event: EventInfo | null
  review: PostEventReviewData | null
  budgetItems: BudgetItemSerialized[]
  vendorCount?: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCAD(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function parseCentsFromInput(value: string): number | undefined {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""))
  if (isNaN(num)) return undefined
  return Math.round(num * 100)
}

// ─── Star Rating ───────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readonly,
}: {
  value: number | null
  onChange?: (v: number) => void
  readonly?: boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovered !== null ? star <= hovered : star <= (value ?? 0)
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              "transition-colors",
              readonly ? "cursor-default" : "cursor-pointer"
            )}
            aria-label={`Rate ${star} out of 5`}
          >
            <Star
              className={cn(
                "h-7 w-7",
                filled
                  ? "fill-[#c57a3a] text-[#c57a3a]"
                  : "fill-none text-stone-400"
              )}
            />
          </button>
        )
      })}
      {value !== null && (
        <span className="ml-2 self-center text-sm text-stone-600">
          {value}/5
        </span>
      )}
    </div>
  )
}

// ─── Budget comparison helpers ─────────────────────────────────────────────────

function getBudgetTotals(budgetItems: BudgetItemSerialized[]) {
  let totalEstimated = 0
  let totalActual = 0
  for (const item of budgetItems) {
    totalEstimated += item.estimatedCents
    totalActual += item.actualCents
  }
  return { totalEstimated, totalActual }
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PostEventClient({
  eventId,
  event,
  review,
  budgetItems,
  vendorCount,
}: PostEventClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editMode, setEditMode] = useState(!review)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [blueprintPending, setBlueprintPending] = useState(false)

  // Form state seeded from existing review
  const [actualAttendance, setActualAttendance] = useState<string>(
    review?.actualAttendance != null ? String(review.actualAttendance) : ""
  )
  const [actualRevenueDollars, setActualRevenueDollars] = useState<string>(
    review?.actualRevenueCents != null
      ? (review.actualRevenueCents / 100).toFixed(2)
      : ""
  )
  const [overallRating, setOverallRating] = useState<number | null>(
    review?.overallRating ?? null
  )
  const [teamFeedback, setTeamFeedback] = useState(review?.teamFeedback ?? "")
  const [whatWentWell, setWhatWentWell] = useState(review?.whatWentWell ?? "")
  const [whatWentWrong, setWhatWentWrong] = useState(review?.whatWentWrong ?? "")
  const [lessonsLearned, setLessonsLearned] = useState(
    review?.lessonsLearned ?? ""
  )
  const [improvementNotes, setImprovementNotes] = useState(
    review?.improvementNotes ?? ""
  )

  // Derived
  const estimatedRevenueCents = event
    ? event.capacity * event.ticketPriceCents
    : null
  const { totalEstimated: budgetEstimated, totalActual: budgetActual } =
    getBudgetTotals(budgetItems)
  const budgetVariance = budgetActual - budgetEstimated
  const attendanceNum = parseInt(actualAttendance, 10)
  const attendanceRate =
    event && !isNaN(attendanceNum) && event.capacity > 0
      ? Math.round((attendanceNum / event.capacity) * 100)
      : null
  const actualRevenueCents = parseCentsFromInput(actualRevenueDollars)

  async function handleSave() {
    setSaveError(null)
    setSaveSuccess(false)

    startTransition(async () => {
      const result = await upsertPostEventReview(eventId, {
        actualAttendance: !isNaN(attendanceNum) ? attendanceNum : undefined,
        actualRevenueCents: actualRevenueCents,
        teamFeedback: teamFeedback || undefined,
        whatWentWell: whatWentWell || undefined,
        whatWentWrong: whatWentWrong || undefined,
        lessonsLearned: lessonsLearned || undefined,
        improvementNotes: improvementNotes || undefined,
        overallRating: overallRating ?? undefined,
      })

      if (result.success) {
        setSaveSuccess(true)
        setEditMode(false)
        router.refresh()
      } else {
        setSaveError(result.error ?? "Failed to save review.")
      }
    })
  }

  async function handleSaveToBlueprint() {
    setBlueprintPending(true)
    const result = await markReviewSavedToBlueprint(eventId)
    setBlueprintPending(false)
    if (result.success) {
      router.refresh()
    } else {
      setSaveError(result.error ?? "Failed to mark as blueprint.")
    }
  }

  const readonlyMode = !editMode && !!review

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            Post-Event Review
          </h1>
          {event && (
            <p className="mt-1 text-sm text-stone-600">{event.title}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {review?.savedToBlueprint && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Saved to Blueprint
            </Badge>
          )}
          {review && !review.savedToBlueprint && !editMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveToBlueprint}
              disabled={blueprintPending}
              className="border-[#c57a3a] text-[#c57a3a] hover:bg-[#c57a3a]/10"
            >
              {blueprintPending ? "Saving…" : "Save to Blueprint"}
            </Button>
          )}
          {review && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditMode((v) => !v)
                setSaveError(null)
                setSaveSuccess(false)
              }}
              className="border-stone-300"
            >
              {editMode ? "Cancel" : "Edit"}
            </Button>
          )}
        </div>
      </div>

      {saveError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Review saved successfully.
        </div>
      )}

      {/* 1. Attendance Summary */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <Users className="h-4 w-4 text-[#c57a3a]" />
            Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="actualAttendance" className="text-xs text-stone-600">
              Actual Attendance
            </Label>
            {readonlyMode ? (
              <p className="mt-1 text-lg font-semibold text-stone-900">
                {review?.actualAttendance ?? <span className="text-stone-400">—</span>}
              </p>
            ) : (
              <Input
                id="actualAttendance"
                type="number"
                min={0}
                value={actualAttendance}
                onChange={(e) => setActualAttendance(e.target.value)}
                placeholder="e.g. 250"
                className="mt-1"
              />
            )}
          </div>
          <div>
            <Label className="text-xs text-stone-600">Capacity</Label>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {event?.capacity ?? "—"}
            </p>
          </div>
          <div>
            <Label className="text-xs text-stone-600">Attendance Rate</Label>
            <p
              className={cn(
                "mt-1 text-lg font-semibold",
                attendanceRate !== null && attendanceRate >= 80
                  ? "text-emerald-600"
                  : attendanceRate !== null
                  ? "text-amber-600"
                  : "text-stone-400"
              )}
            >
              {attendanceRate !== null ? `${attendanceRate}%` : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Revenue Summary */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <DollarSign className="h-4 w-4 text-[#c57a3a]" />
            Revenue Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="actualRevenue" className="text-xs text-stone-600">
              Actual Revenue (CAD)
            </Label>
            {readonlyMode ? (
              <p className="mt-1 text-lg font-semibold text-stone-900">
                {review?.actualRevenueCents != null
                  ? formatCAD(review.actualRevenueCents)
                  : <span className="text-stone-400">—</span>}
              </p>
            ) : (
              <Input
                id="actualRevenue"
                type="number"
                min={0}
                step="0.01"
                value={actualRevenueDollars}
                onChange={(e) => setActualRevenueDollars(e.target.value)}
                placeholder="e.g. 12500.00"
                className="mt-1"
              />
            )}
          </div>
          <div>
            <Label className="text-xs text-stone-600">Estimated Revenue</Label>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {estimatedRevenueCents != null
                ? formatCAD(estimatedRevenueCents)
                : "—"}
            </p>
            {event && (
              <p className="text-xs text-stone-500">
                {event.capacity} × {formatCAD(event.ticketPriceCents)}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs text-stone-600">Variance</Label>
            {actualRevenueCents != null && estimatedRevenueCents != null ? (
              <div className="mt-1 flex items-center gap-1">
                {actualRevenueCents >= estimatedRevenueCents ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <p
                  className={cn(
                    "text-lg font-semibold",
                    actualRevenueCents >= estimatedRevenueCents
                      ? "text-emerald-600"
                      : "text-red-600"
                  )}
                >
                  {actualRevenueCents >= estimatedRevenueCents ? "+" : ""}
                  {formatCAD(actualRevenueCents - estimatedRevenueCents)}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-stone-400">—</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Budget Comparison */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            Budget Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          {budgetItems.length === 0 ? (
            <p className="text-sm text-stone-500">No budget items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="pb-2 text-left font-medium text-stone-600">Item</th>
                    <th className="pb-2 text-right font-medium text-stone-600">Estimated</th>
                    <th className="pb-2 text-right font-medium text-stone-600">Actual</th>
                    <th className="pb-2 text-right font-medium text-stone-600">Variance</th>
                    <th className="pb-2 text-center font-medium text-stone-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetItems.map((item) => {
                    const variance = item.actualCents - item.estimatedCents
                    return (
                      <tr key={item.id} className="border-b border-stone-100">
                        <td className="py-2 pr-4">
                          <p className="font-medium text-stone-800">{item.title}</p>
                          <p className="text-xs text-stone-500">{item.category}</p>
                        </td>
                        <td className="py-2 text-right text-stone-700">
                          {formatCAD(item.estimatedCents)}
                        </td>
                        <td className="py-2 text-right text-stone-700">
                          {formatCAD(item.actualCents)}
                        </td>
                        <td
                          className={cn(
                            "py-2 text-right font-medium",
                            variance > 0
                              ? "text-red-600"
                              : variance < 0
                              ? "text-emerald-600"
                              : "text-stone-500"
                          )}
                        >
                          {variance > 0 ? "+" : ""}
                          {formatCAD(variance)}
                        </td>
                        <td className="py-2 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              item.status === "PAID"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : item.status === "OVERDUE"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-stone-200 text-stone-600"
                            )}
                          >
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-300 font-semibold">
                    <td className="pt-2 text-stone-800">Total</td>
                    <td className="pt-2 text-right text-stone-800">
                      {formatCAD(budgetEstimated)}
                    </td>
                    <td className="pt-2 text-right text-stone-800">
                      {formatCAD(budgetActual)}
                    </td>
                    <td
                      className={cn(
                        "pt-2 text-right font-bold",
                        budgetVariance > 0
                          ? "text-red-600"
                          : budgetVariance < 0
                          ? "text-emerald-600"
                          : "text-stone-600"
                      )}
                    >
                      {budgetVariance > 0 ? "+" : ""}
                      {formatCAD(budgetVariance)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Overall Rating */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <Star className="h-4 w-4 text-[#c57a3a]" />
            Overall Rating
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StarRating
            value={overallRating}
            onChange={readonlyMode ? undefined : setOverallRating}
            readonly={readonlyMode}
          />
          {readonlyMode && overallRating === null && (
            <p className="text-sm text-stone-400">No rating given.</p>
          )}
        </CardContent>
      </Card>

      {/* 5. Team Feedback */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-stone-800">
            Team Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readonlyMode ? (
            <p className="whitespace-pre-wrap text-sm text-stone-700">
              {review?.teamFeedback || <span className="text-stone-400">No feedback recorded.</span>}
            </p>
          ) : (
            <Textarea
              value={teamFeedback}
              onChange={(e) => setTeamFeedback(e.target.value)}
              placeholder="General feedback from the team…"
              rows={4}
              className="resize-none"
            />
          )}
        </CardContent>
      </Card>

      {/* 6. What Went Well */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            What Went Well
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readonlyMode ? (
            <p className="whitespace-pre-wrap text-sm text-stone-700">
              {review?.whatWentWell || <span className="text-stone-400">Nothing recorded.</span>}
            </p>
          ) : (
            <Textarea
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              placeholder="Highlights and successes from the event…"
              rows={4}
              className="resize-none"
            />
          )}
        </CardContent>
      </Card>

      {/* 7. What Went Wrong */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <TrendingDown className="h-4 w-4 text-red-500" />
            What Went Wrong
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readonlyMode ? (
            <p className="whitespace-pre-wrap text-sm text-stone-700">
              {review?.whatWentWrong || <span className="text-stone-400">Nothing recorded.</span>}
            </p>
          ) : (
            <Textarea
              value={whatWentWrong}
              onChange={(e) => setWhatWentWrong(e.target.value)}
              placeholder="Issues, problems, or things that could have gone better…"
              rows={4}
              className="resize-none"
            />
          )}
        </CardContent>
      </Card>

      {/* 8. Lessons Learned */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-stone-800">
            Lessons Learned
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readonlyMode ? (
            <p className="whitespace-pre-wrap text-sm text-stone-700">
              {review?.lessonsLearned || <span className="text-stone-400">Nothing recorded.</span>}
            </p>
          ) : (
            <Textarea
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              placeholder="Key takeaways the team should carry forward…"
              rows={4}
              className="resize-none"
            />
          )}
        </CardContent>
      </Card>

      {/* 9. Improvement Notes */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-stone-800">
            Improvement Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readonlyMode ? (
            <p className="whitespace-pre-wrap text-sm text-stone-700">
              {review?.improvementNotes || <span className="text-stone-400">Nothing recorded.</span>}
            </p>
          ) : (
            <Textarea
              value={improvementNotes}
              onChange={(e) => setImprovementNotes(e.target.value)}
              placeholder="Specific actions or improvements for next time…"
              rows={4}
              className="resize-none"
            />
          )}
        </CardContent>
      </Card>

      {/* Save */}
      {!readonlyMode && (
        <div className="flex justify-end pb-8">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-[#c57a3a] text-white hover:bg-[#a8682f] min-w-[140px]"
          >
            {isPending ? "Saving…" : "Save Review"}
          </Button>
        </div>
      )}
    </div>
  )
}
