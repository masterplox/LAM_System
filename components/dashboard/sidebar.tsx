"use client"

import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MapPin, LogOut, Map, FileText, Users, LayoutDashboard, Settings, Menu } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  user: User
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/dashboard/properties", icon: Map },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Stakeholders", href: "/dashboard/stakeholders", icon: Users },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

function NavContent({ user, onSignOut, pathname }: { user: User; onSignOut: () => void; pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4 text-primary">
        <MapPin className="h-6 w-6" />
        <span className="text-lg font-semibold">LandAsset</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="mb-3 truncate text-sm text-muted-foreground">{user.email}</div>
        <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

export function Sidebar({ user }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <NavContent user={user} onSignOut={handleSignOut} pathname={pathname} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-5 w-5" />
          <span className="font-semibold">LandAsset</span>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r bg-background lg:block">
        <NavContent user={user} onSignOut={handleSignOut} pathname={pathname} />
      </aside>
    </>
  )
}
