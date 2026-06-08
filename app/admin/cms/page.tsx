import Link from "next/link"
import { ArrowLeft, Database, Globe2 } from "lucide-react"

import { AdminCmsStudio } from "@/components/admin-cms-studio"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { requireAdminSession } from "@/lib/admin-auth"
import { getAdminCmsPages, getCmsSetupIssue } from "@/lib/cms"

export default async function AdminCmsPage() {
  const session = await requireAdminSession()
  let pages: Awaited<ReturnType<typeof getAdminCmsPages>> = []
  let setupIssue: ReturnType<typeof getCmsSetupIssue> | null = null

  try {
    pages = await getAdminCmsPages()
  } catch (error) {
    setupIssue = getCmsSetupIssue(error)
  }

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-10 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              <Globe2 size={16} />
              TEEZ Admin
            </div>
            <h1 className="mt-2 text-5xl font-serif font-bold text-balance">Website CMS</h1>
            <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
              Manage landing pages, SEO, publishing workflow, navigation, reusable content sections, and revision history.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{`Signed in as ${session.email}`}</p>
          </div>

          <Button asChild variant="outline" className="border-2 border-primary text-primary">
            <Link href="/admin">
              <span className="inline-flex items-center gap-2">
                <ArrowLeft size={16} />
                Back to Dashboard
              </span>
            </Link>
          </Button>
        </div>

        {setupIssue ? (
          <Card className="border border-border shadow-xl">
            <CardContent className="space-y-4 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Database size={24} />
              </div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">CMS Setup</div>
              <h2 className="text-3xl font-serif font-bold">{setupIssue.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{setupIssue.description}</p>
              {setupIssue.action && <p className="text-sm text-muted-foreground">{setupIssue.action}</p>}
            </CardContent>
          </Card>
        ) : (
          <AdminCmsStudio
            pages={pages.map((page) => ({
              id: page.id,
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
              sections: Array.isArray(page.sections) ? (page.sections as any) : [],
              showInNavigation: page.showInNavigation,
              navigationLabel: page.navigationLabel,
              navigationSortOrder: page.navigationSortOrder,
              publishedAt: page.publishedAt?.toISOString() || null,
              scheduledAt: page.scheduledAt?.toISOString() || null,
              updatedAt: page.updatedAt.toISOString(),
              updatedByAdminEmail: page.updatedByAdminEmail,
              revisionCount: page._count.revisions,
            }))}
          />
        )}
      </div>
    </main>
  )
}
