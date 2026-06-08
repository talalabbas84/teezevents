import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import type { CmsSection } from "@/lib/cms"

type CmsPageRendererProps = {
  page: {
    slug: string
    title: string
    heroEyebrow: string | null
    heroTitle: string
    heroBody: string | null
    heroImage: string | null
    heroCtaLabel: string | null
    heroCtaHref: string | null
    sections: unknown
  }
}

function getSections(value: unknown) {
  return Array.isArray(value) ? (value as CmsSection[]) : []
}

function sectionClass(section: CmsSection) {
  if (section.background === "DARK") {
    return "bg-[#1C2431] text-white"
  }

  if (section.background === "MUTED") {
    return "bg-muted/30"
  }

  return "bg-background"
}

function proseColor(section: CmsSection) {
  return section.background === "DARK" ? "text-white/75" : "text-muted-foreground"
}

function renderItems(section: CmsSection) {
  if (!section.items?.length) {
    return null
  }

  if (section.kind === "GALLERY") {
    return (
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => (
          <figure key={`${section.id}-${item.title}`} className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
            <img src={item.image || "/placeholder.svg"} alt={item.title} className="aspect-[4/3] w-full object-cover" />
            <figcaption className="p-4">
              <div className="font-serif text-xl font-bold">{item.title}</div>
              {item.body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
    )
  }

  if (section.kind === "STATS") {
    return (
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {section.items.map((item) => (
          <div key={`${section.id}-${item.title}`} className="rounded-lg border border-border bg-background/90 p-5 shadow-sm">
            <div className="text-4xl font-serif font-bold text-primary">{item.value || item.title}</div>
            <div className="mt-2 font-semibold text-foreground">{item.value ? item.title : item.label}</div>
            {item.body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>}
          </div>
        ))}
      </div>
    )
  }

  if (section.kind === "FAQ") {
    return (
      <div className="mt-10 grid gap-3">
        {section.items.map((item) => (
          <div key={`${section.id}-${item.title}`} className="rounded-lg border border-border bg-background/90 p-5 shadow-sm">
            <div className="font-serif text-xl font-bold">{item.title}</div>
            {item.body && <p className="mt-3 leading-relaxed text-muted-foreground">{item.body}</p>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {section.items.map((item) => (
        <article key={`${section.id}-${item.title}`} className="rounded-lg border border-border bg-background/90 p-6 shadow-sm">
          {item.image && <img src={item.image} alt="" className="mb-5 aspect-video w-full rounded-lg object-cover" />}
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 shrink-0 text-primary" size={20} />
            <div>
              <h3 className="text-xl font-serif font-bold">{item.title}</h3>
              {item.body && <p className="mt-3 leading-relaxed text-muted-foreground">{item.body}</p>}
              {item.href && (
                <Link href={item.href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {item.label || "Learn more"}
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function renderSection(section: CmsSection) {
  if (section.kind === "CTA") {
    return (
      <section id={section.id} className={sectionClass(section)}>
        <div className="container mx-auto px-4 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl text-center">
            {section.eyebrow && <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{section.eyebrow}</div>}
            <h2 className="mt-4 text-4xl font-serif font-bold text-balance md:text-5xl">{section.title}</h2>
            {section.body && <p className={`mt-5 text-lg leading-relaxed ${proseColor(section)}`}>{section.body}</p>}
            {section.ctaLabel && section.ctaHref && (
              <div className="mt-8">
                <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                  <Link href={section.ctaHref}>{section.ctaLabel}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id={section.id} className={sectionClass(section)}>
      <div className="container mx-auto px-4 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            {section.eyebrow && <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{section.eyebrow}</div>}
            <h2 className="mt-4 text-4xl font-serif font-bold text-balance md:text-5xl">{section.title}</h2>
            {section.body && <p className={`mt-5 whitespace-pre-line text-lg leading-relaxed ${proseColor(section)}`}>{section.body}</p>}
            {section.ctaLabel && section.ctaHref && (
              <div className="mt-8">
                <Button asChild variant={section.background === "DARK" ? "outline" : "default"} className="border-primary">
                  <Link href={section.ctaHref}>{section.ctaLabel}</Link>
                </Button>
              </div>
            )}
          </div>
          <div>
            {section.image ? (
              <img src={section.image} alt="" className="aspect-[4/3] w-full rounded-lg border border-border object-cover shadow-xl" />
            ) : (
              renderItems(section)
            )}
          </div>
        </div>
        {section.image && renderItems(section)}
      </div>
    </section>
  )
}

export function CmsPageRenderer({ page }: CmsPageRendererProps) {
  const sections = getSections(page.sections)

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <section className="bg-[#1C2431] text-white">
          {page.heroImage && <img src={page.heroImage} alt="" className="h-[52vh] min-h-[420px] w-full object-cover opacity-80" />}
          <div className="container mx-auto px-4 py-16 lg:px-8 lg:py-24">
            <div className="max-w-5xl">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                {page.heroEyebrow || "TEEZ Events"}
              </div>
              <h1 className="mt-5 text-5xl font-serif font-bold leading-tight text-balance md:text-7xl">{page.heroTitle}</h1>
              {page.heroBody && <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/75">{page.heroBody}</p>}
              {page.heroCtaLabel && page.heroCtaHref && (
                <div className="mt-9">
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                    <Link href={page.heroCtaHref}>
                      {page.heroCtaLabel}
                      <ArrowRight className="ml-2" size={18} />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {sections.map((section) => renderSection(section))}
      </div>
      <Footer />
    </main>
  )
}
