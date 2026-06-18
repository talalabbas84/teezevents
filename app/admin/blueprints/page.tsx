import { requireAdminSession } from "@/lib/admin-auth"
import { getEventBlueprints } from "@/lib/planning/queries"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  LayoutTemplate,
  Plus,
  ChevronRight,
  ClipboardList,
  CheckSquare,
  DollarSign,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default async function BlueprintsPage() {
  await requireAdminSession()
  const blueprints = await getEventBlueprints()

  return (
    <div className="min-h-screen bg-[#F7EDDB] p-6 md:p-10">
      {/* Page heading */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <LayoutTemplate className="h-7 w-7 text-[#c57a3a]" />
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-stone-800">
            Blueprints
          </h1>
        </div>
        <p className="text-stone-500 text-base mt-1 ml-10">
          Reusable event planning templates
        </p>
      </div>

      {blueprints.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[#c57a3a]/10 flex items-center justify-center mb-4">
            <LayoutTemplate className="h-8 w-8 text-[#c57a3a]" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-stone-700 mb-2">
            No blueprints yet
          </h2>
          <p className="text-stone-500 mb-6 max-w-sm">
            Create your first event blueprint to streamline future event planning
            with pre-built tasks, checklists, budgets, and timelines.
          </p>
          <Button
            asChild
            className="bg-[#c57a3a] hover:bg-[#a8622e] text-white font-medium"
          >
            <Link href="/admin/blueprints/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Blueprint
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Create Blueprint card */}
          <Link href="/admin/blueprints/new" className="group block">
            <Card
              className={cn(
                "h-full border-2 border-dashed border-[#c57a3a]/40 bg-transparent",
                "hover:border-[#c57a3a] hover:bg-[#c57a3a]/5 transition-all duration-200 cursor-pointer"
              )}
            >
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full border-2 border-dashed border-[#c57a3a]/50",
                    "flex items-center justify-center group-hover:border-[#c57a3a] transition-colors"
                  )}
                >
                  <Plus className="h-6 w-6 text-[#c57a3a]" />
                </div>
                <span className="font-serif text-lg font-semibold text-[#c57a3a]">
                  Create Blueprint
                </span>
                <span className="text-stone-500 text-sm text-center">
                  Start a new reusable event template
                </span>
              </CardContent>
            </Card>
          </Link>

          {/* Blueprint cards */}
          {blueprints.map((blueprint) => (
            <Card
              key={blueprint.id}
              className="bg-white border border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-serif text-lg font-semibold text-stone-800 leading-tight">
                    {blueprint.name}
                  </CardTitle>
                  {blueprint.category && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 bg-[#c57a3a]/10 text-[#c57a3a] border-0 text-xs capitalize"
                    >
                      {blueprint.category}
                    </Badge>
                  )}
                </div>
                {blueprint.description && (
                  <CardDescription className="text-stone-500 text-sm line-clamp-2 mt-1">
                    {blueprint.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="pt-0 pb-4 flex flex-col gap-4">
                {/* Tags */}
                {blueprint.tags && blueprint.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {blueprint.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs text-stone-500 border-stone-300 py-0 px-2"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Item counts */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <ClipboardList className="h-3.5 w-3.5 text-stone-400" />
                    <span>{blueprint.taskCount} tasks</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <CheckSquare className="h-3.5 w-3.5 text-stone-400" />
                    <span>{blueprint.checklistItemCount} checklist items</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <DollarSign className="h-3.5 w-3.5 text-stone-400" />
                    <span>{blueprint.budgetItemCount} budget items</span>
                  </div>
                </div>

                {/* View / Edit link */}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-1 w-full border-[#c57a3a]/40 text-[#c57a3a] hover:bg-[#c57a3a]/5 hover:border-[#c57a3a] hover:text-[#c57a3a]"
                >
                  <Link href={`/admin/blueprints/${blueprint.id}`}>
                    View / Edit
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
