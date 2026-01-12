"use client"

import type { User } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Map, FileText, Users, TrendingUp } from "lucide-react"
import { Sidebar } from "./sidebar"

interface DashboardContentProps {
  user: User
}

export function DashboardContent({ user }: DashboardContentProps) {
  const stats = [
    {
      title: "Total Properties",
      value: "0",
      description: "Land parcels registered",
      icon: Map,
    },
    {
      title: "Active Documents",
      value: "0",
      description: "Legal documents on file",
      icon: FileText,
    },
    {
      title: "Stakeholders",
      value: "0",
      description: "Connected parties",
      icon: Users,
    },
    {
      title: "Portfolio Value",
      value: "$0",
      description: "Estimated total value",
      icon: TrendingUp,
    },
  ]

  return (
    <div className="min-h-screen bg-muted/40">
      <Sidebar user={user} />

      {/* Main Content - offset for sidebar on desktop */}
      <main className="lg:pl-64">
        <div className="container mx-auto px-4 py-6 lg:py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Welcome back!</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your land assets, documents, and stakeholders all in one place.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground lg:text-sm">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold lg:text-2xl">{stat.value}</div>
                  <p className="text-xs text-muted-foreground hidden sm:block">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold lg:text-xl">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Map className="h-5 w-5 text-primary" />
                    Add Property
                  </CardTitle>
                  <CardDescription className="hidden sm:block">
                    Register a new land parcel to your portfolio
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 text-primary" />
                    Upload Document
                  </CardTitle>
                  <CardDescription className="hidden sm:block">Add legal documents, deeds, or surveys</CardDescription>
                </CardHeader>
              </Card>
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-primary" />
                    Manage Stakeholders
                  </CardTitle>
                  <CardDescription className="hidden sm:block">Add or update connected parties</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Getting Started */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Complete these steps to set up your land asset management system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Add your first property</p>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      Register a land parcel with location and details
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Upload property documents</p>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      Add deeds, surveys, and legal paperwork
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Connect stakeholders</p>
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      Link owners, tenants, and other parties
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
