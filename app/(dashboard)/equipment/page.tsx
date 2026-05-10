"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Clock,
  Database,
  Download,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  Edit2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { AnimatedSection, StaggerContainer, fadeInUpItem } from "@/components/ui/motion-fade"
import {
  ResponsiveDataTable,
  Column
} from "@/components/ui/responsive-data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n"
import { AuditTrail, type AuditEntry } from "@/components/audit-trail"
import { equipmentApi } from "@/lib/api/equipment"
import { departmentsApi } from "@/lib/api/departments"
import { auditLogsApi } from "@/lib/api/audit-logs"
import { referenceDataApi } from "@/lib/api/reference-data"
import type {
  DepartmentResponse,
  EquipmentDocument,
  EquipmentHistory,
  EquipmentCategory,
  EquipmentModel,
  EquipmentRequest,
  EquipmentResponse,
} from "@/lib/api/types"
import { downloadCsv } from "@/lib/export"
import {
  mapAuditLogToAuditEntry,
  mapEquipmentResponseToUiListItem,
  type UiEquipmentListItem,
} from "@/lib/adapters"
import { ApiError } from "@/lib/api/client"
import { useToast } from "@/components/ui/use-toast"

const NONE_SELECT_VALUE = "__none__"

type EquipmentFormState = {
  name: string
  serialNumber: string
  location: string
  departmentId: string
  status: string
  categoryId: string
  modelId: string
  manufacturer: string
  classification: string
  category: string
  model: string
  criticality: string
  meterUnit: string
  startMeterValue: string
  thresholds: { value: string; label: string }[]
}

