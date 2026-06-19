"use client"

import { useMemo, useState, useTransition } from "react"
import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  createAmbassador,
  generateDistributionAssets,
  markDistributionPublished,
  toggleDistributionChannel,
  updateAmbassadorPerformance,
  updateDistributionAsset,
  updateDistributionChannel,
} from "@/actions/distribution"
import {
  ASSET_STATUS_OPTIONS,
  ASSET_TYPE_LABELS,
  DISTRIBUTION_PLATFORMS,
  DISTRIBUTION_STATUS_OPTIONS,
  getChannelLabel,
  getPlatformLabel,
  type DistributionAssetStatus,
  type DistributionAssetType,
  type DistributionChannelType,
  type DistributionPlatform,
  type DistributionStatus,
} from "@/lib/distribution-config"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type EventSummary = {
  id: string
  title: string
  startsAt: string | null
  venue: string | null
  address: string | null
  image: string | null
  previewDescription: string | null
  description: string | null
  checkoutEnabled: boolean
  capacity: number
  paidOrders: number
  revenueCents: number
  ticketsSold: number
  rsvpCount: number
}

type DistributionSerialized = {
  id: string
  eventId: string
  platform: DistributionPlatform
  channelType: DistributionChannelType
  status: DistributionStatus
  selected: boolean
  syncEnabled: boolean
  platformListingId: string | null
  platformUrl: string | null
  lastPublishedAt: string | null
  lastSyncedAt: string | null
  errorMessage: string | null
  notes: string | null
}

type AssetSerialized = {
  id: string
  eventId: string
  distributionId: string | null
  type: DistributionAssetType
  platform: DistributionPlatform | null
  title: string
  body: string
  status: DistributionAssetStatus
  updatedAt: string
}

type AmbassadorSerialized = {
  id: string
  eventId: string
  name: string
  email: string | null
  code: string
  referralUrl: string
  rewardType: "NONE" | "FIXED" | "COMMISSION_PERCENT" | "TICKET_CREDIT"
  rewardValue: number | null
  salesCount: number
  revenueCents: number
  rewardCents: number
  isActive: boolean
  notes: string | null
}

type MetricSerialized = {
  id: string
  platform: DistributionPlatform | null
  kind: string
  label: string | null
  valueInt: number | null
  valueDecimal: number | null
  valueText: string | null
  capturedAt: string
}

type ChannelEdit = {
  status: DistributionStatus
  platformUrl: string
  syncEnabled: boolean
  notes: string
}

