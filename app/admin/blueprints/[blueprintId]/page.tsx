import { requireAdminSession } from "@/lib/admin-auth"
import { getBlueprintById } from "@/lib/planning/queries"
import { notFound } from "next/navigation"
import { BlueprintEditorClient } from "@/components/planning/blueprint-editor"

type Props = {
  params: Promise<{ blueprintId: string }>
}

export default async function BlueprintEditPage({ params }: Props) {
  await requireAdminSession()

  const { blueprintId } = await params
  const blueprint = await getBlueprintById(blueprintId)

  if (!blueprint) {
    notFound()
  }

  return <BlueprintEditorClient mode="edit" initialBlueprint={blueprint} />
}
