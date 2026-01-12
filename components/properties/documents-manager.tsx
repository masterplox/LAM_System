"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { FileText, Upload, Trash2, Eye, Replace, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

export interface Document {
  id: string
  user_id: string
  property_id: string | null
  subdivision_id: string | null
  payment_id: string | null
  name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  created_at: string
  updated_at: string
}

interface DocumentsManagerProps {
  propertyId?: string
  subdivisionId?: string
  paymentId?: string
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "ghost" | "secondary"
  triggerSize?: "default" | "sm" | "lg" | "icon"
  onCountChange?: (count: number) => void
}

export function DocumentsManager({
  propertyId,
  subdivisionId,
  paymentId,
  triggerLabel = "Documents",
  triggerVariant = "outline",
  triggerSize = "sm",
  onCountChange,
}: DocumentsManagerProps) {
  const [open, setOpen] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentCount, setDocumentCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null)
  const [replaceDoc, setReplaceDoc] = useState<Document | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocumentCount()
  }, [propertyId, subdivisionId, paymentId])

  useEffect(() => {
    if (open) {
      fetchDocuments()
    }
  }, [open, propertyId, subdivisionId, paymentId])

  useEffect(() => {
    onCountChange?.(documentCount)
  }, [documentCount, onCountChange])

  const fetchDocumentCount = async () => {
    const supabase = createClient()

    let query = supabase.from("documents").select("id", { count: "exact", head: true })

    if (propertyId) {
      query = query.eq("property_id", propertyId)
    } else if (subdivisionId) {
      query = query.eq("subdivision_id", subdivisionId)
    } else if (paymentId) {
      query = query.eq("payment_id", paymentId)
    }

    const { count } = await query

    setDocumentCount(count || 0)
  }

  const fetchDocuments = async () => {
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase.from("documents").select("*")

    if (propertyId) {
      query = query.eq("property_id", propertyId)
    } else if (subdivisionId) {
      query = query.eq("subdivision_id", subdivisionId)
    } else if (paymentId) {
      query = query.eq("payment_id", paymentId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (!error && data) {
      setDocuments(data)
      setDocumentCount(data.length)
    }
    setIsLoading(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsUploading(false)
      return
    }

    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file)

      if (uploadError) {
        console.error("Upload error:", uploadError)
        continue
      }

      const { data, error } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          property_id: propertyId || null,
          subdivision_id: subdivisionId || null,
          payment_id: paymentId || null,
          name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
        })
        .select()
        .single()

      if (!error && data) {
        setDocuments((prev) => [data, ...prev])
        setDocumentCount((prev) => prev + 1)
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setIsUploading(false)
  }

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !replaceDoc) return

    setIsUploading(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsUploading(false)
      return
    }

    const file = files[0]
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file)

    if (uploadError) {
      console.error("Upload error:", uploadError)
      setIsUploading(false)
      return
    }

    await supabase.storage.from("documents").remove([replaceDoc.file_path])

    const { data, error } = await supabase
      .from("documents")
      .update({
        name: file.name,
        file_path: fileName,
        file_size: file.size,
        file_type: file.type,
        updated_at: new Date().toISOString(),
      })
      .eq("id", replaceDoc.id)
      .select()
      .single()

    if (!error && data) {
      setDocuments((prev) => prev.map((d) => (d.id === data.id ? data : d)))
    }

    if (replaceInputRef.current) {
      replaceInputRef.current.value = ""
    }
    setReplaceDoc(null)
    setIsUploading(false)
  }

  const handleDelete = async () => {
    if (!deleteDoc) return

    const supabase = createClient()

    await supabase.storage.from("documents").remove([deleteDoc.file_path])

    const { error } = await supabase.from("documents").delete().eq("id", deleteDoc.id)

    if (!error) {
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDoc.id))
      setDocumentCount((prev) => prev - 1)
    }

    setDeleteDoc(null)
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

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={triggerVariant} size={triggerSize} className="bg-transparent">
            <FileText className="mr-1 h-3 w-3" />
            {triggerLabel}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {documentCount}
            </Badge>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Supporting Documents</DialogTitle>
            <DialogDescription>Upload, view, and manage supporting documents</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border-2 border-dashed p-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
            />
            <div className="flex flex-col items-center gap-2 text-center">
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
                  <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Select Files
                  </Button>
                  <p className="text-xs text-muted-foreground">PDF, DOC, XLS, PNG, JPG up to 10MB</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Documents ({documents.length})</h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="text-2xl">{getFileIcon(doc.file_type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleView(doc)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setReplaceDoc(doc)}
                          title="Replace"
                        >
                          <Replace className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteDoc(doc)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDoc?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!replaceDoc} onOpenChange={(open) => !open && setReplaceDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Document</DialogTitle>
            <DialogDescription>Select a new file to replace "{replaceDoc?.name}"</DialogDescription>
          </DialogHeader>
          <input
            ref={replaceInputRef}
            type="file"
            className="hidden"
            onChange={handleReplace}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
          />
          <div className="flex flex-col gap-4">
            <Button onClick={() => replaceInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Select New File
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setReplaceDoc(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
