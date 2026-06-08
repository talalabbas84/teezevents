"use client"

import type { FormEvent } from "react"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Eye,
  FileText,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type CmsPageStatus = "DRAFT" | "REVIEW" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED"
type CmsSectionKind = "RICH_TEXT" | "FEATURE_GRID" | "CTA" | "FAQ" | "GALLERY" | "STATS"
type SectionBackground = "DEFAULT" | "MUTED" | "DARK"

type CmsSectionItemState = {
  localId: string
  title: string
  body: string
  image: string
  href: string
  label: string
  value: string
}

type CmsSectionState = {
  localId: string
  id: string
  kind: CmsSectionKind
  title: string
  eyebrow: string
  body: string
  image: string
  ctaLabel: string
  ctaHref: string
  background: SectionBackground
  items: CmsSectionItemState[]
}

type CmsPageView = {
  id: string
  slug: string
  title: string
  status: CmsPageStatus
  seoTitle: string | null
  seoDescription: string | null
  heroEyebrow: string | null
  heroTitle: string
  heroBody: string | null
  heroImage: string | null
  heroCtaLabel: string | null
  heroCtaHref: string | null
  sections: CmsSectionState[] | null
  showInNavigation: boolean
  navigationLabel: string | null
  navigationSortOrder: number
  publishedAt: string | null
  scheduledAt: string | null
  updatedAt: string
  updatedByAdminEmail: string | null
  revisionCount: number
}

type CmsFormState = {
  slug: string
  title: string
  status: CmsPageStatus
  seoTitle: string
  seoDescription: string
  heroEyebrow: string
  heroTitle: string
  heroBody: string
  heroImage: string
  heroCtaLabel: string
  heroCtaHref: string
  sections: CmsSectionState[]
  showInNavigation: boolean
  navigationLabel: string
  navigationSortOrder: string
  scheduledAt: string
}

const sectionKindLabels: Record<CmsSectionKind, string> = {
  RICH_TEXT: "Rich Text",
  FEATURE_GRID: "Feature Grid",
  CTA: "CTA Band",
  FAQ: "FAQ",
  GALLERY: "Gallery",
  STATS: "Stats",
}

function buildLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Not set"
  }

  return date.toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function slugFromTitle(value: string) {
  return normalizeSlug(value)
}

function emptyItem(): CmsSectionItemState {
  return {
    localId: buildLocalId("item"),
    title: "",
    body: "",
    image: "",
    href: "",
    label: "",
    value: "",
  }
}

function emptySection(kind: CmsSectionKind = "RICH_TEXT", index = 0): CmsSectionState {
  return {
    localId: buildLocalId("section"),
    id: `section-${index + 1}`,
    kind,
    title: sectionKindLabels[kind],
    eyebrow: "",
    body: "",
    image: "",
    ctaLabel: kind === "CTA" ? "Get in touch" : "",
    ctaHref: kind === "CTA" ? "/contact" : "",
    background: kind === "CTA" ? "DARK" : "DEFAULT",
    items: kind === "RICH_TEXT" || kind === "CTA" ? [] : [emptyItem(), emptyItem()],
  }
}

function starterPage(): CmsFormState {
  return {
    slug: "",
    title: "",
    status: "DRAFT",
    seoTitle: "",
    seoDescription: "",
    heroEyebrow: "TEEZ Events",
    heroTitle: "",
    heroBody: "",
    heroImage: "",
    heroCtaLabel: "Start planning",
    heroCtaHref: "/contact",
    sections: [emptySection("RICH_TEXT", 0), emptySection("FEATURE_GRID", 1), emptySection("CTA", 2)],
    showInNavigation: false,
    navigationLabel: "",
    navigationSortOrder: "100",
    scheduledAt: "",
  }
}

