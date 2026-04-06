import { ContactPageContent } from "@/components/contact-page-content"

type SearchParamValue = string | string[] | undefined

type ContactPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>> | Record<string, SearchParamValue>
}

function getSingleParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const eventParam = getSingleParam(resolvedSearchParams.event)
  const intentParam = getSingleParam(resolvedSearchParams.intent)

  return <ContactPageContent eventParam={eventParam} intentParam={intentParam} />
}
