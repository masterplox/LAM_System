"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase/client"
import { Search, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface SearchFilters {
  sale_price: string
  surveyor_plan_number: string
  registration_number: string
  lot_number: string
  mutation_number: string
  owner_first_name: string
  owner_middle_name: string
  owner_last_name: string
  title_nes_number: string
  submission_date: string
  acres: string
}

interface SearchResult {
  id: string
  title: string
  sale_price: number
  status: string
  lot_number: string | null
  surveyor_plan_number: string | null
  registration_number: string | null
  mutation_number: string | null
  owner_first_name: string | null
  owner_middle_name: string | null
  owner_last_name: string | null
  title_nes_number: string | null
  submission_date: string | null
  acres: number | null
  property_title: string
}

export function SearchContent() {
  const router = useRouter()
  const [filters, setFilters] = useState<SearchFilters>({
    sale_price: "",
    surveyor_plan_number: "",
    registration_number: "",
    lot_number: "",
    mutation_number: "",
    owner_first_name: "",
    owner_middle_name: "",
    owner_last_name: "",
    title_nes_number: "",
    submission_date: "",
    acres: "",
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      sale_price: "",
      surveyor_plan_number: "",
      registration_number: "",
      lot_number: "",
      mutation_number: "",
      owner_first_name: "",
      owner_middle_name: "",
      owner_last_name: "",
      title_nes_number: "",
      submission_date: "",
      acres: "",
    })
    setResults([])
    setHasSearched(false)
  }

  const performSearch = async () => {
    setIsSearching(true)
    setHasSearched(true)

    try {
      const supabase = createClient()
      let query = supabase
        .from("subdivisions")
        .select(`
          id,
          title,
          sale_price,
          status,
          lot_number,
          surveyor_plan_number,
          registration_number,
          mutation_number,
          owner_first_name,
          owner_middle_name,
          owner_last_name,
          title_nes_number,
          submission_date,
          acres,
          properties(title)
        `)

      // Apply filters
      if (filters.sale_price) {
        const price = Number.parseFloat(filters.sale_price)
        if (!Number.isNaN(price)) {
          query = query.eq("sale_price", price)
        }
      }

      if (filters.surveyor_plan_number) {
        query = query.ilike("surveyor_plan_number", `%${filters.surveyor_plan_number}%`)
      }

      if (filters.registration_number) {
        query = query.ilike("registration_number", `%${filters.registration_number}%`)
      }

      if (filters.lot_number) {
        query = query.ilike("lot_number", `%${filters.lot_number}%`)
      }

      if (filters.mutation_number) {
        query = query.ilike("mutation_number", `%${filters.mutation_number}%`)
      }

      if (filters.owner_first_name) {
        query = query.ilike("owner_first_name", `%${filters.owner_first_name}%`)
      }

      if (filters.owner_middle_name) {
        query = query.ilike("owner_middle_name", `%${filters.owner_middle_name}%`)
      }

      if (filters.owner_last_name) {
        query = query.ilike("owner_last_name", `%${filters.owner_last_name}%`)
      }

      if (filters.title_nes_number) {
        query = query.ilike("title_nes_number", `%${filters.title_nes_number}%`)
      }

      if (filters.submission_date) {
        query = query.eq("submission_date", filters.submission_date)
      }

      if (filters.acres) {
        const acres = Number.parseFloat(filters.acres)
        if (!Number.isNaN(acres)) {
          query = query.eq("acres", acres)
        }
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) {
        console.error("Search error:", error)
        setResults([])
      } else {
        const formattedResults: SearchResult[] = (data || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          sale_price: item.sale_price || 0,
          status: item.status,
          lot_number: item.lot_number,
          surveyor_plan_number: item.surveyor_plan_number,
          registration_number: item.registration_number,
          mutation_number: item.mutation_number,
          owner_first_name: item.owner_first_name,
          owner_middle_name: item.owner_middle_name,
          owner_last_name: item.owner_last_name,
          title_nes_number: item.title_nes_number,
          submission_date: item.submission_date,
          acres: item.acres,
          property_title: item.properties?.title || "Unknown Property",
        }))
        setResults(formattedResults)
      }
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleResultClick = (subdivisionId: string) => {
    router.push(`/dashboard/subdivisions/${subdivisionId}`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "sold":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "on_hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "mortgage":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "paid_in_full":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
      case "recalled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const hasActiveFilters = Object.values(filters).some((value) => value.trim() !== "")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search Subdivisions</h1>
        <p className="text-muted-foreground mt-2">Search for subdivisions using any of the available filters</p>
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Search Filters</CardTitle>
              <CardDescription>Enter any combination of filters to search for subdivisions</CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="sale_price">Sales Price</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                placeholder="e.g., 50000"
                value={filters.sale_price}
                onChange={(e) => handleFilterChange("sale_price", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surveyor_plan_number">Surveyor Plan Number</Label>
              <Input
                id="surveyor_plan_number"
                type="text"
                placeholder="Enter plan number"
                value={filters.surveyor_plan_number}
                onChange={(e) => handleFilterChange("surveyor_plan_number", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration Number</Label>
              <Input
                id="registration_number"
                type="text"
                placeholder="Enter registration number"
                value={filters.registration_number}
                onChange={(e) => handleFilterChange("registration_number", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lot_number">Lot Number</Label>
              <Input
                id="lot_number"
                type="text"
                placeholder="Enter lot number"
                value={filters.lot_number}
                onChange={(e) => handleFilterChange("lot_number", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mutation_number">Mutation Number</Label>
              <Input
                id="mutation_number"
                type="text"
                placeholder="Enter mutation number"
                value={filters.mutation_number}
                onChange={(e) => handleFilterChange("mutation_number", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_first_name">First Name</Label>
              <Input
                id="owner_first_name"
                type="text"
                placeholder="Enter first name"
                value={filters.owner_first_name}
                onChange={(e) => handleFilterChange("owner_first_name", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_middle_name">Middle Name</Label>
              <Input
                id="owner_middle_name"
                type="text"
                placeholder="Enter middle name"
                value={filters.owner_middle_name}
                onChange={(e) => handleFilterChange("owner_middle_name", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_last_name">Last Name</Label>
              <Input
                id="owner_last_name"
                type="text"
                placeholder="Enter last name"
                value={filters.owner_last_name}
                onChange={(e) => handleFilterChange("owner_last_name", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title_nes_number">Title NES Number</Label>
              <Input
                id="title_nes_number"
                type="text"
                placeholder="Enter title NES number"
                value={filters.title_nes_number}
                onChange={(e) => handleFilterChange("title_nes_number", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="submission_date">Submission Date</Label>
              <Input
                id="submission_date"
                type="date"
                value={filters.submission_date}
                onChange={(e) => handleFilterChange("submission_date", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acres">Acres</Label>
              <Input
                id="acres"
                type="number"
                step="0.01"
                placeholder="e.g., 2.5"
                value={filters.acres}
                onChange={(e) => handleFilterChange("acres", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={performSearch} disabled={isSearching || !hasActiveFilters} className="min-w-[120px]">
              {isSearching ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              {isSearching
                ? "Searching..."
                : results.length === 0
                  ? "No subdivisions found matching your search criteria"
                  : `Found ${results.length} subdivision${results.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-8 w-8 text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No results found. Try adjusting your search filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => handleResultClick(result.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{result.title}</h3>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(result.status)}`}>
                              {result.status.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">Property: {result.property_title}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                            {result.sale_price > 0 && (
                              <div>
                                <span className="text-muted-foreground">Sale Price: </span>
                                <span className="font-medium">{formatCurrency(result.sale_price)}</span>
                              </div>
                            )}
                            {result.lot_number && (
                              <div>
                                <span className="text-muted-foreground">Lot #: </span>
                                <span className="font-medium">{result.lot_number}</span>
                              </div>
                            )}
                            {result.acres && (
                              <div>
                                <span className="text-muted-foreground">Acres: </span>
                                <span className="font-medium">{result.acres}</span>
                              </div>
                            )}
                            {result.submission_date && (
                              <div>
                                <span className="text-muted-foreground">Submission: </span>
                                <span className="font-medium">{formatDate(result.submission_date)}</span>
                              </div>
                            )}
                            {result.owner_first_name && (
                              <div>
                                <span className="text-muted-foreground">Owner: </span>
                                <span className="font-medium">
                                  {[result.owner_first_name, result.owner_middle_name, result.owner_last_name]
                                    .filter(Boolean)
                                    .join(" ")}
                                </span>
                              </div>
                            )}
                            {result.surveyor_plan_number && (
                              <div>
                                <span className="text-muted-foreground">Plan #: </span>
                                <span className="font-medium">{result.surveyor_plan_number}</span>
                              </div>
                            )}
                            {result.registration_number && (
                              <div>
                                <span className="text-muted-foreground">Registration: </span>
                                <span className="font-medium">{result.registration_number}</span>
                              </div>
                            )}
                            {result.mutation_number && (
                              <div>
                                <span className="text-muted-foreground">Mutation: </span>
                                <span className="font-medium">{result.mutation_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
