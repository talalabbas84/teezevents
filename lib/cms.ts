import "server-only"

import { getPrismaClient } from "@/lib/prisma"

export type CmsPageStatus = "DRAFT" | "REVIEW" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED"
export type CmsSectionKind = "RICH_TEXT" | "FEATURE_GRID" | "CTA" | "FAQ" | "GALLERY" | "STATS"

export type CmsSection = {
  id: string
  kind: CmsSectionKind
  title: string
  eyebrow?: string
  body?: string
  items?: Array<{
    title: string
    body?: string
    image?: string
    href?: string
    label?: string
    value?: string
  }>
  image?: string
  ctaLabel?: string
  ctaHref?: string
  background?: "DEFAULT" | "MUTED" | "DARK"
}

export type CmsPageInput = {
  slug: string
  title: string
  status: CmsPageStatus
  seoTitle?: string
  seoDescription?: string
  heroEyebrow?: string
  heroTitle: string
  heroBody?: string
  heroImage?: string
  heroCtaLabel?: string
  heroCtaHref?: string
  sections: CmsSection[]
  showInNavigation: boolean
  navigationLabel?: string
  navigationSortOrder: number
  scheduledAt?: string
}

const reservedSlugs = new Set([
  "admin",
  "api",
  "about",
  "contact",
  "events",
  "checkout",
  "tickets",
  "team",
])

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function cleanText(value: string | undefined, max: number) {
  const trimmed = value?.trim() || ""
  return trimmed.slice(0, max)
}

function normalizeSection(section: CmsSection, index: number): CmsSection {
  const kind = section.kind || "RICH_TEXT"
  const id = cleanText(section.id, 80) || `section-${index + 1}`
  const title = cleanText(section.title, 140)
  const normalizedItems = (section.items || [])
    .map((item) => ({
      title: cleanText(item.title, 120),
      body: cleanText(item.body, 800) || undefined,
      image: cleanText(item.image, 500) || undefined,
      href: cleanText(item.href, 500) || undefined,
      label: cleanText(item.label, 80) || undefined,
      value: cleanText(item.value, 80) || undefined,
    }))
    .filter((item) => item.title)
    .slice(0, 12)

  return {
    id,
    kind,
    title,
    eyebrow: cleanText(section.eyebrow, 80) || undefined,
    body: cleanText(section.body, 5000) || undefined,
    items: normalizedItems.length > 0 ? normalizedItems : undefined,
    image: cleanText(section.image, 500) || undefined,
    ctaLabel: cleanText(section.ctaLabel, 80) || undefined,
    ctaHref: cleanText(section.ctaHref, 500) || undefined,
    background: section.background || "DEFAULT",
  }
}

function normalizeSections(sections: CmsSection[]) {
  return sections
    .map(normalizeSection)
    .filter((section) => section.title || section.body || (section.items?.length || 0) > 0)
    .slice(0, 24)
}

function snapshotPage(page: any) {
  return {
    slug: page.slug,
    title: page.title,
    status: page.status,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    heroEyebrow: page.heroEyebrow,
    heroTitle: page.heroTitle,
    heroBody: page.heroBody,
    heroImage: page.heroImage,
    heroCtaLabel: page.heroCtaLabel,
    heroCtaHref: page.heroCtaHref,
    sections: page.sections,
    showInNavigation: page.showInNavigation,
    navigationLabel: page.navigationLabel,
    navigationSortOrder: page.navigationSortOrder,
    publishedAt: page.publishedAt,
    scheduledAt: page.scheduledAt,
  }
}

function isMissingCmsTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /WebsitePage|WebsitePageRevision|websitePage|websitePageRevision|Cannot read properties of undefined|does not exist in the current database|The table `public\./i.test(message)
}

export function getCmsSetupIssue(error: unknown) {
  if (isMissingCmsTable(error)) {
    return {
      title: "CMS database tables are missing.",
      description: "The CMS code is installed, but Prisma has not pushed the WebsitePage tables to your database yet.",
      action: 'Run "pnpm db:push", then restart the dev server.',
    }
  }

  return {
    title: "CMS is temporarily unavailable.",
    description: "The admin CMS could not connect to the live content database.",
    action: "Check DATABASE_URL and rerun Prisma generation if the schema was recently changed.",
  }
}

export async function getAdminCmsPages() {
  const prisma = getPrismaClient()

  return prisma.websitePage.findMany({
    orderBy: [{ navigationSortOrder: "asc" }, { updatedAt: "desc" }],
    include: {
      _count: {
        select: {
          revisions: true,
        },
      },
    },
  })
}

export async function getAdminCmsRevisions(pageId: string) {
  const prisma = getPrismaClient()

  return prisma.websitePageRevision.findMany({
    where: {
      pageId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 12,
  })
}

export async function upsertCmsPage(input: CmsPageInput, editorEmail?: string) {
  const prisma = getPrismaClient()
  const slug = normalizeSlug(input.slug)

  if (!slug) {
    throw new Error("Page slug is required.")
  }

  if (reservedSlugs.has(slug)) {
    throw new Error(`/${slug} is reserved by the application. Use a custom campaign or landing page slug.`)
  }

  const now = new Date()
  const existing = await prisma.websitePage.findUnique({
    where: {
      slug,
    },
  })
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
  const status = input.status === "SCHEDULED" && !scheduledAt ? "DRAFT" : input.status
  const publishedAt =
    status === "PUBLISHED" ? existing?.publishedAt || now : status === "SCHEDULED" ? null : existing?.publishedAt || null
  const sections = normalizeSections(input.sections)
  const writeData = {
    title: cleanText(input.title, 160),
    status,
    seoTitle: cleanText(input.seoTitle, 180) || null,
    seoDescription: cleanText(input.seoDescription, 300) || null,
    heroEyebrow: cleanText(input.heroEyebrow, 90) || null,
    heroTitle: cleanText(input.heroTitle, 180),
    heroBody: cleanText(input.heroBody, 1200) || null,
    heroImage: cleanText(input.heroImage, 500) || null,
    heroCtaLabel: cleanText(input.heroCtaLabel, 80) || null,
    heroCtaHref: cleanText(input.heroCtaHref, 500) || null,
    sections: sections.length > 0 ? sections : undefined,
    showInNavigation: Boolean(input.showInNavigation),
    navigationLabel: cleanText(input.navigationLabel, 60) || null,
    navigationSortOrder: Number.isFinite(input.navigationSortOrder) ? input.navigationSortOrder : 100,
    scheduledAt,
    publishedAt,
    updatedByAdminEmail: editorEmail || null,
  }

  if (!writeData.title) {
    throw new Error("Page title is required.")
  }

  if (!writeData.heroTitle) {
    throw new Error("Hero title is required.")
  }

  const page = await prisma.websitePage.upsert({
    where: {
      slug,
    },
    update: writeData,
    create: {
      slug,
      ...writeData,
      createdByAdminEmail: editorEmail || null,
    },
  })

  await prisma.websitePageRevision.create({
    data: {
      pageId: page.id,
      editorEmail: editorEmail || null,
      snapshot: snapshotPage(page),
    },
  })

  return page
}

export async function archiveCmsPage(slug: string, editorEmail?: string) {
  const prisma = getPrismaClient()
  const normalizedSlug = normalizeSlug(slug)

  if (!normalizedSlug) {
    throw new Error("Page slug is required.")
  }

  const page = await prisma.websitePage.update({
    where: {
      slug: normalizedSlug,
    },
    data: {
      status: "ARCHIVED",
      showInNavigation: false,
      updatedByAdminEmail: editorEmail || null,
    },
  })

  await prisma.websitePageRevision.create({
    data: {
      pageId: page.id,
      editorEmail: editorEmail || null,
      snapshot: snapshotPage(page),
    },
  })

  return page
}

export async function getPublishedCmsPage(slug: string) {
  const prisma = getPrismaClient()
  const normalizedSlug = normalizeSlug(slug)

  if (!normalizedSlug) {
    return null
  }

  try {
    return await prisma.websitePage.findFirst({
      where: {
        slug: normalizedSlug,
        OR: [
          {
            status: "PUBLISHED",
          },
          {
            status: "SCHEDULED",
            scheduledAt: {
              lte: new Date(),
            },
          },
        ],
      },
    })
  } catch (error) {
    if (isMissingCmsTable(error)) {
      return null
    }

    throw error
  }
}

export async function getPublishedNavigationPages() {
  const prisma = getPrismaClient()

  try {
    return await prisma.websitePage.findMany({
      where: {
        showInNavigation: true,
        OR: [
          {
            status: "PUBLISHED",
          },
          {
            status: "SCHEDULED",
            scheduledAt: {
              lte: new Date(),
            },
          },
        ],
      },
      orderBy: [{ navigationSortOrder: "asc" }, { title: "asc" }],
      select: {
        slug: true,
        title: true,
        navigationLabel: true,
      },
      take: 8,
    })
  } catch (error) {
    if (isMissingCmsTable(error)) {
      return []
    }

    throw error
  }
}
