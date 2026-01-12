"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Pencil, Trash2, Grid3X3, DollarSign, User, CreditCard, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubdivisionDialog } from "./subdivision-dialog"
import { DeleteSubdivisionDialog } from "./delete-subdivision-dialog"
import { SaleDialog, type Buyer } from "./sale-dialog"
import { PaymentsDialog } from "./payments-dialog"
import { DocumentsManager } from "./documents-manager"
import { AllDocumentsView } from "./all-documents-view"
import { createClient } from "@/lib/supabase/client"
import type { Property } from "./properties-content"

export interface Subdivision {
  id: string
  property_id: string
  user_id: string
  title: string
  description: string | null
  cost: number
  status: "available" | "pending" | "sold"
  sale_price: number
  buyer_id: string | null
  buyer?: Buyer | null
  created_at: string
  updated_at: string
}

interface ExtendedProperty extends Property {
  status: "available" | "pending" | "sold"
  sale_price: number
  buyer_id: string | null
  buyer?: Buyer | null
}

interface PropertyDetailContentProps {
  property: ExtendedProperty
  initialSubdivisions: Subdivision[]
}

export function PropertyDetailContent({ property: initialProperty, initialSubdivisions }: PropertyDetailContentProps) {
  const [property, setProperty] = useState<ExtendedProperty>(initialProperty)
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>(initialSubdivisions)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSubdivision, setEditingSubdivision] = useState<Subdivision | null>(null)
  const [deletingSubdivision, setDeletingSubdivision] = useState<Subdivision | null>(null)
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false)
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false)
  const [subdivisionForSale, setSubdivisionForSale] = useState<Subdivision | null>(null)
  const [subdivisionForPayments, setSubdivisionForPayments] = useState<Subdivision | null>(null)
  const [propertyTotalPaid, setPropertyTotalPaid] = useState(0)
  const router = useRouter()

  const totalCost = subdivisions.reduce((sum, s) => sum + Number(s.cost), 0)
  const isPropertySold = property.status === "sold"

  // Fetch property payments on mount
  useEffect(() => {
    fetchPropertyPayments()
  }, [property.id])

  const fetchPropertyPayments = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("payments").select("amount").eq("property_id", property.id)

    if (data) {
      const total = data.reduce((sum, p) => sum + Number(p.amount), 0)
      setPropertyTotalPaid(total)
    }
  }

  const handleAddSubdivision = async (title: string, description: string, cost: number) => {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.error("No authenticated user found")
      return false
    }

    const { data, error } = await supabase
      .from("subdivisions")
      .insert({
        title,
        description,
        cost,
        property_id: property.id,
        user_id: user.id,
        status: "available",
        sale_price: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding subdivision:", error.message)
      return false
    }

    setSubdivisions([data, ...subdivisions])
    return true
  }

  const handleEditSubdivision = async (title: string, description: string, cost: number) => {
    if (!editingSubdivision) return false

    const supabase = createClient()
    const { data, error } = await supabase
      .from("subdivisions")
      .update({ title, description, cost })
      .eq("id", editingSubdivision.id)
      .select(`*, buyer:buyers(*)`)
      .single()

    if (error) {
      console.error("Error updating subdivision:", error)
      return false
    }

    setSubdivisions(subdivisions.map((s) => (s.id === data.id ? data : s)))
    return true
  }

  const handleDeleteSubdivision = async () => {
    if (!deletingSubdivision) return

    const supabase = createClient()
    const { error } = await supabase.from("subdivisions").delete().eq("id", deletingSubdivision.id)

    if (error) {
      console.error("Error deleting subdivision:", error)
      return
    }

    setSubdivisions(subdivisions.filter((s) => s.id !== deletingSubdivision.id))
    setDeletingSubdivision(null)
  }

  const handlePropertySale = async (buyerId: string, salePrice: number) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("properties")
      .update({ buyer_id: buyerId, sale_price: salePrice, status: "pending" })
      .eq("id", property.id)
      .select(`*, buyer:buyers(*)`)
      .single()

    if (error) {
      console.error("Error updating property sale:", error)
      return false
    }

    setProperty(data)
    // Mark all subdivisions as unavailable when property is sold
    if (subdivisions.length > 0) {
      const { data: updatedSubs } = await supabase
        .from("subdivisions")
        .update({ status: "sold" })
        .eq("property_id", property.id)
        .select(`*, buyer:buyers(*)`)

      if (updatedSubs) {
        setSubdivisions(updatedSubs)
      }
    }
    return true
  }

  const handleSubdivisionSale = async (buyerId: string, salePrice: number) => {
    if (!subdivisionForSale) return false

    const supabase = createClient()
    const { data, error } = await supabase
      .from("subdivisions")
      .update({ buyer_id: buyerId, sale_price: salePrice, status: "pending" })
      .eq("id", subdivisionForSale.id)
      .select(`*, buyer:buyers(*)`)
      .single()

    if (error) {
      console.error("Error updating subdivision sale:", error)
      return false
    }

    setSubdivisions(subdivisions.map((s) => (s.id === data.id ? data : s)))
    return true
  }

  const handlePropertyPaymentChange = async (totalPaid: number) => {
    setPropertyTotalPaid(totalPaid)

    if (totalPaid >= Number(property.sale_price) && property.status === "pending") {
      const supabase = createClient()
      const { data } = await supabase
        .from("properties")
        .update({ status: "sold" })
        .eq("id", property.id)
        .select(`*, buyer:buyers(*)`)
        .single()

      if (data) {
        setProperty(data)
      }
    }
  }

  const handleSubdivisionPaymentChange = async (totalPaid: number, subdivisionId: string, salePrice: number) => {
    const subdivision = subdivisions.find((s) => s.id === subdivisionId)
    if (!subdivision) return

    if (totalPaid >= salePrice && subdivision.status === "pending") {
      const supabase = createClient()
      const { data } = await supabase
        .from("subdivisions")
        .update({ status: "sold" })
        .eq("id", subdivisionId)
        .select(`*, buyer:buyers(*)`)
        .single()

      if (data) {
        setSubdivisions(subdivisions.map((s) => (s.id === data.id ? data : s)))
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sold":
        return <Badge className="bg-green-600">Sold</Badge>
      case "pending":
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            Pending Payment
          </Badge>
        )
      default:
        return <Badge variant="outline">Available</Badge>
    }
  }

  const propertyBalance = Number(property.sale_price) - propertyTotalPaid

  return (
    <div className="p-4 pt-6 lg:p-8">
      {/* Back Button */}
      <Button variant="ghost" className="mb-4" onClick={() => router.push("/dashboard/properties")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Properties
      </Button>

      {/* Property Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{property.title}</h1>
            {getStatusBadge(property.status)}
          </div>
          <p className="text-muted-foreground">{property.description || "No description"}</p>
          {property.buyer && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              Buyer: <span className="font-medium">{property.buyer.name}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <DocumentsManager propertyId={property.id} triggerLabel="Documents" />
          {property.status === "available" && (
            <Button onClick={() => setIsSaleDialogOpen(true)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Mark for Sale
            </Button>
          )}
          {(property.status === "pending" || property.status === "sold") && (
            <Button variant="outline" onClick={() => setIsPaymentsDialogOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Payments
            </Button>
          )}
        </div>
      </div>

      {/* Property Sale Info */}
      {property.status !== "available" && (
        <Card className="mb-6">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Sale Price</p>
              <p className="text-lg font-semibold">{formatCurrency(Number(property.sale_price))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(propertyTotalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-lg font-semibold ${propertyBalance > 0 ? "text-orange-600" : "text-green-600"}`}>
                {formatCurrency(propertyBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(property.status)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subdivisions</CardTitle>
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subdivisions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subdivisions" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="subdivisions" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Subdivisions
          </TabsTrigger>
          <TabsTrigger value="all-documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subdivisions">
          {/* Subdivisions Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Subdivisions</h2>
              <p className="text-sm text-muted-foreground">Manage parcels within this property</p>
            </div>
            {!isPropertySold && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Subdivision
              </Button>
            )}
          </div>

          {/* Subdivisions List */}
          {subdivisions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4">
                  <Grid3X3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No subdivisions yet</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Start dividing this property into smaller parcels.
                </p>
                {!isPropertySold && (
                  <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Subdivision
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subdivisions.map((subdivision) => {
                const isSubSold = subdivision.status === "sold"
                const isSubPending = subdivision.status === "pending"

                return (
                  <Card key={subdivision.id} className="group relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-8">
                          <div className="mb-1 flex items-center gap-2">
                            <CardTitle className="line-clamp-1 text-lg">{subdivision.title}</CardTitle>
                            {getStatusBadge(subdivision.status)}
                          </div>
                        </div>
                        {!isPropertySold && !isSubSold && (
                          <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingSubdivision(subdivision)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletingSubdivision(subdivision)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {subdivision.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-lg font-semibold text-primary">
                          {formatCurrency(Number(subdivision.cost))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(subdivision.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {subdivision.buyer && (
                        <p className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          {subdivision.buyer.name}
                        </p>
                      )}

                      {(isSubPending || isSubSold) && (
                        <p className="mb-3 text-sm">
                          Sale: <span className="font-medium">{formatCurrency(Number(subdivision.sale_price))}</span>
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <DocumentsManager subdivisionId={subdivision.id} triggerLabel="Docs" />
                        {!isPropertySold && subdivision.status === "available" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={() => setSubdivisionForSale(subdivision)}
                          >
                            <DollarSign className="mr-1 h-3 w-3" />
                            Sell
                          </Button>
                        )}
                        {(isSubPending || isSubSold) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={() => setSubdivisionForPayments(subdivision)}
                          >
                            <CreditCard className="mr-1 h-3 w-3" />
                            Payments
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-documents">
          <AllDocumentsView propertyId={property.id} subdivisions={subdivisions} />
        </TabsContent>
      </Tabs>

      {/* Add Subdivision Dialog */}
      <SubdivisionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddSubdivision}
        title="Add Subdivision"
        description="Create a new subdivision for this property."
      />

      {/* Edit Subdivision Dialog */}
      <SubdivisionDialog
        open={!!editingSubdivision}
        onOpenChange={(open) => !open && setEditingSubdivision(null)}
        onSubmit={handleEditSubdivision}
        title="Edit Subdivision"
        description="Update the subdivision details."
        initialTitle={editingSubdivision?.title}
        initialDescription={editingSubdivision?.description || ""}
        initialCost={editingSubdivision?.cost}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteSubdivisionDialog
        open={!!deletingSubdivision}
        onOpenChange={(open) => !open && setDeletingSubdivision(null)}
        onConfirm={handleDeleteSubdivision}
        subdivisionTitle={deletingSubdivision?.title || ""}
      />

      {/* Property Sale Dialog */}
      <SaleDialog
        open={isSaleDialogOpen}
        onOpenChange={setIsSaleDialogOpen}
        onSubmit={handlePropertySale}
        title="Sell Property"
        description="Mark this entire property as sold. This will also mark all subdivisions as sold."
        initialBuyerId={property.buyer_id || undefined}
        initialSalePrice={Number(property.sale_price) || undefined}
      />

      {/* Property Payments Dialog */}
      <PaymentsDialog
        open={isPaymentsDialogOpen}
        onOpenChange={setIsPaymentsDialogOpen}
        propertyId={property.id}
        propertyTitle={property.title}
        buyerId={property.buyer_id || undefined}
        buyer={property.buyer}
        salePrice={Number(property.sale_price)}
        onPaymentsChange={handlePropertyPaymentChange}
      />

      {/* Subdivision Sale Dialog */}
      <SaleDialog
        open={!!subdivisionForSale}
        onOpenChange={(open) => !open && setSubdivisionForSale(null)}
        onSubmit={handleSubdivisionSale}
        title="Sell Subdivision"
        description={`Mark "${subdivisionForSale?.title}" as sold.`}
        initialBuyerId={subdivisionForSale?.buyer_id || undefined}
        initialSalePrice={Number(subdivisionForSale?.sale_price) || undefined}
        disabled={isPropertySold}
        disabledMessage="This subdivision cannot be sold individually because the entire property has been sold."
      />

      {/* Subdivision Payments Dialog */}
      <PaymentsDialog
        open={!!subdivisionForPayments}
        onOpenChange={(open) => !open && setSubdivisionForPayments(null)}
        subdivisionId={subdivisionForPayments?.id}
        subdivisionTitle={subdivisionForPayments?.title}
        propertyTitle={property.title}
        buyerId={subdivisionForPayments?.buyer_id || undefined}
        buyer={subdivisionForPayments?.buyer}
        salePrice={Number(subdivisionForPayments?.sale_price || 0)}
        onPaymentsChange={(totalPaid) =>
          subdivisionForPayments &&
          handleSubdivisionPaymentChange(
            totalPaid,
            subdivisionForPayments.id,
            Number(subdivisionForPayments.sale_price),
          )
        }
      />
    </div>
  )
}
