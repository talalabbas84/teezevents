import { NextResponse } from "next/server"
import { z } from "zod"

import { archiveCmsPage, upsertCmsPage } from "@/lib/cms"
import { getAdminSession } from "@/lib/admin-auth"

export const runtime = "nodejs"

const cmsSectionItemSchema = z.object({
  title: z.string().trim().max(120).default(""),
  body: z.string().trim().max(800).optional(),
  image: z.string().trim().max(500).optional(),
  href: z.string().trim().max(500).optional(),
  label: z.string().trim().max(80).optional(),
  value: z.string().trim().max(80).optional(),
})

const cmsSectionSchema = z.object({
  id: z.string().trim().max(80).default(""),
  kind: z.enum(["RICH_TEXT", "FEATURE_GRID", "CTA", "FAQ", "GALLERY", "STATS"]).default("RICH_TEXT"),
  title: z.string().trim().max(140).default(""),
  eyebrow: z.string().trim().max(80).optional(),
  body: z.string().trim().max(5000).optional(),
  items: z.array(cmsSectionItemSchema).max(12).default([]),
  image: z.string().trim().max(500).optional(),
  ctaLabel: z.string().trim().max(80).optional(),
  ctaHref: z.string().trim().max(500).optional(),
  background: z.enum(["DEFAULT", "MUTED", "DARK"]).default("DEFAULT"),
})

const cmsPageSchema = z.object({
  slug: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(160),
  status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  seoTitle: z.string().trim().max(180).optional(),
  seoDescription: z.string().trim().max(300).optional(),
  heroEyebrow: z.string().trim().max(90).optional(),
  heroTitle: z.string().trim().min(2).max(180),
  heroBody: z.string().trim().max(1200).optional(),
  heroImage: z.string().trim().max(500).optional(),
  heroCtaLabel: z.string().trim().max(80).optional(),
  heroCtaHref: z.string().trim().max(500).optional(),
  sections: z.array(cmsSectionSchema).max(24).default([]),
  showInNavigation: z.boolean().default(false),
  navigationLabel: z.string().trim().max(60).optional(),
  navigationSortOrder: z.coerce.number().int().min(0).max(999).default(100),
  scheduledAt: z.string().trim().max(40).optional(),
})

export async function POST(request: Request) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = cmsPageSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid CMS page payload." }, { status: 400 })
  }

  try {
    const page = await upsertCmsPage(parsed.data, session.email)

    return NextResponse.json({
      ok: true,
      pageId: page.id,
      slug: page.slug,
      status: page.status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save CMS page."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const url = new URL(request.url)
  const slug = url.searchParams.get("slug")?.trim()

  if (!slug) {
    return NextResponse.json({ error: "Page slug is required." }, { status: 400 })
  }

  try {
    const page = await archiveCmsPage(slug, session.email)

    return NextResponse.json({
      ok: true,
      slug: page.slug,
      status: page.status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to archive CMS page."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
