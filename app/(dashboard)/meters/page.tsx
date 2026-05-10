"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Filter,
  Gauge,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Wrench,
  ChevronRight,
  ChevronLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"
import { metersApi } from "@/lib/api/meters"
import type { MeterLog, MeterLogRequest, MeterOperation, MeterResponse, MeterThreshold } from "@/lib/api/types"
import { mapMeterResponseToUiCard, type UiMeterCard } from "@/lib/adapters"
import { downloadCsv } from "@/lib/export"
import { ApiError } from "@/lib/api/client"
import { useToast } from "@/components/ui/use-toast"
import { workOrdersApi } from "@/lib/api/work-orders"
import { equipmentApi } from "@/lib/api/equipment"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export default function MetersPage() {
  const { t, isRTL } = useI18n()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const [meters, setMeters] = useState<MeterResponse[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [manageOpen, setManageOpen] = useState(false)
  const [manageMode, setManageMode] = useState<"manage" | "log" | "logs">("manage")
  const [selectedMeter, setSelectedMeter] = useState<UiMeterCard | null>(null)
  const [selectedMeterId, setSelectedMeterId] = useState<number | null>(null)
  const [thresholds, setThresholds] = useState<MeterThreshold[]>([])
  const [logs, setLogs] = useState<MeterLog[]>([])
  const [isManageLoading, setIsManageLoading] = useState(false)
  const [isLogsLoading, setIsLogsLoading] = useState(false)

  const [logOperation, setLogOperation] = useState<MeterOperation>("ADD")
  const [logAmount, setLogAmount] = useState<string>("")
  const [thresholdValue, setThresholdValue] = useState<string>("")
  const [thresholdLabel, setThresholdLabel] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  const { user } = useAuth()
  const [recommendationOpen, setRecommendationOpen] = useState(false)
  const [alertMeters, setAlertMeters] = useState<UiMeterCard[]>([])

  const getApiErrorMessage = (err: unknown): string => {
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

  const loadData = async () => {
    setIsFetching(true)
    setError(null)
    try {
      const res = await metersApi.getAll()
      setMeters(res)

      const uiM = res.map(mapMeterResponseToUiCard)
      const alerts = uiM.filter(m => m.status === 'warning' || m.status === 'critical')

      if (alerts.length > 0) {
        const activeWOs = await workOrdersApi.list({ type: 'PREVENTIVE' })
        const unsolvedAlerts = alerts.filter(m =>
          !activeWOs.some(wo => wo.equipmentId === m.equipmentId && wo.status !== 'CLOSED' && wo.status !== 'VALIDATED')
        )

        if (unsolvedAlerts.length > 0) {
          setAlertMeters(unsolvedAlerts)
          setRecommendationOpen(true)
        }
      }
    } catch {
      setMeters([])
      setError(t('failedToLoad'))
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!manageOpen || !selectedMeterId) return
    setIsManageLoading(true)
    setThresholds([])
    setLogs([])
    setIsLogsLoading(true)
    const load = async () => {
      try {
        const [th, lg] = await Promise.all([
          metersApi.getThresholds(selectedMeterId),
          metersApi.getLogs(selectedMeterId),
        ])
        if (cancelled) return
        setThresholds(th)
        setLogs(lg)
      } catch {
        if (cancelled) return
        setThresholds([])
        setLogs([])
      } finally {
        if (cancelled) return
        setIsManageLoading(false)
        setIsLogsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [manageOpen, selectedMeterId])

  const uiMeters: UiMeterCard[] = useMemo(() => meters.map(mapMeterResponseToUiCard), [meters])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "destructive"
      case "warning":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "critical":
        return t('critical')
      case "warning":
        return t('warning')
      default:
        return t('normal')
    }
  }

  const getProgressColor = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-red-500"
      case "warning":
        return "bg-amber-500"
      default:
        return "bg-emerald-500"
    }
  }

  const filteredMeters = useMemo(() => {
    return uiMeters.filter((meter) => {
      const q = searchQuery.toLowerCase()
      return (
        meter.name.toLowerCase().includes(q) ||
        meter.equipmentLabel.toLowerCase().includes(q)
      )
    })
  }, [searchQuery, uiMeters])

  const paginatedMeters = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredMeters.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredMeters, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredMeters.length / itemsPerPage)

  const stats = useMemo(() => {
    const total = uiMeters.length
    const normal = uiMeters.filter((m) => m.status === "normal").length
    const warning = uiMeters.filter((m) => m.status === "warning").length
    const critical = uiMeters.filter((m) => m.status === "critical").length
    return { total, normal, warning, critical }
  }, [uiMeters])

  const onExport = () => {
    downloadCsv(
      "meters.csv",
      ["id", "name", "equipment", "value", "unit", "threshold", "status", "lastReading"],
      filteredMeters.map((m) => [
        m.id,
        m.name,
        m.equipmentLabel,
        m.value,
        m.unit,
        m.primaryThreshold,
        m.status,
        m.lastReading,
      ])
    )
  }

  const onSyncAll = async () => {
    if (isFetching) return
    setIsFetching(true)
    setError(null)
    try {
      const res = await metersApi.getAll()
      setMeters(res)
      toast({ title: t('success') })
    } catch {
      setMeters([])
      toast({
        title: t('error'),
        variant: "destructive",
      })
      setError(t('failedToLoad'))
    } finally {
      setIsFetching(false)
    }
  }

  const openManage = (meter: UiMeterCard, mode: "manage" | "log" | "logs" = "manage") => {
    setSelectedMeter(meter)
    setSelectedMeterId(meter.id)
    setLogOperation("ADD")
    setLogAmount("")
    setThresholdValue("")
    setThresholdLabel("")
    setManageMode(mode)
    setManageOpen(true)
  }

  const onRecordLog = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedMeterId || isSaving) return
    const amount = Number(logAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: t('error'),
        variant: "destructive",
      })
      return
    }
    setIsSaving(true)
    try {
      const payload: MeterLogRequest = { operation: logOperation, amount }
      await metersApi.recordLog(selectedMeterId, payload)
      toast({ title: t('success') })
      const [all, lg] = await Promise.all([
        metersApi.getAll(),
        metersApi.getLogs(selectedMeterId),
      ])
      setMeters(all)
      setLogs(lg)
      setLogAmount("")
    } catch (err) {
      toast({
        title: t('error'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const onCreateThreshold = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedMeterId || isSaving) return
    const value = Number(thresholdValue)
    if (!Number.isFinite(value) || value <= 0) {
      toast({
        title: t('error'),
        variant: "destructive",
      })
      return
    }
    if (!thresholdLabel.trim()) {
      toast({
        title: t('error'),
        variant: "destructive",
      })
      return
    }
    setIsSaving(true)
    try {
      await metersApi.createThreshold(selectedMeterId, { thresholdValue: value, label: thresholdLabel.trim() })
      toast({ title: t('thresholdAdded') })
      const [all, th] = await Promise.all([
        metersApi.getAll(),
        metersApi.getThresholds(selectedMeterId),
      ])
      setMeters(all)
      setThresholds(th)
      setThresholdValue("")
      setThresholdLabel("")
    } catch (err) {
      toast({
        title: t('addFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreatePreventiveWO = async (meter: UiMeterCard) => {
    if (isSaving || !meter.equipmentId) return
    setIsSaving(true)
    try {
      const equipRes = await equipmentApi.getById(meter.equipmentId)
      const equip = equipRes || { name: meter.equipmentLabel, assetCode: 'N/A', location: 'N/A' }

      const payload = {
        title: `PREVENTIVE: ${equip.name} (${meter.name})`,
        description: `Threshold ALERT: ${meter.value} ${meter.unit} (Threshold: ${meter.primaryThreshold} ${meter.unit}).\nEquipment: ${equip.name} [${equip.assetCode}]\nLocation: ${equip.location}\nSuggested Plan: Perform deep inspection and necessary component replacement.`,
        equipmentId: meter.equipmentId,
        priority: meter.status === 'critical' ? 'CRITICAL' : 'HIGH',
        woType: 'PREVENTIVE',
      }

      await workOrdersApi.create(payload)

      try {
        await equipmentApi.updateStatus(meter.equipmentId, 'UNDER_REPAIR')
      } catch (e) {
        console.warn("Failed to update equipment status", e)
      }

      toast({
        title: t('preventiveWorkOrderC'),
      })
      loadData()
      setRecommendationOpen(false)
    } catch (err) {
      toast({
        title: t('error'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-3 md:p-3 sm:p-6 pt-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t('meters')}</h2>
          <p className="text-muted-foreground">{t('equipmentMeterTracki')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('export')}
          </Button>
          <Button variant="outline" size="sm" onClick={onSyncAll} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2", isFetching && "animate-spin")} />
            {t('syncAll')}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: t('totalMeters'), value: stats.total, icon: Gauge, color: "text-primary" },
          { title: t('normal'), value: stats.normal, icon: TrendingUp, color: "text-emerald-500" },
          { title: t('warning'), value: stats.warning, icon: Clock, color: "text-amber-500" },
          { title: t('critical'), value: stats.critical, icon: AlertTriangle, color: "text-rose-500" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">{stat.title}</CardTitle>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input
            placeholder={t('searchMeters')}
            className={cn(isRTL ? "pr-9" : "pl-9")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('filter')}
          </Button>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-2 md:gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {paginatedMeters.map((meter) => (
          <motion.div key={meter.id} variants={itemVariants}>
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md" onClick={() => openManage(meter)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusColor(meter.status)}>
                    {getStatusLabel(meter.status)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">
                    {meter.unit}
                  </span>
                </div>
                <CardTitle className="line-clamp-1 text-sm mt-2">{meter.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{meter.equipmentLabel}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-xl">{meter.value}</span>
                    <span className="text-muted-foreground text-xs">
                      {t('threshold')}: {meter.primaryThreshold || "-"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full transition-all", getProgressColor(meter.status))}
                      style={{ width: `${Math.min((meter.value / (meter.primaryThreshold || meter.value || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium pt-2 border-t border-border/50">
                   <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {meter.lastReading}
                   </div>
                   <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={(e) => {
                     e.stopPropagation()
                     openManage(meter, "log")
                   }}>
                     {t('record')}
                   </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 py-3 border-t border-border/50">
        <div className="text-xs text-muted-foreground">
          {t('showing')} {(currentPage - 1) * itemsPerPage + 1} {t('to')} {Math.min(currentPage * itemsPerPage, filteredMeters.length)} {t('of')} {filteredMeters.length} {t('results')}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {t('previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            {t('next')}
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Manage Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-[600px]" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : "text-left"}>
            <DialogTitle>{t('manageMeter')}: {selectedMeter?.name}</DialogTitle>
            <DialogDescription>{selectedMeter?.equipmentLabel}</DialogDescription>
          </DialogHeader>

          <div className="flex border-b">
            <button
              onClick={() => setManageMode("manage")}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 transition-all",
                manageMode === "manage" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t('configuration')}
            </button>
            <button
              onClick={() => setManageMode("log")}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 transition-all",
                manageMode === "log" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t('recordReading')}
            </button>
            <button
              onClick={() => setManageMode("logs")}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 transition-all",
                manageMode === "logs" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t('recentActivity')}
            </button>
          </div>

          <div className="py-3">
            {manageMode === "manage" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('thresholds')}</h4>
                  <form onSubmit={onCreateThreshold} className="flex items-end gap-2">
                    <div className="grid gap-1.5 flex-1">
                      <Label htmlFor="t-label" className="text-xs">{t('name')}</Label>
                      <Input
                        id="t-label"
                        placeholder="Preventive Trigger"
                        value={thresholdLabel}
                        onChange={(e) => setThresholdLabel(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5 w-24">
                      <Label htmlFor="t-val" className="text-xs">{t('value')}</Label>
                      <Input
                        id="t-val"
                        type="number"
                        placeholder="100"
                        value={thresholdValue}
                        onChange={(e) => setThresholdValue(e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={isSaving} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </form>

                  <div className="space-y-2 max-h-40 overflow-auto">
                    {thresholds.map((th) => (
                      <div key={th.id} className="flex items-center justify-between p-2 rounded border bg-muted/50">
                        <span className="text-xs font-medium">{th.label}</span>
                        <Badge variant="outline">{th.thresholdValue}</Badge>
                      </div>
                    ))}
                    {thresholds.length === 0 && !isManageLoading && (
                      <p className="text-xs text-center py-3 text-muted-foreground">{t('noData')}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                   <Button variant="destructive" className="w-full" onClick={() => toast({ title: t('resetMeterToZero') })}>
                     {t('resetMeterToZero')}
                   </Button>
                   <p className="text-[10px] text-muted-foreground mt-2 text-center">{t('resetMeterDesc')}</p>
                </div>
              </div>
            )}

            {manageMode === "log" && (
              <form onSubmit={onRecordLog} className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
                   <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{t('currentValue')}</p>
                      <p className="text-4xl font-black text-primary">{selectedMeter?.value} <span className="text-sm font-normal">{selectedMeter?.unit}</span></p>
                   </div>
                </div>

                <div className="grid gap-2">
                  <Label>{t('action')}</Label>
                  <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
                    <Button
                      type="button"
                      variant={logOperation === "ADD" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setLogOperation("ADD")}
                    >
                      {t('add')}
                    </Button>
                    <Button
                      type="button"
                      variant={logOperation === "SUBTRACT" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setLogOperation("SUBTRACT")}
                    >
                      {t('subtract')}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="amount">{t('amount')}</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="any"
                    autoFocus
                    placeholder="Enter amount..."
                    value={logAmount}
                    onChange={(e) => setLogAmount(e.target.value)}
                  />
                </div>

                <Button className="w-full" type="submit" disabled={isSaving}>
                  {isSaving ? t('loading') : t('record')}
                </Button>
              </form>
            )}

            {manageMode === "logs" && (
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded border bg-card text-xs">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", log.operation === 'ADD' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600')}>
                        {log.operation === 'ADD' ? '+' : '-'}
                      </div>
                      <div>
                        <p className="font-bold">{log.amount} {selectedMeter?.unit}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(log.recordedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('value')}</p>
                       <p className="font-mono">{log.previousValue} → {log.newValue}</p>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && !isLogsLoading && (
                  <p className="text-xs text-center py-10 text-muted-foreground">{t('noData')}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recommendation Dialog */}
      <Dialog open={recommendationOpen} onOpenChange={setRecommendationOpen}>
        <DialogContent className="sm:max-w-[500px]" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : "text-left"}>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
               <AlertTriangle className="h-5 w-5" />
               {t('thresholdExceededTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('thresholdExceededDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
             <div className="max-h-60 overflow-auto space-y-2 pr-1">
               {alertMeters.map(m => (
                 <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-rose-50/30">
                    <div>
                      <p className="font-bold text-xs">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.equipmentLabel}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-rose-600">{m.value} / {m.primaryThreshold} {m.unit}</p>
                       <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary hover:bg-primary/10" onClick={() => handleCreatePreventiveWO(m)}>
                          {t('createPreventiveWO')}
                       </Button>
                    </div>
                 </div>
               ))}
             </div>

             {(!user || !user.hasRole('TECHNICIAN')) && (
               <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="flex gap-3">
                     <Wrench className="h-5 w-5 text-primary shrink-0" />
                     <div>
                       <p className="text-xs font-bold text-primary">{t('recommendation')}</p>
                       <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                          AI recommends generating preventive work orders for these meters immediately to avoid equipment failure.
                       </p>
                     </div>
                  </div>
               </div>
             )}
          </div>

          <DialogFooter>
             <Button variant="outline" onClick={() => setRecommendationOpen(false)}>{t('cancel')}</Button>
             <Button onClick={() => handleCreatePreventiveWO(alertMeters[0])} disabled={alertMeters.length === 0}>{t('createPreventiveWO')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
