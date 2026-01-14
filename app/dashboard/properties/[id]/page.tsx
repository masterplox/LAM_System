import { Sidebar } from "@/components/dashboard/sidebar"
import { PropertyDetailContent } from "@/components/properties/property-detail-content"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      <main className="lg:pl-64">
        <PropertyDetailContent property={property} initialSubdivisions={subdivisions || []} />
      </main>
    </div>
  )
}
