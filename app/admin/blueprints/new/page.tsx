import { requireAdminSession } from "@/lib/admin-auth"
import { BlueprintEditorClient } from "@/components/planning/blueprint-editor"

export default async function NewBlueprintPage() {
  await requireAdminSession()

  return <BlueprintEditorClient mode="new" />
}