const CLASSIFICATION_MAPPINGS: Record<string, string[]> = {
  BIOMEDICAL: [
    "IMAGING",
    "LABORATORY",
    "LIFE_SUPPORT",
    "MONITORING",
    "SURGICAL",
    "NEONATAL",
    "DENTAL",
    "OPHTHALMOLOGY",
    "ENT",
    "REHABILITATION",
  ],
  TECHNICAL: ["LABORATORY", "SURGICAL", "STERILIZATION", "REHABILITATION"],
  IT: ["INFORMATION_SYSTEM", "LOGISTICS"],
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—"
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`
}

function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const payload = err.payload as unknown
    if (payload && typeof payload === "object") {
      const maybeError = (payload as Record<string, unknown>).error
      const maybeMessage = (payload as Record<string, unknown>).message
      if (typeof maybeError === "string" && maybeError.trim()) return maybeError
      if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage
    }
    return `Request failed (${err.status})`
  }
  if (err instanceof Error && err.message) return err.message
  return "Request failed"
}

function createEmptyEquipmentForm(departmentId: number | null): EquipmentFormState {
  return {
    name: "",
    serialNumber: "",
    location: "",
    departmentId: departmentId ? String(departmentId) : "",
    status: "OPERATIONAL",
    categoryId: NONE_SELECT_VALUE,
    modelId: NONE_SELECT_VALUE,
    manufacturer: "",
    classification: "",
    category: NONE_SELECT_VALUE,
    model: "",
    criticality: "LOW",
    meterUnit: "",
    startMeterValue: "",
    thresholds: [],
  }
}

function mapEquipmentToForm(e: EquipmentResponse): EquipmentFormState {
  return {
    name: e.name ?? "",
    serialNumber: e.serialNumber ?? "",
    location: e.location ?? "",
    departmentId: e.departmentId != null ? String(e.departmentId) : "",
    status: (e.status ?? "OPERATIONAL").toUpperCase(),
    categoryId: e.categoryId != null ? String(e.categoryId) : NONE_SELECT_VALUE,
    modelId: e.modelId != null ? String(e.modelId) : NONE_SELECT_VALUE,
    manufacturer: e.manufacturer ?? "",
    classification: e.classification ?? "",
    category: e.category ?? NONE_SELECT_VALUE,
    model: e.model ?? "",
    criticality: e.criticality ? e.criticality.toUpperCase() : "LOW",
    meterUnit: e.meterUnit ?? "",
    startMeterValue:
      e.startMeterValue != null && Number.isFinite(e.startMeterValue) ? String(e.startMeterValue) : "",
    thresholds: (e.thresholds ?? []).map((threshold: any) => ({
      value: String(threshold.value),
      label: threshold.label || "",
    })),
  }
}

export default function EquipmentPage() {
  const { t, language, isRTL } = useI18n()
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.roleName?.toUpperCase() === 'ADMIN'
  const isManager = user?.roleName?.toUpperCase() === 'MAINTENANCE_MANAGER'
  const canManage = isAdmin || isManager
  const canAdmin = isAdmin

  const [searchQuery, setSearchQuery] = useState("")
  const [classificationFilter, setClassificationFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, classificationFilter, statusFilter])

  const [equipment, setEquipment] = useState<EquipmentResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [models, setModels] = useState<EquipmentModel[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<EquipmentFormState>(() => createEmptyEquipmentForm(null))
  const [isSaving, setIsSaving] = useState(false)

  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<EquipmentResponse | null>(null)
  const [isViewing, setIsViewing] = useState(false)

  const [documents, setDocuments] = useState<EquipmentDocument[]>([])
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false)
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null)
  const [documentInputKey, setDocumentInputKey] = useState(0)
  const [isDocumentSaving, setIsDocumentSaving] = useState(false)

  const [docsOpen, setDocsOpen] = useState(false)
  const [docsEquipment, setDocsEquipment] = useState<{ id: number; name: string } | null>(null)
  const [docsDocuments, setDocsDocuments] = useState<EquipmentDocument[]>([])
  const [isDocsLoading, setIsDocsLoading] = useState(false)
  const [docsSelectedFile, setDocsSelectedFile] = useState<File | null>(null)
  const [docsInputKey, setDocsInputKey] = useState(0)
  const [isDocsSaving, setIsDocsSaving] = useState(false)

  const [history, setHistory] = useState<EquipmentHistory[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const [confirmDeleteDocumentOpen, setConfirmDeleteDocumentOpen] = useState(false)
  const [deletingDocument, setDeletingDocument] = useState<EquipmentDocument | null>(null)
  const [deletingDocumentEquipmentId, setDeletingDocumentEquipmentId] = useState<number | null>(null)

  const refreshEquipment = async () => {
    const [eqRes, logsRes] = await Promise.all([
      equipmentApi.getAll(),
      auditLogsApi.getRecent(50),
    ])
    setEquipment(eqRes)
    const equipmentLogs = logsRes.filter((l) => {
      const entity = (l.entityName ?? "").toLowerCase()
      const action = (l.actionType ?? "").toLowerCase()
      return entity.includes("equipment") || action.includes("equipment")
    })
    setAuditEntries(equipmentLogs.map(mapAuditLogToAuditEntry))
  }

  useEffect(() => {
    let cancelled = false
    setIsFetching(true)
    setError(null)
    const load = async () => {
      try {
        const [eqRes, deptRes, catsRes, modelsRes, logsRes] = await Promise.all([
          equipmentApi.getAll(),
          departmentsApi.getAll(),
          referenceDataApi.getCategories(),
          referenceDataApi.getModels(),
          auditLogsApi.getRecent(50),
        ])
        if (cancelled) return
        setEquipment(eqRes)
        setDepartments(deptRes)
        setCategories(catsRes)
        setModels(modelsRes)

        const equipmentLogs = logsRes.filter((l) => {
          const entity = (l.entityName ?? "").toLowerCase()
          const action = (l.actionType ?? "").toLowerCase()
          return entity.includes("equipment") || action.includes("equipment")
        })
        setAuditEntries(equipmentLogs.map(mapAuditLogToAuditEntry))
      } catch {
        if (cancelled) return
        setEquipment([])
        setDepartments([])
        setCategories([])
        setModels([])
        setAuditEntries([])
        setError(t('failedToLoadEquipment'))
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [language, t])

  const departmentNameById = useMemo(() => {
    const map: Record<number, string> = {}
    for (const d of departments) {
      map[d.departmentId] = d.departmentName
    }
    return map
  }, [departments])

  const categoryNameById = useMemo(() => {
    const map: Record<number, string> = {}
    for (const c of categories) {
      map[c.categoryId] = c.name
    }
    return map
  }, [categories])

  const modelNameById = useMemo(() => {
    const map: Record<number, string> = {}
    for (const m of models) {
      map[m.modelId] = m.name
    }
    return map
  }, [models])

  const uiItems: UiEquipmentListItem[] = useMemo(() => {
    return equipment.map((e) => mapEquipmentResponseToUiListItem(e, departmentNameById))
  }, [departmentNameById, equipment])

  const classificationOptions = useMemo(() => {
    const set = new Set<string>()
    for (const e of uiItems) {
      const v = (e.classification ?? "").trim()
      if (v && v !== "—") set.add(v)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [uiItems])

  const filteredEquipment = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return uiItems.filter((eq) => {
      const matchesSearch =
        !q ||
        eq.name.toLowerCase().includes(q) ||
        eq.serialNumber.toLowerCase().includes(q)
      const matchesClassification =
        classificationFilter === "all" || eq.classification === classificationFilter
      const matchesStatus = statusFilter === "all" || eq.status === statusFilter
      return matchesSearch && matchesClassification && matchesStatus
    })
  }, [classificationFilter, searchQuery, statusFilter, uiItems])

  const paginatedEquipment = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredEquipment.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredEquipment, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage)

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "OPERATIONAL":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      case "UNDER_REPAIR":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "ARCHIVED":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getCriticalityColor = (criticality: string) => {
    switch (criticality.toUpperCase()) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
      case "MEDIUM":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "LOW":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      default:
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    }
  }

  const getStatusLabel = (status: string) => {
    const normalized = (status ?? "").toUpperCase()
    switch (normalized) {
      case "OPERATIONAL":
        return t("operational")
      case "UNDER_REPAIR":
        return t("underRepair")
      case "ARCHIVED":
        return t("archived")
      default:
        return normalized || "—"
    }
  }

  const getCriticalityLabel = (criticality: string) => {
    const normalized = (criticality ?? "").toUpperCase()
    switch (normalized) {
      case "CRITICAL":
        return t("critical")
      case "MEDIUM":
        return t("medium")
      case "LOW":
        return t("low")
      default:
        return normalized || "—"
    }
  }

  const stats = useMemo(() => {
    return [
      {
        label: t('totalEquipment'),
        value: uiItems.length,
        icon: Database,
        color: "text-violet-600",
        bgColor: "bg-violet-50 dark:bg-violet-900/20",
      },
      {
        label: t('outOfService'),
        value: uiItems.filter((e) => e.status === "UNDER_REPAIR" || e.status === "OUT_OF_SERVICE").length,
        icon: Activity,
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
      },
      {
        label: t('critical'),
        value: uiItems.filter((e) => e.criticality === "CRITICAL").length,
        icon: AlertTriangle,
        color: "text-rose-600",
        bgColor: "bg-rose-50 dark:bg-rose-900/20",
      },
    ]
  }, [t, uiItems])

  const openCreate = () => {
    const defaultDept = departments.length > 0 ? departments[0].departmentId : null
    setFormMode("create")
    setEditingId(null)
    setForm(createEmptyEquipmentForm(defaultDept))
    setFormOpen(true)
  }

  const openEdit = (equipmentId: number) => {
    const found = equipment.find((e) => e.equipmentId === equipmentId)
    if (!found) {
      toast({
        title: t('equipmentNotFound'),
        variant: "destructive",
      })
      return
    }
    setFormMode("edit")
    setEditingId(equipmentId)
    setForm(mapEquipmentToForm(found))
    setFormOpen(true)
  }

  const openView = async (equipmentId: number) => {
    setViewOpen(true)
    setIsViewing(true)
    setViewing(null)
    setDocuments([])
    setHistory([])
    try {
      const details = await equipmentApi.getById(equipmentId)
      setViewing(details)
    } catch (err) {
      toast({
        title: t('failedToLoad'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
      setViewOpen(false)
    } finally {
      setIsViewing(false)
    }
  }

  const openDocuments = (equipmentId: number, name: string) => {
    setDocsEquipment({ id: equipmentId, name })
    setDocsDocuments([])
    setDocsSelectedFile(null)
    setDocsInputKey((k) => k + 1)
    setDocsOpen(true)
  }

  useEffect(() => {
    let cancelled = false
    const equipmentId = viewing?.equipmentId
    if (!viewOpen || !equipmentId) return

    setIsDocumentsLoading(true)
    setIsHistoryLoading(true)

    const load = async () => {
      try {
        const [docsRes, historyRes] = await Promise.all([
          equipmentApi.getDocuments(equipmentId),
          equipmentApi.getHistory(equipmentId),
        ])
        if (cancelled) return
        setDocuments(docsRes)
        setHistory(historyRes)
      } catch {
        if (cancelled) return
        setDocuments([])
        setHistory([])
      } finally {
        if (cancelled) return
        setIsDocumentsLoading(false)
        setIsHistoryLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [viewOpen, viewing?.equipmentId])

  useEffect(() => {
    let cancelled = false
    const equipmentId = docsEquipment?.id
    if (!docsOpen || !equipmentId) return

    setIsDocsLoading(true)

    const load = async () => {
      try {
        const docsRes = await equipmentApi.getDocuments(equipmentId)
        if (cancelled) return
        setDocsDocuments(docsRes)
      } catch {
        if (cancelled) return
        setDocsDocuments([])
      } finally {
        if (cancelled) return
        setIsDocsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [docsOpen, docsEquipment?.id])

  const refreshDocsDocuments = async (equipmentId: number) => {
    const docsRes = await equipmentApi.getDocuments(equipmentId)
    setDocsDocuments(docsRes)
  }

  const refreshViewingExtras = async () => {
    const equipmentId = viewing?.equipmentId
    if (!equipmentId) return
    const [docsRes, historyRes] = await Promise.all([
      equipmentApi.getDocuments(equipmentId),
      equipmentApi.getHistory(equipmentId),
    ])
    setDocuments(docsRes)
    setHistory(historyRes)
  }

  const onUploadDocument = async () => {
    const equipmentId = viewing?.equipmentId
    if (!equipmentId) return
    if (!selectedDocumentFile || isDocumentSaving) {
      toast({
        title: t('fileRequired'),
        variant: "destructive",
      })
      return
    }
    setIsDocumentSaving(true)
    try {
      await equipmentApi.uploadDocument(equipmentId, selectedDocumentFile)
      toast({ title: t('documentUploaded') })
      setSelectedDocumentFile(null)
      setDocumentInputKey((k) => k + 1)
      await refreshViewingExtras()
    } catch (err) {
      toast({
        title: t('uploadFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsDocumentSaving(false)
    }
  }

  const onDownloadDocument = async (doc: EquipmentDocument) => {
    try {
      const blob = await equipmentApi.downloadDocument(doc.id)
      const fileName = doc.documentName || `document-${doc.id}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 500)
    } catch (err) {
      toast({
        title: t('downloadFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  const askDeleteDocument = (doc: EquipmentDocument, equipmentId: number | null) => {
    setDeletingDocument(doc)
    setDeletingDocumentEquipmentId(equipmentId)
    setConfirmDeleteDocumentOpen(true)
  }

  const onConfirmDeleteDocument = async () => {
    if (!deletingDocument) return
    try {
      await equipmentApi.deleteDocument(deletingDocument.id)
      toast({ title: t('documentDeleted') })
      setConfirmDeleteDocumentOpen(false)
      setDeletingDocument(null)
      const equipmentId = deletingDocumentEquipmentId
      setDeletingDocumentEquipmentId(null)

      if (equipmentId) {
        const docsRes = await equipmentApi.getDocuments(equipmentId)
        if (viewOpen && viewing?.equipmentId === equipmentId) {
          setDocuments(docsRes)
          try {
            const historyRes = await equipmentApi.getHistory(equipmentId)
            setHistory(historyRes)
          } catch {
            setHistory([])
          }
        }
        if (docsOpen && docsEquipment?.id === equipmentId) {
          setDocsDocuments(docsRes)
        }
      } else if (viewOpen && viewing?.equipmentId) {
        await refreshViewingExtras()
      }
    } catch (err) {
      toast({
        title: t('deleteFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  const onUploadDocsDocument = async () => {
    const equipmentId = docsEquipment?.id
    if (!equipmentId) return
    if (!docsSelectedFile || isDocsSaving) {
      toast({
        title: t('fileRequired'),
        variant: "destructive",
      })
      return
    }
    setIsDocsSaving(true)
    try {
      await equipmentApi.uploadDocument(equipmentId, docsSelectedFile)
      toast({ title: t('documentUploaded') })
      setDocsSelectedFile(null)
      setDocsInputKey((k) => k + 1)
      await refreshDocsDocuments(equipmentId)
    } catch (err) {
      toast({
        title: t('uploadFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsDocsSaving(false)
    }
  }

  const onArchive = async (equipmentId: number) => {
    try {
      await equipmentApi.archive(equipmentId)
      toast({ title: t('equipmentArchived') })
      await refreshEquipment()
    } catch (err) {
      toast({
        title: t('archiveFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  const onRestore = async (equipmentId: number) => {
    try {
      await equipmentApi.updateStatus(equipmentId, "OPERATIONAL")
      toast({ title: t('equipmentRestored') })
      await refreshEquipment()
    } catch (err) {
      toast({
        title: t('restoreFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  const onSubmitForm = async (e: FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    const name = form.name.trim()
    const serialNumber = form.serialNumber.trim()
    const location = form.location.trim()
    const departmentId = Number(form.departmentId)
    const status = (form.status ?? "").toUpperCase()
    if (!name || !location || !Number.isFinite(departmentId) || departmentId <= 0 || !status) {
      toast({
        title: t('missingRequiredField'),
        description: t('nameLocationDepartmentStatusRequired'),
        variant: "destructive",
      })
      return
    }

    const payload: EquipmentRequest = {
      name,
      serialNumber,
      location,
      departmentId,
      status,
      categoryId:
        form.categoryId && form.categoryId !== NONE_SELECT_VALUE ? Number(form.categoryId) : null,
      modelId:
        form.modelId && form.modelId !== NONE_SELECT_VALUE ? Number(form.modelId) : null,
      manufacturer: form.manufacturer.trim() ? form.manufacturer.trim() : null,
      classification: form.classification,
      category: form.category && form.category !== NONE_SELECT_VALUE ? form.category : null,
      model: form.model.trim() || null,
      criticality:
        form.criticality && form.criticality !== NONE_SELECT_VALUE
          ? form.criticality.toUpperCase()
          : "LOW",
      meterUnit: form.meterUnit.trim() ? form.meterUnit.trim() : null,
      startMeterValue: form.startMeterValue.trim()
        ? (Number.isFinite(Number(form.startMeterValue)) ? Number(form.startMeterValue) : null)
        : null,
      thresholds: form.thresholds
        .map((threshold) => ({
          value: Number(threshold.value),
          label: threshold.label.trim() || null,
        }))
        .filter((threshold) => Number.isFinite(threshold.value) && threshold.value > 0),
    }

    if (formMode === "edit" && editingId) {
      const existing = equipment.find((x) => x.equipmentId === editingId)
      if (existing) {
        payload.modelReference = existing.modelReference ?? null

        payload.purchaseDate = existing.purchaseDate ?? null
        payload.commissioningDate = existing.commissioningDate ?? null
        payload.supplierName = existing.supplierName ?? null
        payload.contractNumber = existing.contractNumber ?? null
        payload.warrantyEndDate = existing.warrantyEndDate ?? null
      }
    }

    setIsSaving(true)
    try {
      if (formMode === "create") {
        await equipmentApi.create(payload)
        toast({
          title: t('equipmentCreated'),
        })
      } else {
        if (!editingId) throw new Error("Missing equipment id")
        await equipmentApi.update(editingId, payload)
        toast({
          title: t('equipmentUpdated'),
        })
      }

      setFormOpen(false)
      await refreshEquipment()
    } catch (err) {
      toast({
        title: t('saveFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const onExport = () => {
    downloadCsv(
      "equipment.csv",
      ["id", "name", "serialNumber", "status", "criticality", "department", "location"],
      filteredEquipment.map((e) => [
        e.id,
        e.name,
        e.serialNumber,
        e.status,
        e.criticality,
        e.departmentName,
        e.location,
      ])
    )
  }

  const columns: Column<UiEquipmentListItem>[] = [
    { 
      header: t('equipment'), 
      accessor: (eq) => (
        <div className={cn(isRTL ? "text-right" : "text-left")}>
          <div className="font-bold text-foreground text-xs">{eq.name}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-tight">{eq.serialNumber || t('noSN') || 'No S/N'}</div>
        </div>
      ),
      rtlOrder: 0
    },
    { 
      header: t('department'), 
      accessor: (eq) => (
        <div className={cn("max-w-[120px] truncate text-xs font-medium text-muted-foreground", isRTL && "text-right")}>
          {eq.departmentName}
        </div>
      ),
      rtlOrder: 1
    },
    { 
      header: t('classification'), 
      accessor: (eq) => (
        <div className={cn("text-[10px] font-bold text-primary/80 uppercase", isRTL && "text-right")}>
          {eq.classification || '—'}
        </div>
      ),
      rtlOrder: 2
    },
    { 
      header: t('status'), 
      accessor: (eq) => (
        <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", getStatusColor(eq.status))}>
          {getStatusLabel(eq.status)}
        </Badge>
      ),
      rtlOrder: 3
    },
    { 
      header: t('criticality'), 
      accessor: (eq) => (
        <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", getCriticalityColor(eq.criticality))}>
          {getCriticalityLabel(eq.criticality)}
        </Badge>
      ),
      rtlOrder: 4
    },
    { 
      header: t('actions'), 
      accessor: (eq) => (
        <div className={cn("flex gap-1", isRTL ? "justify-start" : "justify-end")}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => {
             e.stopPropagation();
             openView(eq.id);
          }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"} className="bg-card/95 backdrop-blur-xl border-border">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openView(eq.id); }}>
                <Eye className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} /> {t('view')}
              </DropdownMenuItem>
              {canManage && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(eq.id); }}>
                  <Edit2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} /> {t('edit')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDocuments(eq.id, eq.name); }}>
                <FileText className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} /> {t('documents')}
              </DropdownMenuItem>
              {canAdmin && eq.status !== "ARCHIVED" && (
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onArchive(eq.id); }}>
                  <Trash2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} /> {t('archive')}
                </DropdownMenuItem>
              )}
              {canAdmin && eq.status === "ARCHIVED" && (
                <DropdownMenuItem className="text-success" onClick={(e) => { e.stopPropagation(); onRestore(eq.id); }}>
                  <Activity className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} /> {t('restore')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      className: isRTL ? "text-left" : "text-right",
      rtlOrder: 99
    }
  ]

  const renderMobileCard = (eq: UiEquipmentListItem) => (
    <div className={cn("space-y-3", isRTL ? "text-right" : "text-left")}>
      <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
        <div className="min-w-0">
          <h3 className="font-bold text-xs text-foreground truncate">{eq.name}</h3>
          <p className="text-[10px] text-muted-foreground uppercase">{eq.serialNumber || t('noSN') || 'No S/N'}</p>
        </div>
        <div className={cn("flex flex-col gap-1", isRTL ? "items-start" : "items-end")}>
          <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", getStatusColor(eq.status))}>
            {getStatusLabel(eq.status)}
          </Badge>
          <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", getCriticalityColor(eq.criticality))}>
            {getCriticalityLabel(eq.criticality)}
          </Badge>
        </div>
      </div>
      <div className={cn("flex items-center justify-between py-2 border-y border-border/50", isRTL && "flex-row-reverse")}>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{t('department')}</p>
          <p className="font-medium text-xs truncate max-w-[100px]">{eq.departmentName}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{t('classification')}</p>
          <p className="font-bold text-xs text-primary/80">{eq.classification || '—'}</p>
        </div>
      </div>
      <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
        <Button className="flex-1 h-8 text-xs bg-primary/10 text-primary border-none" onClick={(e) => { e.stopPropagation(); openView(eq.id); }}>
          {t('view')}
        </Button>
        <Button className="h-8 w-8 p-0 variant-outline" onClick={(e) => { e.stopPropagation(); openDocuments(eq.id, eq.name); }}>
          <FileText className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <AnimatedSection className={cn("flex items-center justify-between gap-3 flex-wrap", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-foreground">{t("equipmentList")}</h1>
        </div>
        <div className={cn("flex gap-1.5", isRTL && "flex-row-reverse")}>
          <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={onExport} disabled={filteredEquipment.length === 0}>
            <Download className="h-3 w-3" />
            {t("export")}
          </Button>
          {canManage && (
            <Button size="sm" className="h-7 gap-1.5 bg-primary" onClick={openCreate}>
              <Plus className="h-3 w-3" />
              {t("addEquipment")}
            </Button>
          )}
        </div>
      </AnimatedSection>

      {/* Stats Cards with entrance animations */}
      <StaggerContainer className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} variants={fadeInUpItem}>
            <Card variant="glass" hover="lift" className="h-full">
              <CardContent className={cn("flex items-center gap-3 p-3", isRTL && "flex-row-reverse")}>
                <div className={cn("rounded-xl p-2.5 shrink-0 transition-transform duration-300 group-hover:scale-110", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div className={cn("min-w-0 flex-1", isRTL && "text-right")}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate mb-1">{stat.label}</p>
                  <p className="text-xl font-bold tracking-tight text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </StaggerContainer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-3xl" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : "text-left"}>
            <DialogTitle>
              {formMode === "create"
                ? (t('addEquipment'))
                : (t('editEquipment'))}
            </DialogTitle>
            <DialogDescription>
              {t('equipmentFormDesc') || t('fieldsAndStatusesFol')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmitForm} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="eq-name" className={isRTL ? "text-right block" : ""}>{t('name')}</Label>
                <Input
                  id="eq-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t('eGVentilator')}
                  className={isRTL ? "text-right" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eq-serial" className={isRTL ? "text-right block" : ""}>{t("serialNumber")}</Label>
                <Input
                  id="eq-serial"
                  value={form.serialNumber}
                  onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))}
                  placeholder={t('serialNumber')}
                  className={isRTL ? "text-right" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eq-location" className={isRTL ? "text-right block" : ""}>{t("location")}</Label>
                <Input
                  id="eq-location"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder={t('eGRoom12')}
                  className={isRTL ? "text-right" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{t("department")}</Label>
                <Select value={form.departmentId} onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v }))}>
                  <SelectTrigger className={isRTL ? "text-right" : ""}>
                    <SelectValue placeholder={t('select')} />
                  </SelectTrigger>
                  <SelectContent dir={isRTL ? "rtl" : "ltr"}>
                    {departments.map((d) => (
                      <SelectItem key={d.departmentId} value={String(d.departmentId)}>
                        {d.departmentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{t("status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className={isRTL ? "text-right" : ""}>
                    <SelectValue placeholder={t("status")} />
                  </SelectTrigger>
                  <SelectContent dir={isRTL ? "rtl" : "ltr"}>
                    <SelectItem value="OPERATIONAL">{t("operational")}</SelectItem>
                    <SelectItem value="UNDER_REPAIR">{t("underRepair")}</SelectItem>
                    <SelectItem value="ARCHIVED">{t("archived")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{t("criticality")}</Label>
                <Select value={form.criticality} onValueChange={(v) => setForm((p) => ({ ...p, criticality: v }))}>
                  <SelectTrigger className={isRTL ? "text-right" : ""}>
                    <SelectValue placeholder={t("criticality")} />
                  </SelectTrigger>
                  <SelectContent dir={isRTL ? "rtl" : "ltr"}>
                    <SelectItem value={NONE_SELECT_VALUE}>{t('none')}</SelectItem>
                    <SelectItem value="LOW">{t("low")}</SelectItem>
                    <SelectItem value="MEDIUM">{t("medium")}</SelectItem>
                    <SelectItem value="CRITICAL">{t("critical")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{t('classification')}</Label>
                <Select 
                  value={form.classification} 
                  onValueChange={(v) => setForm((p) => ({ ...p, classification: v, category: NONE_SELECT_VALUE }))}
                >
                  <SelectTrigger className={isRTL ? "text-right" : ""}>
                    <SelectValue placeholder={t('select')} />
                  </SelectTrigger>
                  <SelectContent dir={isRTL ? "rtl" : "ltr"}>
                    <SelectItem value="BIOMEDICAL">{t('biomedical')}</SelectItem>
                    <SelectItem value="TECHNICAL">{t('technical')}</SelectItem>
                    <SelectItem value="IT">{t('it')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
    
              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{t('category')}</Label>
                <Select 
                  value={form.category} 
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                  disabled={!form.classification}
                >
                  <SelectTrigger className={isRTL ? "text-right" : ""}>
                    <SelectValue placeholder={t('select')} />
                  </SelectTrigger>
                  <SelectContent dir={isRTL ? "rtl" : "ltr"}>
                    <SelectItem value={NONE_SELECT_VALUE}>{t('none')}</SelectItem>
                    {form.classification && CLASSIFICATION_MAPPINGS[form.classification]?.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
    
              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{t('model')}</Label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                  placeholder={t('eGMagnetom')}
                  className={isRTL ? "text-right" : ""}
                />
              </div>
    
              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{t('manufacturer')}</Label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))}
                  placeholder={t('eGSiemens')}
                  className={isRTL ? "text-right" : ""}
                />
              </div>
    
              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{t('meterUnit')}</Label>
                <Input
                  value={form.meterUnit}
                  onChange={(e) => setForm((p) => ({ ...p, meterUnit: e.target.value }))}
                  placeholder={t('eGHours')}
                  className={isRTL ? "text-right" : ""}
                />
              </div>
    
              <div className="space-y-2">
                <Label className={isRTL ? "text-right block" : ""}>{t('startMeterValue')}</Label>
                <Input
                  type="number"
                  value={form.startMeterValue}
                  onChange={(e) => setForm((p) => ({ ...p, startMeterValue: e.target.value }))}
                  placeholder="0"
                  className={isRTL ? "text-right" : ""}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-3">
              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <Label className={isRTL ? "text-right" : ""}>{t('maintenanceThreshold')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((p) => ({ ...p, thresholds: [...p.thresholds, { value: "", label: "" }] }))}
                >
                  <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {t('add')}
                </Button>
              </div>

              {form.thresholds.length === 0 ? (
                <div className={cn("text-xs text-muted-foreground italic", isRTL ? "text-right" : "")}>
                  {t('noThresholds')}
                </div>
              ) : (
                <div className="space-y-3">
                  {form.thresholds.map((threshold, idx) => (
                    <div key={idx} className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                      <Input
                        className={cn("flex-1", isRTL ? "text-right" : "")}
                        value={threshold.label}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            thresholds: p.thresholds.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)),
                          }))
                        }
                        placeholder={t('labelEGOilChange')}
                      />
                      <Input
                        type="number"
                        className={cn("w-32", isRTL ? "text-right" : "")}
                        value={threshold.value}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            thresholds: p.thresholds.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)),
                          }))
                        }
                        placeholder="0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            thresholds: p.thresholds.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className={cn(isRTL ? "flex-row-reverse" : "")}>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDeleteDocumentOpen}
        onOpenChange={(open) => {
          setConfirmDeleteDocumentOpen(open)
          if (!open) {
            setDeletingDocument(null)
            setDeletingDocumentEquipmentId(null)
          }
        }}
      >
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader className={isRTL ? "text-right" : "text-left"}>
            <AlertDialogTitle>{t('deleteDocument')}</AlertDialogTitle>
            <AlertDialogDescription>
              {`${t('deleteDocumentConfirm')} "${deletingDocument?.documentName ?? ""}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={cn(isRTL ? "flex-row-reverse" : "")}>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDeleteDocument}>{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={docsOpen}
        onOpenChange={(open) => {
          setDocsOpen(open)
          if (!open) {
            setDocsEquipment(null)
            setDocsDocuments([])
            setDocsSelectedFile(null)
            setDocsInputKey((k) => k + 1)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : "text-left"}>
            <DialogTitle>
              {t('documents')}
              {docsEquipment ? ` — ${docsEquipment.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              {t('downloadUploadOrDelete')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={isRTL ? "text-right block" : ""}>{t('upload')}</Label>
              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Input
                  key={docsInputKey}
                  type="file"
                  onChange={(e) => setDocsSelectedFile(e.target.files?.[0] ?? null)}
                  className={isRTL ? "text-right" : ""}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onUploadDocsDocument}
                  disabled={isDocsSaving || !docsSelectedFile}
                >
                  <Upload className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {t('upload')}
                </Button>
              </div>
            </div>

            {isDocsLoading ? (
              <div className={cn("text-xs text-muted-foreground", isRTL && "text-right")}>{t("loading")}</div>
            ) : docsDocuments.length === 0 ? (
              <div className={cn("text-xs text-muted-foreground", isRTL && "text-right")}>{t('noDocuments')}</div>
            ) : (
              <div className="space-y-2">
                {docsDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={cn("flex items-center justify-between gap-2 rounded-md border px-3 py-2", isRTL && "flex-row-reverse")}
                  >
                    <div className={cn("min-w-0", isRTL && "text-right")}>
                      <div className="truncate text-xs font-medium">{doc.documentName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {(doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : "—") +
                          " • " +
                          formatBytes(doc.fileSize)}
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void onDownloadDocument(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          askDeleteDocument(doc, docsEquipment?.id ?? null)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className={isRTL ? "flex-row-reverse" : ""}>
              <Button type="button" variant="outline" onClick={() => setDocsOpen(false)}>
                {t('close')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : "text-left"}>
            <DialogTitle>{t('equipmentDetails')}</DialogTitle>
            <DialogDescription>
              {t('equipmentDetailsDesc')}
            </DialogDescription>
          </DialogHeader>

          {isViewing ? (
            <div className={cn("py-2 text-xs text-muted-foreground", isRTL && "text-right")}>{t("loading")}</div>
          ) : !viewing ? (
            <div className={cn("py-2 text-xs text-muted-foreground", isRTL && "text-right")}>{t("noData")}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 md:gap-3 sm:grid-cols-2">
                <div className={isRTL ? "text-right" : ""}>
                  <div className="text-xs text-muted-foreground">{t('name')}</div>
                  <div className="font-medium text-foreground">{viewing.name}</div>
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <div className="text-xs text-muted-foreground">{t("serialNumber")}</div>
                  <div className="font-mono text-foreground">{viewing.serialNumber}</div>
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <div className="text-xs text-muted-foreground">{t("location")}</div>
                  <div className="text-foreground">{viewing.location}</div>
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <div className="text-xs text-muted-foreground">{t("department")}</div>
                  <div className="text-foreground">{departmentNameById[viewing.departmentId] ?? "—"}</div>
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <div className="text-xs text-muted-foreground">{t("status")}</div>
                  <Badge variant="outline" className={getStatusColor(viewing.status)}>
                    {getStatusLabel(viewing.status)}
                  </Badge>
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <div className="text-xs text-muted-foreground">{t("criticality")}</div>
                  <Badge variant="outline" className={getCriticalityColor(viewing.criticality ?? "")}>
                    {getCriticalityLabel(viewing.criticality ?? "")}
                  </Badge>
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <div className="text-xs text-muted-foreground">{t('category')}</div>
                  <div className="text-foreground">
                    {viewing.categoryId ? (categoryNameById[viewing.categoryId] ?? `#${viewing.categoryId}`) : "—"}
                  </div>
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <div className="text-xs text-muted-foreground">{t('model')}</div>
                  <div className="text-foreground">
                    {viewing.modelId ? (modelNameById[viewing.modelId] ?? `#${viewing.modelId}`) : "—"}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 md:gap-3 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className={cn("text-sm", isRTL ? "text-right" : "")}>{t('documents')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className={isRTL ? "text-right block" : ""}>{t('upload')}</Label>
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Input
                          key={documentInputKey}
                          type="file"
                          onChange={(e) => setSelectedDocumentFile(e.target.files?.[0] ?? null)}
                          className={isRTL ? "text-right" : ""}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={onUploadDocument}
                          disabled={isDocumentSaving || !selectedDocumentFile}
                        >
                          <Upload className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                          {t('upload')}
                        </Button>
                      </div>
                    </div>

                    {isDocumentsLoading ? (
                      <div className={cn("text-xs text-muted-foreground", isRTL ? "text-right" : "")}>{t("loading")}</div>
                    ) : documents.length === 0 ? (
                      <div className={cn("text-xs text-muted-foreground", isRTL ? "text-right" : "")}>{t('noDocuments')}</div>
                    ) : (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div key={doc.id} className={cn("flex items-center justify-between gap-2 rounded-md border px-3 py-2", isRTL && "flex-row-reverse")}>
                            <div className={cn("min-w-0", isRTL ? "text-right" : "")}>
                              <div className="truncate text-xs font-medium">{doc.documentName}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {(doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : "—") +
                                  " • " +
                                  formatBytes(doc.fileSize)}
                              </div>
                            </div>
                            <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                              <Button type="button" variant="ghost" size="sm" onClick={() => void onDownloadDocument(doc)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => {
                                  askDeleteDocument(doc, viewing?.equipmentId ?? null)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className={cn("text-sm", isRTL ? "text-right" : "")}>{t('history')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isHistoryLoading ? (
                      <div className={cn("text-xs text-muted-foreground", isRTL ? "text-right" : "")}>{t("loading")}</div>
                    ) : history.length === 0 ? (
                      <div className={cn("text-xs text-muted-foreground", isRTL ? "text-right" : "")}>{t('noActivity')}</div>
                    ) : (
                      <div className="space-y-2">
                        {history
                          .slice()
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .slice(0, 6)
                          .map((h) => (
                            <div key={h.id} className={cn("rounded-md border px-3 py-2", isRTL ? "text-right" : "")}>
                              <div className="text-xs font-medium">{h.action || "—"}</div>
                              <div className="text-xs text-muted-foreground">
                                {h.performedBy || "—"} • {h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className={isRTL ? "flex-row-reverse" : ""}>
                <Button type="button" variant="outline" onClick={() => setViewOpen(false)}>
                  {t('close')}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>






          {/* Filters - Compact */}
          <div className={cn("flex flex-wrap items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input
                placeholder={t('searchEquipment')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("h-8 text-[13px] bg-muted/20 border-transparent hover:bg-muted/30 focus:border-primary/30 focus:bg-background transition-colors", isRTL ? "pr-9 text-right" : "pl-9")}
              />
            </div>
            <Select value={classificationFilter} onValueChange={setClassificationFilter}>
              <SelectTrigger className="w-[140px] h-8 text-[13px] bg-muted/20 border-transparent hover:bg-muted/30" dir={isRTL ? "rtl" : "ltr"}>
                <SelectValue placeholder={t("classification")} />
              </SelectTrigger>
              <SelectContent dir={isRTL ? "rtl" : "ltr"}>
                <SelectItem value="all">{t('all')}</SelectItem>
                {classificationOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-[13px] bg-muted/20 border-transparent hover:bg-muted/30" dir={isRTL ? "rtl" : "ltr"}>
                <SelectValue placeholder={t("status")} />
              </SelectTrigger>
              <SelectContent dir={isRTL ? "rtl" : "ltr"}>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="OPERATIONAL">{t("operational")}</SelectItem>
                <SelectItem value="UNDER_REPAIR">{t("underRepair")}</SelectItem>
                <SelectItem value="ARCHIVED">{t("archived")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card variant="glass" className="overflow-hidden">
            <CardContent className="p-0">
              <ResponsiveDataTable
                columns={columns}
                data={paginatedEquipment}
                renderCard={renderMobileCard}
                isLoading={isFetching}
                emptyMessage={t('noEquipmentFound')}
                className="border-none"
                onRowClick={(eq) => openView(eq.id)}
              />
            </CardContent>
          </Card>

          {/* Pagination - Compact */}
          {totalPages > 1 && (
            <div className={cn("flex items-center justify-end gap-2", isRTL && "flex-row-reverse justify-start")}>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronDown className={cn("h-4 w-4 rotate-90", isRTL && "rotate-[-90deg]")} />
              </Button>
              <span className="text-[10px] text-muted-foreground">
                {t('page')} {currentPage} {t('of')} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronDown className={cn("h-4 w-4 -rotate-90", isRTL && "rotate-90")} />
              </Button>
            </div>
          )}

    </div>
  )
}
