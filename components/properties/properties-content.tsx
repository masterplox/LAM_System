"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, MapPin, ChevronRight, Grid3X3, DollarSign, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PropertyDialog } from "./property-dialog"
import { DeletePropertyDialog } from "./delete-property-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Buyer } from "./sale-dialog"

export interface Property {
  id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
  subdivision_count: number
  total_value: number
  status: "available" | "pending" | "sold"
  sale_price: number
  buyer_id: string | null
  buyer?: Buyer | null
}

interface PropertiesContentProps {
  initialProperties: Property[]
}

export function PropertiesContent({ initialProperties }: PropertiesContentProps) {
  const [properties, setProperties] = useState<Property[]>(initialProperties)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null)
  const router = useRouter()

  const handleAddProperty = async (title: string, description: string) => {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.error("No authenticated user found")
      return false
    }

    const { data, error } = await supabase
      .from("properties")
      .insert({ title, description, user_id: user.id })
      .select()
      .single()

    if (error) {
      console.error("Error adding property:", error.message)
      return false
    }

    setProperties([
      { ...data, subdivision_count: 0, total_value: 0, status: "available", sale_price: 0, buyer_id: null },
      ...properties,
    ])
    router.refresh()
    return true
  }

  const handleEditProperty = async (title: string, description: string) => {
    if (!editingProperty) return false

    const supabase = createClient()
    const { data, error } = await supabase
      .from("properties")
      .update({ title, description })
      .eq("id", editingProperty.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating property:", error)
      return false
    }

    setProperties(properties.map((p) => (p.id === data.id ? { ...p, ...data } : p)))
    router.refresh()
    return true
  }

  const handleDeleteProperty = async () => {
    if (!deletingProperty) return

    const supabase = createClient()
    const { error } = await supabase.from("properties").delete().eq("id", deletingProperty.id)

    if (error) {
      console.error("Error deleting property:", error)
      return
    }

    setProperties(properties.filter((p) => p.id !== deletingProperty.id))
    setDeletingProperty(null)
    router.refresh()
  }

  const handleViewProperty = (propertyId: string) => {
    router.push(`/dashboard/properties/${propertyId}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sold":
        return <Badge className="bg-green-600">Sold</Badge>
      case "pending":
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            Pending
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-4 pt-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Properties</h1>
          <p className="text-muted-foreground">Manage your land properties and parcels</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Properties List */}
      {properties.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No properties yet</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Get started by adding your first property to manage.
            </p>
            <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card
              key={property.id}
              className="group relative cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => handleViewProperty(property.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-16">
                    <div className="mb-1 flex items-center gap-2">
                      <CardTitle className="line-clamp-1 text-lg">{property.title}</CardTitle>
                      {getStatusBadge(property.status)}
                    </div>
                  </div>
                  {property.status === "available" && (
                    <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingProperty(property)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingProperty(property)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  )}
                </div>
                <CardDescription className="line-clamp-2">
                  {property.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {property.buyer && (
                  <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {property.buyer.name}
                  </p>
                )}
                <div className="mb-3 flex gap-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{property.subdivision_count}</span>
                    <span className="text-muted-foreground">lots</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {property.total_value.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(property.created_at).toLocaleDateString()}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Property Dialog */}
      <PropertyDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddProperty}
        title="Add Property"
        description="Create a new property to manage in your portfolio."
      />

      {/* Edit Property Dialog */}
      <PropertyDialog
        open={!!editingProperty}
        onOpenChange={(open) => !open && setEditingProperty(null)}
        onSubmit={handleEditProperty}
        title="Edit Property"
        description="Update the property details."
        initialTitle={editingProperty?.title}
        initialDescription={editingProperty?.description || ""}
      />

      {/* Delete Confirmation Dialog */}
      <DeletePropertyDialog
        open={!!deletingProperty}
        onOpenChange={(open) => !open && setDeletingProperty(null)}
        onConfirm={handleDeleteProperty}
        propertyTitle={deletingProperty?.title || ""}
      />
    </div>
  )
}