function fromPage(page?: CmsPageView | null): CmsFormState {
  if (!page) {
    return starterPage()
  }

  return {
    slug: page.slug,
    title: page.title,
    status: page.status,
    seoTitle: page.seoTitle || "",
    seoDescription: page.seoDescription || "",
    heroEyebrow: page.heroEyebrow || "",
    heroTitle: page.heroTitle,
    heroBody: page.heroBody || "",
    heroImage: page.heroImage || "",
    heroCtaLabel: page.heroCtaLabel || "",
    heroCtaHref: page.heroCtaHref || "",
    sections:
      page.sections?.map((section, index) => ({
        ...emptySection(section.kind, index),
        ...section,
        localId: buildLocalId("section"),
        items:
          section.items?.map((item) => ({
            ...emptyItem(),
            ...item,
            localId: buildLocalId("item"),
          })) || [],
      })) || [],
    showInNavigation: page.showInNavigation,
    navigationLabel: page.navigationLabel || "",
    navigationSortOrder: String(page.navigationSortOrder || 100),
    scheduledAt: toDateTimeLocal(page.scheduledAt),
  }
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

function statusVariant(status: CmsPageStatus) {
  if (status === "PUBLISHED") {
    return "secondary" as const
  }

  if (status === "ARCHIVED") {
    return "outline" as const
  }

  return "default" as const
}

export function AdminCmsStudio({ pages }: { pages: CmsPageView[] }) {
  const [selectedSlug, setSelectedSlug] = useState(pages[0]?.slug || "new")
  const selectedPage = useMemo(
    () => pages.find((page) => page.slug === selectedSlug) || null,
    [pages, selectedSlug],
  )
  const [form, setForm] = useState<CmsFormState>(fromPage(selectedPage))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  function selectPage(slug: string) {
    const page = pages.find((candidate) => candidate.slug === slug) || null

    setSelectedSlug(slug)
    setForm(fromPage(page))
    setStatus("")
    setError("")
  }

  function updateSection(localId: string, patch: Partial<CmsSectionState>) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.localId === localId ? { ...section, ...patch } : section)),
    }))
  }

  function updateSectionItem(sectionId: string, itemId: string, patch: Partial<CmsSectionItemState>) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.localId === sectionId
          ? {
              ...section,
              items: section.items.map((item) => (item.localId === itemId ? { ...item, ...patch } : item)),
            }
          : section,
      ),
    }))
  }

  async function savePage(nextStatus?: CmsPageStatus) {
    setError("")
    setStatus("")
    setIsSubmitting(true)

    const effectiveStatus = nextStatus || form.status
    const response = await fetch("/api/admin/cms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        status: effectiveStatus,
        slug: normalizeSlug(form.slug),
        sections: form.sections.map((section) => ({
          id: section.id || section.localId,
          kind: section.kind,
          title: section.title,
          eyebrow: section.eyebrow || undefined,
          body: section.body || undefined,
          image: section.image || undefined,
          ctaLabel: section.ctaLabel || undefined,
          ctaHref: section.ctaHref || undefined,
          background: section.background,
          items: section.items
            .filter((item) => item.title.trim())
            .map((item) => ({
              title: item.title,
              body: item.body || undefined,
              image: item.image || undefined,
              href: item.href || undefined,
              label: item.label || undefined,
              value: item.value || undefined,
            })),
        })),
        navigationSortOrder: Number(form.navigationSortOrder) || 100,
        scheduledAt: effectiveStatus === "SCHEDULED" ? form.scheduledAt || undefined : undefined,
      }),
    }).catch(() => null)

    if (!response) {
      setIsSubmitting(false)
      setError("Network error. Please try again.")
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.ok) {
      setIsSubmitting(false)
      setError(payload?.error || "Unable to save CMS page.")
      return
    }

    setStatus(`Saved /${payload.slug} as ${payload.status}. Reloading CMS...`)
    window.location.reload()
  }

  async function archivePage() {
    if (!form.slug || isArchiving) {
      return
    }

    const confirmed = window.confirm(`Archive /${form.slug}? It will be removed from public publishing and navigation.`)

    if (!confirmed) {
      return
    }

    setError("")
    setStatus("")
    setIsArchiving(true)

    const response = await fetch(`/api/admin/cms?slug=${encodeURIComponent(form.slug)}`, {
      method: "DELETE",
    }).catch(() => null)

    if (!response) {
      setIsArchiving(false)
      setError("Network error. Please try again.")
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.ok) {
      setIsArchiving(false)
      setError(payload?.error || "Unable to archive page.")
      return
    }

    setStatus(`Archived /${payload.slug}. Reloading CMS...`)
    window.location.reload()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void savePage()
  }

  const qualityChecks = [
    {
      label: "SEO title",
      passed: (form.seoTitle || form.title).length >= 20 && (form.seoTitle || form.title).length <= 70,
    },
    {
      label: "Meta description",
      passed: form.seoDescription.length >= 80 && form.seoDescription.length <= 180,
    },
    {
      label: "Hero",
      passed: Boolean(form.heroTitle.trim() && form.heroBody.trim()),
    },
    {
      label: "Sections",
      passed: form.sections.length > 0,
    },
    {
      label: "Navigation",
      passed: !form.showInNavigation || Boolean((form.navigationLabel || form.title).trim()),
    },
  ]

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Pages</div>
                <div className="mt-1 text-sm text-muted-foreground">{`${pages.length} managed page(s)`}</div>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="border-primary text-primary"
                onClick={() => {
                  setSelectedSlug("new")
                  setForm(starterPage())
                  setStatus("")
                  setError("")
                }}
                aria-label="New CMS page"
              >
                <Plus size={16} />
              </Button>
            </div>

            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    selectedSlug === page.slug ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"
                  }`}
                  onClick={() => selectPage(page.slug)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{page.title}</span>
                    <Badge variant={statusVariant(page.status)}>{page.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{`/${page.slug} • ${page.revisionCount} revision(s)`}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{`Updated ${formatDateTime(page.updatedAt)}`}</div>
                </button>
              ))}

              {pages.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No CMS pages yet. Create a landing page, service page, or private campaign page.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              <ShieldCheck size={16} />
              Governance
            </div>
            {qualityChecks.map((check) => (
              <div key={check.label} className="flex items-center justify-between gap-3 text-sm">
                <span>{check.label}</span>
                <Badge variant={check.passed ? "secondary" : "outline"}>{check.passed ? "Ready" : "Review"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border border-border shadow-xl">
          <CardContent className="space-y-6 p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Website CMS</div>
                <h2 className="mt-2 text-3xl font-serif font-bold">{form.title || "New managed page"}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create public landing pages with SEO, publishing workflow, navigation controls, and revision history.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.slug && selectedPage?.status === "PUBLISHED" && (
                  <Button asChild type="button" variant="outline" className="border-primary text-primary">
                    <Link href={`/${form.slug}`} target="_blank">
                      <span className="inline-flex items-center gap-2">
                        <Eye size={16} />
                        Open
                      </span>
                    </Link>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary text-primary"
                  disabled={isSubmitting}
                  onClick={() => void savePage("DRAFT")}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-accent"
                  disabled={isSubmitting}
                  onClick={() => void savePage("PUBLISHED")}
                >
                  <span className="inline-flex items-center gap-2">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Publish
                  </span>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="cms-title">Page Title</Label>
                <Input
                  id="cms-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                      slug: current.slug || slugFromTitle(event.target.value),
                      heroTitle: current.heroTitle || event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cms-slug">Slug</Label>
                <Input
                  id="cms-slug"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: normalizeSlug(event.target.value) }))}
                  placeholder="private-events"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cms-status">Status</Label>
                <select
                  id="cms-status"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CmsPageStatus }))}
                  className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="REVIEW">Review</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cms-scheduled-at">Scheduled Publish</Label>
                <Input
                  id="cms-scheduled-at"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cms-seo-title">SEO Title</Label>
                <Input
                  id="cms-seo-title"
                  value={form.seoTitle}
                  onChange={(event) => setForm((current) => ({ ...current, seoTitle: event.target.value }))}
                  placeholder="Teez Events | Private Event Planning Toronto"
                />
                <div className="text-xs text-muted-foreground">{`${(form.seoTitle || form.title).length} characters`}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cms-seo-description">Meta Description</Label>
                <Textarea
                  id="cms-seo-description"
                  rows={3}
                  value={form.seoDescription}
                  onChange={(event) => setForm((current) => ({ ...current, seoDescription: event.target.value }))}
                />
                <div className="text-xs text-muted-foreground">{`${form.seoDescription.length} characters`}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                <Search size={16} />
                Navigation
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_160px_auto]">
                <div className="space-y-2">
                  <Label htmlFor="cms-nav-label">Navigation Label</Label>
                  <Input
                    id="cms-nav-label"
                    value={form.navigationLabel}
                    onChange={(event) => setForm((current) => ({ ...current, navigationLabel: event.target.value }))}
                    placeholder={form.title || "Page label"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cms-nav-order">Sort</Label>
                  <Input
                    id="cms-nav-order"
                    type="number"
                    value={form.navigationSortOrder}
                    onChange={(event) => setForm((current) => ({ ...current, navigationSortOrder: event.target.value }))}
                  />
                </div>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <span className="text-sm font-medium">Show in nav</span>
                  <Switch
                    checked={form.showInNavigation}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, showInNavigation: checked }))}
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xl">
          <CardContent className="space-y-5 p-6 lg:p-8">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles size={16} />
              Hero
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cms-hero-eyebrow">Eyebrow</Label>
                  <Input
                    id="cms-hero-eyebrow"
                    value={form.heroEyebrow}
                    onChange={(event) => setForm((current) => ({ ...current, heroEyebrow: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cms-hero-title">Hero Title</Label>
                  <Input
                    id="cms-hero-title"
                    value={form.heroTitle}
                    onChange={(event) => setForm((current) => ({ ...current, heroTitle: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cms-hero-body">Hero Body</Label>
                  <Textarea
                    id="cms-hero-body"
                    rows={4}
                    value={form.heroBody}
                    onChange={(event) => setForm((current) => ({ ...current, heroBody: event.target.value }))}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cms-hero-cta-label">CTA Label</Label>
                    <Input
                      id="cms-hero-cta-label"
                      value={form.heroCtaLabel}
                      onChange={(event) => setForm((current) => ({ ...current, heroCtaLabel: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cms-hero-cta-href">CTA URL</Label>
                    <Input
                      id="cms-hero-cta-href"
                      value={form.heroCtaHref}
                      onChange={(event) => setForm((current) => ({ ...current, heroCtaHref: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cms-hero-image">Hero Image URL</Label>
                  <Input
                    id="cms-hero-image"
                    value={form.heroImage}
                    onChange={(event) => setForm((current) => ({ ...current, heroImage: event.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-background">
                {form.heroImage ? (
                  <img src={form.heroImage} alt="" className="h-52 w-full object-cover" />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-muted/40 text-muted-foreground">
                    <ImagePlus size={32} />
                  </div>
                )}
                <div className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{form.heroEyebrow || "Preview"}</div>
                  <div className="mt-2 text-3xl font-serif font-bold">{form.heroTitle || "Hero title"}</div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{form.heroBody || "Hero body preview."}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xl">
          <CardContent className="space-y-5 p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                  <LayoutTemplate size={16} />
                  Sections
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Build reusable content blocks for the managed page.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["RICH_TEXT", "FEATURE_GRID", "CTA", "FAQ", "GALLERY", "STATS"] as CmsSectionKind[]).map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-primary text-primary"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        sections: [...current.sections, emptySection(kind, current.sections.length)],
                      }))
                    }
                  >
                    {sectionKindLabels[kind]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {form.sections.map((section, sectionIndex) => (
                <div key={section.localId} className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{sectionKindLabels[section.kind]}</Badge>
                      <span className="text-sm text-muted-foreground">{`#${sectionIndex + 1}`}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={sectionIndex === 0}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            sections: moveItem(current.sections, sectionIndex, sectionIndex - 1),
                          }))
                        }
                        aria-label="Move section up"
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={sectionIndex === form.sections.length - 1}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            sections: moveItem(current.sections, sectionIndex, sectionIndex + 1),
                          }))
                        }
                        aria-label="Move section down"
                      >
                        <ArrowDown size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            sections: current.sections.filter((candidate) => candidate.localId !== section.localId),
                          }))
                        }
                        aria-label="Remove section"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Kind</Label>
                      <select
                        value={section.kind}
                        onChange={(event) => updateSection(section.localId, { kind: event.target.value as CmsSectionKind })}
                        className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {Object.entries(sectionKindLabels).map(([kind, label]) => (
                          <option key={kind} value={kind}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Background</Label>
                      <select
                        value={section.background}
                        onChange={(event) => updateSection(section.localId, { background: event.target.value as SectionBackground })}
                        className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="DEFAULT">Default</option>
                        <option value="MUTED">Muted</option>
                        <option value="DARK">Dark</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Anchor ID</Label>
                      <Input value={section.id} onChange={(event) => updateSection(section.localId, { id: normalizeSlug(event.target.value) })} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Eyebrow</Label>
                      <Input value={section.eyebrow} onChange={(event) => updateSection(section.localId, { eyebrow: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={section.title} onChange={(event) => updateSection(section.localId, { title: event.target.value })} />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>Body</Label>
                    <Textarea rows={4} value={section.body} onChange={(event) => updateSection(section.localId, { body: event.target.value })} />
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input value={section.image} onChange={(event) => updateSection(section.localId, { image: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>CTA Label</Label>
                      <Input value={section.ctaLabel} onChange={(event) => updateSection(section.localId, { ctaLabel: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>CTA URL</Label>
                      <Input value={section.ctaHref} onChange={(event) => updateSection(section.localId, { ctaHref: event.target.value })} />
                    </div>
                  </div>

                  {section.kind !== "RICH_TEXT" && section.kind !== "CTA" && (
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Items</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateSection(section.localId, {
                              items: [...section.items, emptyItem()],
                            })
                          }
                        >
                          <Plus size={14} />
                          Item
                        </Button>
                      </div>
                      {section.items.map((item) => (
                        <div key={item.localId} className="rounded-xl border border-border bg-background p-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input
                              value={item.title}
                              onChange={(event) => updateSectionItem(section.localId, item.localId, { title: event.target.value })}
                              placeholder="Title"
                            />
                            <Input
                              value={item.value}
                              onChange={(event) => updateSectionItem(section.localId, item.localId, { value: event.target.value })}
                              placeholder="Value or stat"
                            />
                            <Input
                              value={item.label}
                              onChange={(event) => updateSectionItem(section.localId, item.localId, { label: event.target.value })}
                              placeholder="Label"
                            />
                            <Input
                              value={item.href}
                              onChange={(event) => updateSectionItem(section.localId, item.localId, { href: event.target.value })}
                              placeholder="Link"
                            />
                            <Input
                              value={item.image}
                              onChange={(event) => updateSectionItem(section.localId, item.localId, { image: event.target.value })}
                              placeholder="Image URL"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                updateSection(section.localId, {
                                  items: section.items.filter((candidate) => candidate.localId !== item.localId),
                                })
                              }
                            >
                              Remove
                            </Button>
                          </div>
                          <Textarea
                            className="mt-3"
                            rows={2}
                            value={item.body}
                            onChange={(event) => updateSectionItem(section.localId, item.localId, { body: event.target.value })}
                            placeholder="Body"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xl">
          <CardContent className="space-y-4 p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                <FileText size={16} />
                Live Preview
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="outline" className="border-primary text-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Current Status"}
                </Button>
                {selectedPage && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive text-destructive"
                    disabled={isArchiving}
                    onClick={() => void archivePage()}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isArchiving ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                      Archive
                    </span>
                  </Button>
                )}
              </div>
            </div>

            {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            {status && <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">{status}</div>}

            <div className="overflow-hidden rounded-3xl border border-border bg-background">
              {form.heroImage && <img src={form.heroImage} alt="" className="h-72 w-full object-cover" />}
              <div className="p-6 lg:p-10">
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{form.heroEyebrow || "TEEZ Events"}</div>
                <h3 className="mt-3 text-4xl font-serif font-bold text-balance">{form.heroTitle || "Managed page hero"}</h3>
                <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{form.heroBody || "Hero body preview."}</p>
                {form.heroCtaLabel && form.heroCtaHref && (
                  <div className="mt-6">
                    <span className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                      {form.heroCtaLabel}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-0">
                {form.sections.map((section) => (
                  <section
                    key={section.localId}
                    className={`border-t border-border p-6 lg:p-10 ${
                      section.background === "DARK"
                        ? "bg-[#1c2431] text-white"
                        : section.background === "MUTED"
                          ? "bg-muted/30"
                          : "bg-background"
                    }`}
                  >
                    {section.eyebrow && <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{section.eyebrow}</div>}
                    <h4 className="mt-2 text-3xl font-serif font-bold">{section.title}</h4>
                    {section.body && <p className="mt-3 max-w-3xl whitespace-pre-line leading-relaxed text-muted-foreground">{section.body}</p>}
                    {section.items.length > 0 && (
                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {section.items.filter((item) => item.title).map((item) => (
                          <div key={item.localId} className="rounded-xl border border-border bg-background/80 p-4 text-foreground">
                            {item.image && <img src={item.image} alt="" className="mb-3 aspect-video w-full rounded-lg object-cover" />}
                            <div className="text-2xl font-serif font-bold">{item.value || item.title}</div>
                            {item.value && <div className="mt-1 font-medium">{item.title}</div>}
                            {item.body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
