import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CmsPageRenderer } from "@/components/cms-page-renderer"
import { getPublishedCmsPage } from "@/lib/cms"

type CmsSlugPageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: CmsSlugPageProps): Promise<Metadata> {
  const { slug } = await params
  const page = await getPublishedCmsPage(slug)

  if (!page) {
    return {}
  }

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.heroBody || undefined,
    openGraph: {
      title: page.seoTitle || page.title,
      description: page.seoDescription || page.heroBody || undefined,
      images: page.heroImage ? [{ url: page.heroImage }] : undefined,
    },
  }
}

export default async function CmsSlugPage({ params }: CmsSlugPageProps) {
  const { slug } = await params
  const page = await getPublishedCmsPage(slug)

  if (!page) {
    notFound()
  }

  return (
    <CmsPageRenderer
      page={{
        slug: page.slug,
        title: page.title,
        heroEyebrow: page.heroEyebrow,
        heroTitle: page.heroTitle,
        heroBody: page.heroBody,
        heroImage: page.heroImage,
        heroCtaLabel: page.heroCtaLabel,
        heroCtaHref: page.heroCtaHref,
        sections: page.sections,
      }}
    />
  )
}
