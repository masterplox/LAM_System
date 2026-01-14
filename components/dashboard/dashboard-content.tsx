"use client"

import type { User } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Map, TrendingUp, Users, DollarSign, Package, CreditCard, Calendar, BarChart3 } from "lucide-react"
import { Sidebar } from "./sidebar"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"

interface DashboardContentProps {
  user: User
}

interface DashboardStats {
  totalProperties: number
  totalSubdivisions: number
  totalPortfolioValue: number
  totalRevenue: number
  activeBuyers: number
  soldLots: number
  availableLots: number
  mortgageLots: number
  onHoldLots: number
  paidInFullLots: number
}

interface RecentPayment {
  id: string
  amount: number
  payment_date: string
  buyer?: {
    name: string
  } | null
  propertyTitle?: string | null
  subdivisionTitle?: string | null
}

interface RecentSale {
  id: string
  title: string
  sale_price: number
  status: string
  buyer?: {
    name: string
  } | null
  propertyTitle?: string | null
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalSubdivisions: 0,
    totalPortfolioValue: 0,
    totalRevenue: 0,
    activeBuyers: 0,
    soldLots: 0,
    availableLots: 0,
    mortgageLots: 0,
    onHoldLots: 0,
    paidInFullLots: 0,
  })
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      // Fetch properties count
      const { count: propertiesCount } = await supabase.from("properties").select("*", { count: "exact", head: true })

      // Fetch subdivisions with status breakdown
      const { data: subdivisions, error: subError } = await supabase
        .from("subdivisions")
        .select("id, sale_price, status")

      if (subError) {
        console.error("Error fetching subdivisions:", subError)
      }

      // Calculate subdivision stats
      const totalSubdivisions = subdivisions?.length || 0
      const totalPortfolioValue = subdivisions?.reduce((sum, sub) => sum + Number(sub.sale_price || 0), 0) || 0
      const soldLots = subdivisions?.filter((sub) => sub.status === "sold").length || 0
      const availableLots = subdivisions?.filter((sub) => sub.status === "available").length || 0
      const mortgageLots = subdivisions?.filter((sub) => sub.status === "mortgage").length || 0
      const onHoldLots = subdivisions?.filter((sub) => sub.status === "on_hold").length || 0
      const paidInFullLots = subdivisions?.filter((sub) => sub.status === "paid_in_full").length || 0

      // Fetch total revenue from payments
      const { data: payments, error: paymentsError } = await supabase.from("payments").select("amount")

      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError)
      }

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0

      // Fetch active buyers (distinct buyers with purchases)
      const { data: buyers, error: buyersError } = await supabase
        .from("buyers")
        .select("id", { count: "exact" })
        .not("id", "is", null)

      const activeBuyers = buyers?.length || 0

      // Fetch recent payments (last 5)
      const { data: recentPaymentsData, error: recentPaymentsError } = await supabase
        .from("payments")
        .select(
          `
          id,
          amount,
          payment_date,
          property_id,
          subdivision_id,
          buyer:buyers(name)
        `,
        )
        .order("payment_date", { ascending: false })
        .limit(5)

      if (recentPaymentsError) {
        console.error("Error fetching recent payments:", recentPaymentsError)
      }

      // Fetch property and subdivision titles for payments
      const enrichedPayments = await Promise.all(
        (recentPaymentsData || []).map(async (payment) => {
          let propertyTitle = null
          let subdivisionTitle = null

          if (payment.property_id) {
            const { data: property, error: propertyError } = await supabase
              .from("properties")
              .select("title")
              .eq("id", payment.property_id)
              .maybeSingle()
            if (!propertyError && property) {
              propertyTitle = property.title
            }
          }

          if (payment.subdivision_id) {
            const { data: subdivision, error: subdivisionError } = await supabase
              .from("subdivisions")
              .select("title")
              .eq("id", payment.subdivision_id)
              .maybeSingle()
            if (!subdivisionError && subdivision) {
              subdivisionTitle = subdivision.title
            }
          }

          return {
            ...payment,
            propertyTitle,
            subdivisionTitle,
          }
        }),
      )

      // Fetch recent sales (subdivisions sold in last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: recentSalesData, error: recentSalesError } = await supabase
        .from("subdivisions")
        .select(
          `
          id,
          title,
          sale_price,
          status,
          property_id,
          buyer:buyers(name),
          updated_at
        `,
        )
        .in("status", ["sold", "mortgage", "paid_in_full"])
        .gte("updated_at", thirtyDaysAgo.toISOString())
        .order("updated_at", { ascending: false })
        .limit(5)

      if (recentSalesError) {
        console.error("Error fetching recent sales:", recentSalesError)
      }

      // Fetch property titles for recent sales
      const enrichedSales = await Promise.all(
        (recentSalesData || []).map(async (sale) => {
          let propertyTitle = null
          if (sale.property_id) {
            const { data: property, error: propertyError } = await supabase
              .from("properties")
              .select("title")
              .eq("id", sale.property_id)
              .maybeSingle()
            if (!propertyError && property) {
              propertyTitle = property.title
            }
          }
          return {
            ...sale,
            propertyTitle,
          }
        }),
      )

      setStats({
        totalProperties: propertiesCount || 0,
        totalSubdivisions,
        totalPortfolioValue,
        totalRevenue,
        activeBuyers,
        soldLots,
        availableLots,
        mortgageLots,
        onHoldLots,
        paidInFullLots,
      })

      setRecentPayments(enrichedPayments || [])
      setRecentSales(enrichedSales || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const mainStats = [
    {
      title: "Total Properties",
      value: stats.totalProperties.toLocaleString(),
      description: "Land parcels in portfolio",
      icon: Map,
      trend: null,
    },
    {
      title: "Total Lots",
      value: stats.totalSubdivisions.toLocaleString(),
      description: "Subdivisions available",
      icon: Package,
      trend: null,
    },
    {
      title: "Portfolio Value",
      value: formatCurrency(stats.totalPortfolioValue),
      description: "Total estimated value",
      icon: TrendingUp,
      trend: null,
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      description: "Payments received",
      icon: DollarSign,
      trend: null,
    },
  ]

  const statusStats = [
    {
      title: "Available",
      value: stats.availableLots,
      color: "bg-blue-500",
    },
    {
      title: "Sold",
      value: stats.soldLots,
      color: "bg-green-500",
    },
    {
      title: "Mortgage",
      value: stats.mortgageLots,
      color: "bg-orange-500",
    },
    {
      title: "Paid in Full",
      value: stats.paidInFullLots,
      color: "bg-green-700",
    },
    {
      title: "On Hold",
      value: stats.onHoldLots,
      color: "bg-amber-500",
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
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Dashboard Overview</h1>
            <p className="mt-2 text-muted-foreground">
              High-level view of your business performance and key metrics at Codd and Associates.
            </p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {mainStats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground lg:text-sm">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold lg:text-2xl">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Secondary Stats */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mb-8">
            {/* Lot Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Lot Status Breakdown
                </CardTitle>
                <CardDescription>Distribution of lots by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusStats.map((stat) => (
                    <div key={stat.title} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${stat.color}`} />
                        <span className="text-sm font-medium">{stat.title}</span>
                      </div>
                      <span className="text-sm font-bold">{stat.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Total Active Buyers</span>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-bold">{stats.activeBuyers.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Sales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Sales (Last 30 Days)
                </CardTitle>
                <CardDescription>Recently completed transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {recentSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No recent sales</p>
                ) : (
                  <div className="space-y-3">
                    {recentSales.map((sale) => (
                      <div key={sale.id} className="flex items-start justify-between pb-3 border-b last:border-0 last:pb-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{sale.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {sale.propertyTitle || "Property"}
                            {sale.buyer && ` • ${sale.buyer.name}`}
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-sm font-bold">{formatCurrency(Number(sale.sale_price || 0))}</p>
                          <Badge
                            variant="secondary"
                            className={
                              sale.status === "paid_in_full"
                                ? "bg-green-700 text-white"
                                : sale.status === "sold"
                                  ? "bg-green-600 text-white"
                                  : "bg-orange-100 text-orange-700"
                            }
                          >
                            {sale.status === "paid_in_full" ? "Paid" : sale.status === "sold" ? "Sold" : "Mortgage"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recent Payments
              </CardTitle>
              <CardDescription>Latest payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No recent payments</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Property/Lot</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>{payment.buyer?.name || "N/A"}</TableCell>
                        <TableCell>{payment.subdivisionTitle || payment.propertyTitle || "N/A"}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(Number(payment.amount || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
