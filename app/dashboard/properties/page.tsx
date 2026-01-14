import { Sidebar } from "@/components/dashboard/sidebar"
import { PropertiesContent } from "@/components/properties/properties-content"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function PropertiesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: properties, error } = await supabase
    .from("properties")
    .select(`
      *,
      buyer:buyers(*),
      subdivisions (
        id,
        sale_price
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching properties:", error)
  }

  const propertiesWithStats = (properties || []).map((property) => ({
    ...property,
    subdivision_count: property.subdivisions?.length || 0,
    total_value:
      property.subdivisions?.reduce((sum: number, sub: { sale_price: number | null }) => sum + (sub.sale_price || 0), 0) || 0,
    subdivisions: undefined,
  }))

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      <main className="lg:pl-64">
        <PropertiesContent initialProperties={propertiesWithStats} />
      </main>
    </div>
  )
}
