import { Sidebar } from "@/components/dashboard/sidebar"
import { SearchContent } from "@/components/properties/search-content"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function SearchPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      <main className="lg:pl-64">
        <SearchContent />
      </main>
    </div>
  )
}
