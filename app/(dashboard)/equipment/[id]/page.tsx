"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Clock,
  FileText,
  Settings,
  Shield,
  Wrench,
  Download,
  Trash2,
  Upload,
  CheckCircle,
  XCircle,
  EyeOff
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { useI18n } from "@/lib/i18n"

import { equipmentApi } from "@/lib/api/equipment"
import { workOrdersApi } from "@/lib/api/work-orders"
import { departmentsApi } from "@/lib/api/departments"
import { referenceDataApi } from "@/lib/api/reference-data"
import { auditLogsApi } from "@/lib/api/audit-logs"
import type { 
  EquipmentResponse, 
  EquipmentDocument, 
  AuditLog, 
  WorkOrderResponse,
  DepartmentResponse,
  EquipmentCategory,
  EquipmentModel
} from "@/lib/api/types"

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t, language } = useI18n()
  const { toast } = useToast()
  const equipmentId = Number(params.id)

  const [equipment, setEquipment] = useState<EquipmentResponse | null>(null)
  const [documents, setDocuments] = useState<EquipmentDocument[]>([])
  const [history, setHistory] = useState<AuditLog[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrderResponse[]>([])
  
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [models, setModels] = useState<EquipmentModel[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Document Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [eq, docs, hist, wos, depts, cats, mods] = await Promise.all([
          equipmentApi.getById(equipmentId),
          equipmentApi.getDocuments(equipmentId),
          auditLogsApi.getByEntity("EQUIPMENT", equipmentId),
          workOrdersApi.list({ equipmentId }),
          departmentsApi.getAll(),
          referenceDataApi.getCategories(),
          referenceDataApi.getModels()
        ])
        setEquipment(eq)
        setDocuments(docs)
        setHistory(hist)
        setWorkOrders(wos)
        setDepartments(depts)
        setCategories(cats)
        setModels(mods)
      } catch (err) {
        toast({
          title: t('error'),
          description: t('failedToLoadEquipment'),
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    if (equipmentId) fetchData()
  }, [equipmentId, language, toast])

  if (isLoading) {
    return <div className="p-3 sm:p-6 text-center">{t("loading")}</div>
  }

  if (!equipment) {
    return <div className="p-3 sm:p-6 text-center text-destructive">{t("noData")}</div>
  }

  const deptName = departments.find(d => d.departmentId === equipment.departmentId)?.departmentName || "—"
  const catName = equipment.category || "—"
  const modName = equipment.model || "—"

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "OPERATIONAL": return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">{t("operational")}</Badge>
      case "UNDER_REPAIR": return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">{t("underRepair")}</Badge>
      case "ARCHIVED": return <Badge variant="secondary">{t("archived")}</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const toggleOutOfService = async () => {
    if (isUpdatingStatus) return
    setIsUpdatingStatus(true)
    const newStatus = equipment.status === "OPERATIONAL" ? "UNDER_REPAIR" : "OPERATIONAL"
    try {
      await equipmentApi.updateStatus(equipmentId, newStatus)
      setEquipment({ ...equipment, status: newStatus })
      toast({ title: newStatus === "UNDER_REPAIR" ? t('markedOutOfService') : t('restoredToService') })
      // Refresh history
      const hist = await auditLogsApi.getByEntity("EQUIPMENT", equipmentId)
      setHistory(hist)
    } catch (err) {
      toast({ title: t('error'), variant: "destructive" })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDocumentUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    try {
      await equipmentApi.uploadDocument(equipmentId, selectedFile)
      toast({ title: t('documentAdded') })
      setSelectedFile(null)
      const docs = await equipmentApi.getDocuments(equipmentId)
      setDocuments(docs)
    } catch {
      toast({ title: t('uploadError'), variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  // Generate URL for QR (assume frontend domain + path)
  const qrUrl = typeof window !== "undefined" ? window.location.href : `https://cmms.local/equipment/${equipmentId}`

  return (
    <div className="p-3 space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/equipment')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{equipment.name}</h1>
            <p className="text-xs text-muted-foreground font-mono">{equipment.serialNumber} • {deptName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(equipment.status)}
          
          <Button 
            variant={equipment.status === "OPERATIONAL" ? "destructive" : "default"}
            onClick={toggleOutOfService}
            disabled={isUpdatingStatus || equipment.status === "ARCHIVED"}
          >
            {equipment.status === "OPERATIONAL" ? (
              <><EyeOff className="mr-2 h-4 w-4"/> {t('outOfService')}</>
            ) : (
              <><CheckCircle className="mr-2 h-4 w-4"/> {t('inService')}</>
            )}
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline"><Settings className="mr-2 h-4 w-4"/> {t('printQR')}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md text-center">
              <DialogHeader>
                <DialogTitle>{t('equipmentQrCode')}</DialogTitle>
                <DialogDescription>{t('scanToQuicklyAccessT')}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center p-3 bg-white rounded-lg">
                <QRCodeSVG value={qrUrl} size={250} level="H" includeMargin />
              </div>
              <p className="font-mono text-xs">{equipment.serialNumber}</p>
              <div className="flex justify-center mt-4">
                 <Button onClick={() => window.print()}>{t('print')}</Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      <div className="grid gap-3 sm:gap-2 md:gap-3 md:grid-cols-4">
        {/* Sidebar Info */}
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium">{t('information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-xs">{t("location")}</span>
                <span className="font-medium">{equipment.location || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">{t('category')}</span>
                <span className="font-medium">{catName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">{t('model')}</span>
                <span className="font-medium">{modName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">{t("criticality")}</span>
                <span className="font-medium">{equipment.criticality || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">{t('purchase')}</span>
                <span className="font-medium">{equipment.purchaseDate ? new Date(equipment.purchaseDate).toLocaleDateString() : "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">{t('warranty')}</span>
                <span className="font-medium">{equipment.warrantyEndDate ? new Date(equipment.warrantyEndDate).toLocaleDateString() : "—"}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium">{t('meter')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {equipment.startMeterValue || 0} <span className="text-xs text-muted-foreground">{equipment.meterUnit || (t('units'))}</span>
              </div>
              {equipment.thresholds && equipment.thresholds.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">{t('alertThresholdsLabel')}</p>
                  {equipment.thresholds.map((t: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{t.label || t('thresholdN', { n: i + 1 })}</span>
                      <span className="font-mono">{t.value} {equipment.meterUnit}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <div className="md:col-span-3">
          <Tabs defaultValue="wos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="wos">{t('workOrders')} ({workOrders.length})</TabsTrigger>
              <TabsTrigger value="history">{t('history')}</TabsTrigger>
              <TabsTrigger value="docs">{t('documents')} ({documents.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="wos" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('openWorkOrders')}</CardTitle>
                  <CardDescription>{t('workOrdersLinkedToTh')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {workOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">{t('noWorkOrders')}</div>
                  ) : (
                    <div className="space-y-4">
                      {workOrders.map(wo => (
                        <div key={wo.woId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2 md:gap-3">
                          <div>
                            <Link href={`/work-orders/${wo.woId}`} className="font-medium hover:underline flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-blue-500" />
                              {wo.title}
                            </Link>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{wo.description}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant="outline">{wo.status}</Badge>
                            <Badge variant="secondary">{wo.priority}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Maintenance Plans Placeholder */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>{t('maintenancePlans')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                    <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">
                      {t('noMaintenancePlansCo')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Alert Thresholds Section */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>{t('alertThresholds')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {!equipment.thresholds || equipment.thresholds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('noThresholdsDefined')}</p>
                  ) : (
                    <div className="grid gap-2 md:gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {equipment.thresholds.map((t, i) => (
                        <div key={i} className="p-3 border rounded-lg bg-muted/20">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                            {t.label || t('thresholdN', { n: i + 1 })}
                          </p>
                          <p className="text-sm sm:text-lg font-bold font-mono">
                            {t.value} {equipment.meterUnit || "units"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('activityLog')}</CardTitle>
                  <CardDescription>{t('traceabilityOfStatus')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
                    {history.length === 0 ? (
                      <p className="text-xs text-muted-foreground ml-6">{t('noRecentHistory')}</p>
                    ) : history.map((h) => (
                      <div key={h.id} className="mb-6 ml-6">
                        <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border ring-4 ring-background">
                          <Activity className="h-3 w-3" />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{h.actionType}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{h.details}</p>
                          <span className="text-xs text-muted-foreground mt-1 font-mono">
                            {new Date(h.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="docs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('technicalDocumentati')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 md:gap-3 mb-6">
                    <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    <Button onClick={handleDocumentUpload} disabled={!selectedFile || isUploading}>
                      <Upload className="h-4 w-4 mr-2" /> {t('upload')}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-medium">{doc.documentName}</p>
                            <p className="text-xs text-muted-foreground">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 min-w-0">
                          <Button variant="ghost" size="icon" onClick={() => window.open(`/api/equipment/documents/${doc.id}/download`)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
