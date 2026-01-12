import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PropertyDetailContent } from "@/components/properties/property-detail-content"

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select(`*, buyer:buyers(*)`)
    .eq("id", id)
    .single()

  if (propertyError || !property) {
    redirect("/dashboard/properties")
  }

  const { data: subdivisions } = await supabase
    .from("subdivisions")
    .select(`*, buyer:buyers(*)`)
    .eq("property_id", id)
    .order("created_at", { ascending: false })

  return <PropertyDetailContent property={property} initialSubdivisions={subdivisions || []} />
}
