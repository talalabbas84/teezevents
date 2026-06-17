import { Database } from "lucide-react"

import { AdminCmsStudio } from "@/components/admin-cms-studio"
import { Card, CardContent } from "@/components/ui/card"
import { requireAdminSession } from "@/lib/admin-auth"
import { getAdminCmsPages, getCmsSetupIssue } from "@/lib/cms"

export default async function AdminCmsPage() {
  await requireAdminSession()
  let pages: Awaited<ReturnType<typeof getAdminCmsPages>> = []
  let setupIssue: ReturnType<typeof getCmsSetupIssue> | null = null

  try {
    pages = await getAdminCmsPages()
  } catch (error) {
    setupIssue = getCmsSetupIssue(error)
  }

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
          <h1 className="mt-1.5 text-4xl font-serif font-bold">Website CMS</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage landing pages, SEO, publishing workflow, navigation, and content sections.
          </p>
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
