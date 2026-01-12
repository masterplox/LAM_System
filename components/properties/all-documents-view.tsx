"use client"

import { useState, useEffect } from "react"
import { FileText, Eye, Loader2, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import type { Document } from "./documents-manager"
import type { Subdivision } from "./property-detail-content"

interface AllDocumentsViewProps {
  propertyId: string
  subdivisions: Subdivision[]
}

interface GroupedDocument extends Document {
  source: string
  sourceType: "property" | "subdivision" | "payment"
}

export function AllDocumentsView({ propertyId, subdivisions }: AllDocumentsViewProps) {
  const [documents, setDocuments] = useState<GroupedDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAllDocuments()
  }, [propertyId, subdivisions])

  const fetchAllDocuments = async () => {
    setIsLoading(true)
    const supabase = createClient()

    const allDocs: GroupedDocument[] = []

    // Fetch property documents
    const { data: propertyDocs } = await supabase
      .from("documents")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })

    if (propertyDocs) {
      allDocs.push(
        ...propertyDocs.map((doc) => ({
          ...doc,
          source: "Property",
          sourceType: "property" as const,
        })),
      )
    }

    // Fetch subdivision documents
    const subdivisionIds = subdivisions.map((s) => s.id)
    if (subdivisionIds.length > 0) {
      const { data: subDocs } = await supabase
        .from("documents")
        .select("*")
        .in("subdivision_id", subdivisionIds)
        .order("created_at", { ascending: false })

      if (subDocs) {
        allDocs.push(
          ...subDocs.map((doc) => {
            const subdivision = subdivisions.find((s) => s.id === doc.subdivision_id)
            return {
              ...doc,
              source: subdivision?.title || "Subdivision",
              sourceType: "subdivision" as const,
            }
          }),
        )
      }
    }

    // Fetch payment documents for property
    const { data: propertyPayments } = await supabase.from("payments").select("id").eq("property_id", propertyId)

    if (propertyPayments && propertyPayments.length > 0) {
      const paymentIds = propertyPayments.map((p) => p.id)
      const { data: paymentDocs } = await supabase
        .from("documents")
        .select("*")
        .in("payment_id", paymentIds)
        .order("created_at", { ascending: false })

      if (paymentDocs) {
        allDocs.push(
          ...paymentDocs.map((doc) => ({
            ...doc,
            source: "Property Payment",
            sourceType: "payment" as const,
          })),
        )
      }
    }

    // Fetch payment documents for subdivisions
    if (subdivisionIds.length > 0) {
      const { data: subPayments } = await supabase
        .from("payments")
        .select("id, subdivision_id")
        .in("subdivision_id", subdivisionIds)

      if (subPayments && subPayments.length > 0) {
        const subPaymentIds = subPayments.map((p) => p.id)
        const { data: subPaymentDocs } = await supabase
          .from("documents")
          .select("*")
          .in("payment_id", subPaymentIds)
          .order("created_at", { ascending: false })

        if (subPaymentDocs) {
          allDocs.push(
            ...subPaymentDocs.map((doc) => {
              const payment = subPayments.find((p) => p.id === doc.payment_id)
              const subdivision = subdivisions.find((s) => s.id === payment?.subdivision_id)
              return {
                ...doc,
                source: `${subdivision?.title || "Subdivision"} Payment`,
                sourceType: "payment" as const,
              }
            }),
          )
        }
      }
    }

    // Sort all documents by date
    allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setDocuments(allDocs)
    setIsLoading(false)
  }

  const handleView = async (doc: Document) => {
    const supabase = createClient()
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank")
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return "📄"
    if (fileType.startsWith("image/")) return "🖼️"
    if (fileType.includes("pdf")) return "📕"
    if (fileType.includes("word") || fileType.includes("document")) return "📘"
    if (fileType.includes("sheet") || fileType.includes("excel")) return "📗"
    return "📄"
  }

  const getSourceBadgeVariant = (sourceType: string) => {
    switch (sourceType) {
      case "property":
        return "default"
      case "subdivision":
        return "secondary"
      case "payment":
        return "outline"
      default:
        return "secondary"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Documents uploaded to this property, its subdivisions, or payments will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Group documents by source type
  const propertyDocs = documents.filter((d) => d.sourceType === "property")
  const subdivisionDocs = documents.filter((d) => d.sourceType === "subdivision")
  const paymentDocs = documents.filter((d) => d.sourceType === "payment")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">All Documents</h2>
          <p className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? "s" : ""} across property, subdivisions, and payments
          </p>
        </div>
      </div>

      {/* Property Documents */}
      {propertyDocs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Property Documents
              <Badge variant="secondary">{propertyDocs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {propertyDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="text-2xl">{getFileIcon(doc.file_type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(doc)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Subdivision Documents */}
      {subdivisionDocs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Subdivision Documents
              <Badge variant="secondary">{subdivisionDocs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {subdivisionDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="text-2xl">{getFileIcon(doc.file_type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {doc.source}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(doc)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payment Documents */}
      {paymentDocs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Payment Documents
              <Badge variant="secondary">{paymentDocs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paymentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="text-2xl">{getFileIcon(doc.file_type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {doc.source}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(doc)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
