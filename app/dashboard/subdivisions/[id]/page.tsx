import { Sidebar } from "@/components/dashboard/sidebar"
import { SubdivisionDetailContent } from "@/components/properties/subdivision-detail-content"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function SubdivisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: subdivision, error: subdivisionError } = await supabase
    .from("subdivisions")
    .select(`*, buyer:buyers(*)`)
    .eq("id", id)
    .single()

  if (subdivisionError || !subdivision) {
    redirect("/dashboard/search")
  }

  // Fetch the property title
  const { data: property } = await supabase
    .from("properties")
    .select("title")
    .eq("id", subdivision.property_id)
    .single()

  const propertyTitle = property?.title || "Unknown Property"

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      <main className="lg:pl-64">
        <SubdivisionDetailContent subdivision={subdivision} propertyTitle={propertyTitle} />
      </main>
    </div>
  )
}
