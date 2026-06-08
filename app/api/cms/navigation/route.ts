import { NextResponse } from "next/server"

import { getPublishedNavigationPages } from "@/lib/cms"

export const runtime = "nodejs"

export async function GET() {
  const pages = await getPublishedNavigationPages()

  return NextResponse.json({
    pages: pages.map((page) => ({
      href: `/${page.slug}`,
      label: page.navigationLabel || page.title,
    })),
  })
}