type AssetEdit = {
  title: string
  body: string
  status: DistributionAssetStatus
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(value: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function statusClass(status: DistributionStatus) {
  switch (status) {
    case "PUBLISHED":
      return "border-green-200 bg-green-50 text-green-700"
    case "READY":
    case "QUEUED":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "NEEDS_REVIEW":
      return "border-amber-200 bg-amber-50 text-amber-800"
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700"
    case "SYNC_PAUSED":
      return "border-stone-200 bg-stone-100 text-stone-600"
    default:
      return "border-stone-200 bg-white text-stone-600"
  }
}

function assetStatusClass(status: DistributionAssetStatus) {
  switch (status) {
    case "PUBLISHED":
      return "border-green-200 bg-green-50 text-green-700"
    case "APPROVED":
    case "SCHEDULED":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "ARCHIVED":
      return "border-stone-200 bg-stone-100 text-stone-600"
    default:
      return "border-amber-200 bg-amber-50 text-amber-800"
  }
}

function buildChannelEdits(distributions: DistributionSerialized[]) {
  return distributions.reduce<Record<string, ChannelEdit>>((acc, distribution) => {
    acc[distribution.platform] = {
      status: distribution.status,
      platformUrl: distribution.platformUrl ?? "",
      syncEnabled: distribution.syncEnabled,
      notes: distribution.notes ?? "",
    }
    return acc
  }, {})
}

function buildAssetEdits(assets: AssetSerialized[]) {
  return assets.reduce<Record<string, AssetEdit>>((acc, asset) => {
    acc[asset.id] = {
      title: asset.title,
      body: asset.body,
      status: asset.status,
    }
    return acc
  }, {})
}

function calculateMarketingScore({
  distributions,
  assets,
  ambassadors,
  event,
}: {
  distributions: DistributionSerialized[]
  assets: AssetSerialized[]
  ambassadors: AmbassadorSerialized[]
  event: EventSummary
}) {
  const byPlatform = new Map(distributions.map((item) => [item.platform, item]))
  const isPublished = (platform: DistributionPlatform) => byPlatform.get(platform)?.status === "PUBLISHED"
  const isSelected = (platform: DistributionPlatform) => byPlatform.get(platform)?.selected
  const hasAsset = (type: DistributionAssetType) => assets.some((asset) => asset.type === type)
  const eventPlatforms = distributions.filter((item) => item.channelType === "EVENT_PLATFORM" && item.selected)
  const socialChannels = distributions.filter((item) => item.channelType === "SOCIAL" && item.selected)
  const communityChannels = distributions.filter((item) => item.channelType === "COMMUNITY" && item.selected)

  const checks = [
    { label: "Website event page", complete: isPublished("WEBSITE") },
    { label: "Checkout enabled", complete: event.checkoutEnabled },
    { label: "Two event platforms selected", complete: eventPlatforms.length >= 2 },
    { label: "One event platform published", complete: eventPlatforms.some((item) => item.status === "PUBLISHED") },
    { label: "Instagram selected", complete: isSelected("INSTAGRAM") },
    { label: "Facebook Event selected", complete: isSelected("FACEBOOK_EVENTS") },
    { label: "Email campaign generated", complete: hasAsset("EMAIL_CAMPAIGN") },
    { label: "Instagram content generated", complete: hasAsset("INSTAGRAM_POST") || hasAsset("INSTAGRAM_REEL") },
    { label: "Community announcement selected", complete: communityChannels.length > 0 },
    { label: "Ambassador campaign active", complete: ambassadors.some((item) => item.isActive) },
    { label: "Sync enabled on a channel", complete: distributions.some((item) => item.syncEnabled) },
    { label: "Social channel selected", complete: socialChannels.length > 0 },
  ]

  const complete = checks.filter((item) => item.complete).length
  return {
    score: Math.round((complete / checks.length) * 100),
    complete,
    total: checks.length,
    checks,
  }
}

export function DistributionHubClient({
  event,
  distributions: initialDistributions,
  assets: initialAssets,
  ambassadors: initialAmbassadors,
  metrics,
}: {
  event: EventSummary
  distributions: DistributionSerialized[]
  assets: AssetSerialized[]
  ambassadors: AmbassadorSerialized[]
  metrics: MetricSerialized[]
}) {
  const [isPending, startTransition] = useTransition()
  const [distributions, setDistributions] = useState(initialDistributions)
  const [assets, setAssets] = useState(initialAssets)
  const [ambassadors, setAmbassadors] = useState(initialAmbassadors)
  const [channelSearch, setChannelSearch] = useState("")
  const [channelView, setChannelView] = useState("ALL")
  const [assetSearch, setAssetSearch] = useState("")
  const [assetStatusFilter, setAssetStatusFilter] = useState("ALL")
  const [ambassadorSearch, setAmbassadorSearch] = useState("")
  const [channelEdits, setChannelEdits] = useState(() => buildChannelEdits(initialDistributions))
  const [assetEdits, setAssetEdits] = useState(() => buildAssetEdits(initialAssets))
  const [ambassadorForm, setAmbassadorForm] = useState({
    name: "",
    email: "",
    rewardType: "COMMISSION_PERCENT" as AmbassadorSerialized["rewardType"],
    rewardValue: "10",
  })
  const [performanceEdits, setPerformanceEdits] = useState<Record<string, { salesCount: string; revenueCad: string }>>(
    () =>
      initialAmbassadors.reduce<Record<string, { salesCount: string; revenueCad: string }>>((acc, ambassador) => {
        acc[ambassador.id] = {
          salesCount: String(ambassador.salesCount),
          revenueCad: String((ambassador.revenueCents / 100).toFixed(0)),
        }
        return acc
      }, {})
  )

  const score = useMemo(
    () => calculateMarketingScore({ distributions, assets, ambassadors, event }),
    [distributions, assets, ambassadors, event]
  )
  const distributionsByPlatform = new Map(distributions.map((item) => [item.platform, item]))
  const filteredGroupedPlatforms = useMemo(() => {
    const q = channelSearch.trim().toLowerCase()
    return DISTRIBUTION_PLATFORMS.reduce<Record<DistributionChannelType, typeof DISTRIBUTION_PLATFORMS[number][]>>(
      (acc, platform) => {
        const distribution = distributions.find((item) => item.platform === platform.platform)
        const edit = channelEdits[platform.platform]
        const status = edit?.status ?? distribution?.status ?? "DRAFT"
        const selected = distribution?.selected ?? false
        const platformUrl = edit?.platformUrl ?? distribution?.platformUrl ?? ""
        const syncEnabled = edit?.syncEnabled ?? distribution?.syncEnabled ?? false
        const haystack = `${platform.label} ${platform.description} ${getChannelLabel(platform.channelType)} ${status}`.toLowerCase()

        if (q && !haystack.includes(q)) return acc
        if (channelView === "SELECTED" && !selected) return acc
        if (channelView === "PUBLISHED" && status !== "PUBLISHED") return acc
        if (channelView === "SYNC" && !syncEnabled) return acc
        if (
          channelView === "ATTENTION" &&
          !["FAILED", "NEEDS_REVIEW", "NOT_CONNECTED"].includes(status) &&
          !(selected && status === "PUBLISHED" && !platformUrl)
        ) {
          return acc
        }

        acc[platform.channelType].push(platform)
        return acc
      },
      { OWNED: [], EVENT_PLATFORM: [], SOCIAL: [], COMMUNITY: [] }
    )
  }, [channelEdits, channelSearch, channelView, distributions])
  const filteredChannelCount = Object.values(filteredGroupedPlatforms).reduce((sum, group) => sum + group.length, 0)
  const hasChannelFilters = channelSearch.trim() !== "" || channelView !== "ALL"
  const publishedCount = distributions.filter((item) => item.status === "PUBLISHED").length
  const selectedCount = distributions.filter((item) => item.selected).length
  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase()
    return assets.filter((asset) => {
      const edit = assetEdits[asset.id] ?? { title: asset.title, body: asset.body, status: asset.status }
      if (assetStatusFilter !== "ALL" && edit.status !== assetStatusFilter) return false
      if (!q) return true
      const haystack = `${ASSET_TYPE_LABELS[asset.type]} ${asset.platform ? getPlatformLabel(asset.platform) : ""} ${edit.title} ${edit.body}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [assetEdits, assetSearch, assetStatusFilter, assets])
  const filteredAmbassadors = useMemo(() => {
    const q = ambassadorSearch.trim().toLowerCase()
    return ambassadors
      .filter((ambassador) => {
        if (!q) return true
        const haystack = `${ambassador.name} ${ambassador.email ?? ""} ${ambassador.code} ${ambassador.referralUrl}`.toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => b.revenueCents - a.revenueCents)
  }, [ambassadorSearch, ambassadors])

  function clearChannelFilters() {
    setChannelSearch("")
    setChannelView("ALL")
  }

  function updateChannelEdit(platform: DistributionPlatform, patch: Partial<ChannelEdit>) {
    setChannelEdits((prev) => ({
      ...prev,
      [platform]: {
        ...(prev[platform] ?? { status: "DRAFT", platformUrl: "", syncEnabled: false, notes: "" }),
        ...patch,
      },
    }))
  }

  function updateDistributionLocal(platform: DistributionPlatform, patch: Partial<DistributionSerialized>) {
    setDistributions((prev) =>
      prev.map((distribution) =>
        distribution.platform === platform ? { ...distribution, ...patch } : distribution
      )
    )
  }

  function handleToggle(platform: DistributionPlatform, selected: boolean) {
    updateDistributionLocal(platform, { selected, status: selected ? "READY" : "DRAFT" })
    updateChannelEdit(platform, { status: selected ? "READY" : "DRAFT" })
    startTransition(async () => {
      const result = await toggleDistributionChannel(event.id, { platform, selected })
      if (!result.success) {
        toast.error(result.error ?? "Failed to update channel")
      }
    })
  }

  function handleSaveChannel(platform: DistributionPlatform) {
    const edit = channelEdits[platform]
    startTransition(async () => {
      const result = await updateDistributionChannel(event.id, {
        platform,
        status: edit.status,
        platformUrl: edit.platformUrl,
        syncEnabled: edit.syncEnabled,
        notes: edit.notes,
      })
      if (result.success) {
        updateDistributionLocal(platform, {
          status: edit.status,
          platformUrl: edit.platformUrl || null,
          syncEnabled: edit.syncEnabled,
          notes: edit.notes || null,
          selected: true,
        })
        toast.success(`${getPlatformLabel(platform)} saved`)
      } else {
        toast.error(result.error ?? "Failed to save channel")
      }
    })
  }

  function handleMarkPublished(platform: DistributionPlatform) {
    startTransition(async () => {
      const result = await markDistributionPublished(event.id, platform)
      if (result.success) {
        updateDistributionLocal(platform, {
          selected: true,
          status: "PUBLISHED",
          lastPublishedAt: new Date().toISOString(),
        })
        updateChannelEdit(platform, { status: "PUBLISHED" })
        toast.success(`${getPlatformLabel(platform)} marked published`)
      } else {
        toast.error(result.error ?? "Failed to mark published")
      }
    })
  }

  function handleGenerateAssets() {
    startTransition(async () => {
      const result = await generateDistributionAssets(event.id)
      if (result.success) {
        toast.success("Marketing assets generated. Refreshing...")
        window.location.reload()
      } else {
        toast.error(result.error ?? "Failed to generate assets")
      }
    })
  }

  function handleAssetEdit(assetId: string, patch: Partial<AssetEdit>) {
    setAssetEdits((prev) => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        ...patch,
      },
    }))
  }

  function handleSaveAsset(asset: AssetSerialized) {
    const edit = assetEdits[asset.id]
    startTransition(async () => {
      const result = await updateDistributionAsset(asset.id, edit)
      if (result.success) {
        setAssets((prev) =>
          prev.map((item) =>
            item.id === asset.id
              ? { ...item, title: edit.title, body: edit.body, status: edit.status }
              : item
          )
        )
        toast.success("Asset saved")
      } else {
        toast.error(result.error ?? "Failed to save asset")
      }
    })
  }

  function handleCreateAmbassador() {
    startTransition(async () => {
      const result = await createAmbassador(event.id, {
        name: ambassadorForm.name,
        email: ambassadorForm.email,
        rewardType: ambassadorForm.rewardType,
        rewardValue: Number(ambassadorForm.rewardValue || 0),
      })
      if (result.success) {
        toast.success("Ambassador created. Refreshing...")
        window.location.reload()
      } else {
        toast.error(result.error ?? "Failed to create ambassador")
      }
    })
  }

  function handlePerformanceSave(ambassador: AmbassadorSerialized) {
    const edit = performanceEdits[ambassador.id]
    const revenueCents = Math.round(Number(edit?.revenueCad || 0) * 100)
    startTransition(async () => {
      const result = await updateAmbassadorPerformance(ambassador.id, {
        salesCount: Number(edit?.salesCount || 0),
        revenueCents,
      })
      if (result.success) {
        setAmbassadors((prev) =>
          prev.map((item) =>
            item.id === ambassador.id
              ? { ...item, salesCount: Number(edit?.salesCount || 0), revenueCents }
              : item
          )
        )
        toast.success("Ambassador performance saved")
      } else {
        toast.error(result.error ?? "Failed to save performance")
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Distribution
          </div>
          <h1 className="mt-1.5 font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
            Multi-Channel Distribution Hub
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-stone-600">
            Create once, prepare every channel, track visibility, and manage ambassador distribution from one event workspace.
          </p>
        </div>
        <Button
          onClick={handleGenerateAssets}
          disabled={isPending}
          className="gap-2 bg-[#c57a3a] text-white hover:bg-[#a8652f]"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Assets
        </Button>
      </div>

      <div className="no-scrollbar sticky top-[calc(7rem+env(safe-area-inset-top))] z-20 -mx-4 flex gap-2 overflow-x-auto border-y border-stone-200 bg-[#F7EDDB]/95 px-4 py-2 backdrop-blur-xl lg:static lg:mx-0 lg:rounded-2xl lg:border lg:bg-white">
        {[
          { href: "#distribution-score", label: "Score" },
          { href: "#distribution-channels", label: "Channels" },
          { href: "#distribution-assets", label: "Assets" },
          { href: "#distribution-ambassadors", label: "Ambassadors" },
          { href: "#distribution-sync", label: "Sync" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="h-9 shrink-0 rounded-full border border-stone-200 bg-white px-3 pt-2 text-sm font-medium text-stone-700 shadow-sm"
          >
            {item.label}
          </a>
        ))}
      </div>

      <div id="distribution-score" className="grid scroll-mt-28 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-primary/20 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Event Visibility Score
                </p>
                <div className="mt-2 flex items-end gap-2">
                  <span className={cn(
                    "font-serif text-6xl font-bold",
                    score.score >= 75 ? "text-green-700" : score.score >= 50 ? "text-amber-700" : "text-red-700"
                  )}>
                    {score.score}
                  </span>
                  <span className="pb-2 text-xl font-semibold text-stone-400">/100</span>
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  {score.complete} of {score.total} distribution checks complete.
                </p>
              </div>
              <div className="grid min-w-52 gap-2 text-sm">
                {score.checks.slice(0, 6).map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <CheckCircle2 className={cn("h-4 w-4", item.complete ? "text-green-600" : "text-stone-300")} />
                    <span className={item.complete ? "text-stone-700" : "text-stone-400"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Card className="bg-white">
            <CardContent className="flex items-center gap-3 p-5">
              <Megaphone className="h-5 w-5 text-[#c57a3a]" />
              <div>
                <p className="text-2xl font-bold">{selectedCount}</p>
                <p className="text-xs text-stone-500">Selected channels</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="flex items-center gap-3 p-5">
              <Send className="h-5 w-5 text-[#c57a3a]" />
              <div>
                <p className="text-2xl font-bold">{publishedCount}</p>
                <p className="text-xs text-stone-500">Published channels</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="flex items-center gap-3 p-5">
              <BarChart3 className="h-5 w-5 text-[#c57a3a]" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(event.revenueCents)}</p>
                <p className="text-xs text-stone-500">{event.ticketsSold} tickets sold</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <section id="distribution-channels" className="scroll-mt-28 space-y-5">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Publish Channels</h2>
          <p className="mt-1 text-sm text-stone-500">
            Select where this event should appear, store listing URLs, and track publish/sync state.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={channelSearch}
                onChange={(event) => setChannelSearch(event.target.value)}
                placeholder="Search channels"
                className="h-11 rounded-xl bg-white pl-9 text-base sm:text-sm"
              />
            </div>
            <Select value={channelView} onValueChange={setChannelView}>
              <SelectTrigger className="h-11 w-11 rounded-xl bg-white px-0 sm:w-[170px] sm:px-3" aria-label="Filter channels">
                <SlidersHorizontal className="mx-auto h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All channels</SelectItem>
                <SelectItem value="SELECTED">Selected</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ATTENTION">Needs attention</SelectItem>
                <SelectItem value="SYNC">Sync enabled</SelectItem>
              </SelectContent>
            </Select>
            {hasChannelFilters ? (
              <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={clearChannelFilters}>
                <X className="h-4 w-4" />
                <span className="sr-only">Clear channel filters</span>
              </Button>
            ) : null}
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {[
              { label: "All", value: "ALL" },
              { label: "Selected", value: "SELECTED" },
              { label: "Published", value: "PUBLISHED" },
              { label: "Needs attention", value: "ATTENTION" },
              { label: "Sync", value: "SYNC" },
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setChannelView(filter.value)}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-3 text-sm font-medium transition",
                  channelView === filter.value
                    ? "border-[#c57a3a] bg-[#c57a3a] text-white"
                    : "border-stone-200 bg-stone-50 text-stone-600"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-500">
            Showing {filteredChannelCount} of {DISTRIBUTION_PLATFORMS.length} channels.
          </p>
        </div>

        {filteredChannelCount === 0 ? (
          <Card className="border-dashed bg-white">
            <CardContent className="py-10 text-center">
              <p className="font-medium text-stone-700">No channels match</p>
              <p className="mt-1 text-sm text-stone-500">Clear filters to see every distribution option.</p>
              <Button type="button" variant="outline" className="mt-4" onClick={clearChannelFilters}>
                Show all channels
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {(["OWNED", "EVENT_PLATFORM", "SOCIAL", "COMMUNITY"] as DistributionChannelType[]).map((channelType) => {
          const platforms = filteredGroupedPlatforms[channelType]
          if (platforms.length === 0) return null

          return (
            <div key={channelType} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                {getChannelLabel(channelType)}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {platforms.map((platformConfig) => {
                const distribution = distributionsByPlatform.get(platformConfig.platform)
                const edit = channelEdits[platformConfig.platform] ?? {
                  status: "DRAFT" as DistributionStatus,
                  platformUrl: "",
                  syncEnabled: false,
                  notes: "",
                }
                return (
                  <Card key={platformConfig.platform} className="border-stone-200 bg-white shadow-sm">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={distribution?.selected ?? false}
                              onCheckedChange={(checked) => handleToggle(platformConfig.platform, checked === true)}
                            />
                            <h4 className="truncate text-sm font-semibold text-stone-900">
                              {platformConfig.label}
                            </h4>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                            {platformConfig.description}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn("shrink-0 text-xs", statusClass(edit.status))}>
                          {edit.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Status</Label>
                          <Select
                            value={edit.status}
                            onValueChange={(value) =>
                              updateChannelEdit(platformConfig.platform, { status: value as DistributionStatus })
                            }
                          >
                            <SelectTrigger className="h-9 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DISTRIBUTION_STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Listing URL</Label>
                          <div className="flex gap-2">
                            <Input
                              value={edit.platformUrl}
                              onChange={(e) =>
                                updateChannelEdit(platformConfig.platform, { platformUrl: e.target.value })
                              }
                              placeholder="https://..."
                              className="h-9 bg-white"
                            />
                            {edit.platformUrl ? (
                              <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0">
                                <a href={edit.platformUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-stone-700">Sync metrics</p>
                            <p className="text-[11px] text-stone-400">
                              Ready for API connectors
                            </p>
                          </div>
                          <Switch
                            checked={edit.syncEnabled}
                            onCheckedChange={(syncEnabled) =>
                              updateChannelEdit(platformConfig.platform, { syncEnabled })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveChannel(platformConfig.platform)}
                          disabled={isPending}
                          className="flex-1"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleMarkPublished(platformConfig.platform)}
                          disabled={isPending}
                          className="flex-1 bg-[#c57a3a] text-white hover:bg-[#a8652f]"
                        >
                          Published
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
                })}
              </div>
            </div>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div id="distribution-assets" className="scroll-mt-28 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold text-stone-900">AI Marketing Assets</h2>
              <p className="text-sm text-stone-500">
                Channel-specific drafts generated from the event details.
              </p>
            </div>
            <Button variant="outline" onClick={handleGenerateAssets} disabled={isPending} className="gap-2 bg-white">
              <Sparkles className="h-4 w-4" />
              Regenerate
            </Button>
          </div>

          {assets.length > 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    value={assetSearch}
                    onChange={(event) => setAssetSearch(event.target.value)}
                    placeholder="Find copy, channel, or asset"
                    className="h-11 rounded-xl bg-white pl-9 text-base sm:text-sm"
                  />
                </div>
                <Select value={assetStatusFilter} onValueChange={setAssetStatusFilter}>
                  <SelectTrigger className="h-11 w-[145px] rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All assets</SelectItem>
                    {ASSET_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-3 text-xs text-stone-500">
                Showing {filteredAssets.length} of {assets.length} assets.
              </p>
            </div>
          ) : null}

          {assets.length === 0 ? (
            <Card className="border-dashed bg-white">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Sparkles className="h-9 w-9 text-stone-300" />
                <p className="font-medium text-stone-700">No assets yet</p>
                <p className="max-w-md text-sm text-stone-500">
                  Generate assets to create email, social, event-platform, and community copy for this event.
                </p>
              </CardContent>
            </Card>
          ) : filteredAssets.length === 0 ? (
            <Card className="border-dashed bg-white">
              <CardContent className="py-10 text-center">
                <p className="font-medium text-stone-700">No assets match</p>
                <p className="mt-1 text-sm text-stone-500">Try a different search or status filter.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setAssetSearch("")
                    setAssetStatusFilter("ALL")
                  }}
                >
                  Clear asset filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAssets.map((asset) => {
                const edit = assetEdits[asset.id]
                return (
                  <Card key={asset.id} className="bg-white">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            {ASSET_TYPE_LABELS[asset.type]}
                          </p>
                          <p className="text-xs text-stone-500">
                            {asset.platform ? getPlatformLabel(asset.platform) : "General"} · Updated {formatDate(asset.updatedAt)}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn("text-xs", assetStatusClass(edit.status))}>
                          {edit.status}
                        </Badge>
                      </div>
                      <Input
                        value={edit.title}
                        onChange={(e) => handleAssetEdit(asset.id, { title: e.target.value })}
                        className="bg-white"
                      />
                      <Textarea
                        value={edit.body}
                        onChange={(e) => handleAssetEdit(asset.id, { body: e.target.value })}
                        rows={7}
                        className="bg-white"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Select
                          value={edit.status}
                          onValueChange={(value) => handleAssetEdit(asset.id, { status: value as DistributionAssetStatus })}
                        >
                          <SelectTrigger className="h-9 w-40 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSET_STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => handleSaveAsset(asset)}
                          disabled={isPending}
                          className="bg-[#c57a3a] text-white hover:bg-[#a8652f]"
                        >
                          Save Asset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div id="distribution-ambassadors" className="scroll-mt-28 space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl">
                <Users className="h-5 w-5 text-[#c57a3a]" />
                Ambassador Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Ambassador name"
                    value={ambassadorForm.name}
                    onChange={(e) => setAmbassadorForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="bg-white"
                  />
                  <Input
                    placeholder="Email"
                    value={ambassadorForm.email}
                    onChange={(e) => setAmbassadorForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="bg-white"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                  <Select
                    value={ambassadorForm.rewardType}
                    onValueChange={(rewardType) =>
                      setAmbassadorForm((prev) => ({
                        ...prev,
                        rewardType: rewardType as AmbassadorSerialized["rewardType"],
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMMISSION_PERCENT">Commission %</SelectItem>
                      <SelectItem value="FIXED">Fixed per sale</SelectItem>
                      <SelectItem value="TICKET_CREDIT">Ticket credit</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={ambassadorForm.rewardValue}
                    onChange={(e) => setAmbassadorForm((prev) => ({ ...prev, rewardValue: e.target.value }))}
                    className="bg-white"
                  />
                </div>
                <Button
                  onClick={handleCreateAmbassador}
                  disabled={isPending}
                  className="bg-[#c57a3a] text-white hover:bg-[#a8652f]"
                >
                  Create Ambassador Link
                </Button>
              </div>

              <div className="space-y-3">
                {ambassadors.length > 0 ? (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <Input
                      value={ambassadorSearch}
                      onChange={(event) => setAmbassadorSearch(event.target.value)}
                      placeholder="Search ambassadors"
                      className="h-11 rounded-xl bg-white pl-9 text-base sm:text-sm"
                    />
                  </div>
                ) : null}
                {ambassadors.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
                    No ambassadors yet.
                  </p>
                ) : filteredAmbassadors.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
                    No ambassadors match this search.
                  </p>
                ) : (
                  filteredAmbassadors.map((ambassador, index) => {
                    const edit = performanceEdits[ambassador.id] ?? {
                      salesCount: String(ambassador.salesCount),
                      revenueCad: String(ambassador.revenueCents / 100),
                    }
                    return (
                      <div key={ambassador.id} className="rounded-lg border border-stone-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                              <Trophy className={cn("h-4 w-4", index === 0 ? "text-amber-500" : "text-stone-300")} />
                              {ambassador.name}
                            </p>
                            <p className="truncate text-xs text-stone-500">{ambassador.referralUrl}</p>
                          </div>
                          <Badge variant="outline">{ambassador.code}</Badge>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[90px_1fr_auto]">
                          <Input
                            value={edit.salesCount}
                            onChange={(e) =>
                              setPerformanceEdits((prev) => ({
                                ...prev,
                                [ambassador.id]: { ...edit, salesCount: e.target.value },
                              }))
                            }
                            className="h-9 bg-white"
                          />
                          <Input
                            value={edit.revenueCad}
                            onChange={(e) =>
                              setPerformanceEdits((prev) => ({
                                ...prev,
                                [ambassador.id]: { ...edit, revenueCad: e.target.value },
                              }))
                            }
                            className="h-9 bg-white"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePerformanceSave(ambassador)}
                            disabled={isPending}
                          >
                            Save
                          </Button>
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-stone-500">
                          <span>{ambassador.salesCount} sales</span>
                          <span>{formatCurrency(ambassador.revenueCents)} revenue</span>
                          <span>{formatCurrency(ambassador.rewardCents)} reward</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card id="distribution-sync" className="scroll-mt-28 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl">
                <RefreshCw className="h-5 w-5 text-[#c57a3a]" />
                Sync Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
                  Connected platform metrics will appear here as API connectors are enabled.
                </p>
              ) : (
                <div className="space-y-2">
                  {metrics.slice(0, 8).map((metric) => (
                    <div key={metric.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-stone-800">
                          {metric.label ?? metric.kind.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-stone-500">
                          {metric.platform ? getPlatformLabel(metric.platform) : "All channels"}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-stone-900">
                        {metric.valueText ?? metric.valueInt ?? metric.valueDecimal ?? "-"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
