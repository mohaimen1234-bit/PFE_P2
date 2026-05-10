"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  BrainCircuit, AlertTriangle, ShieldAlert, Activity, Search,
  RefreshCw, ExternalLink, Wrench, TrendingUp, Gauge, Calendar, MapPin
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { aiApi } from "@/lib/api/ai"
import { workOrdersApi } from "@/lib/api/work-orders"
import type { PredictionResponse } from "@/lib/api/types"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n"
import { usePagination } from "@/lib/hooks/use-pagination"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

const fadeInUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } }

export default function AiPredictivePage() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER, ROLES.FINANCE_MANAGER]}>
      <AiPredictivePageContent />
    </RouteGuard>
  )
}

function AiPredictivePageContent() {
  const router = useRouter()
  const { t, isRTL } = useI18n()
  const [predictions, setPredictions] = useState<PredictionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState<string>("ALL")
  const [criticalityFilter, setCriticalityFilter] = useState<string>("ALL")
  const [isCreatingWo, setIsCreatingWo] = useState<number | null>(null)

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)
    try {
      const data = await aiApi.getPredictions()
      setPredictions(data)
    } catch (err: any) {
      console.error("Failed to load AI predictions", err)
      setError(t("failedToLoadPredictive"))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredPredictions = predictions
    .filter(p => {
      const matchesSearch = search === "" || 
        (p.equipmentName?.toLowerCase().includes(search.toLowerCase())) ||
        (p.equipmentCode?.toLowerCase().includes(search.toLowerCase())) ||
        p.equipmentId.toString().includes(search)
      const matchesRisk = riskFilter === "ALL" || p.riskLevel === riskFilter
      const matchesCriticality = criticalityFilter === "ALL" || p.criticality === criticalityFilter
      return matchesSearch && matchesRisk && matchesCriticality
    })
    .sort((a, b) => b.finalRiskScore - a.finalRiskScore)

  const riskDistribution = {
    CRITICAL: predictions.filter(p => p.riskLevel === "CRITICAL").length,
    HIGH: predictions.filter(p => p.riskLevel === "HIGH").length,
    MEDIUM: predictions.filter(p => p.riskLevel === "MEDIUM").length,
    LOW: predictions.filter(p => p.riskLevel === "LOW").length,
  }

  const totalEquipmentCount = predictions.length
  const interventionsNeeded = riskDistribution.HIGH + riskDistribution.CRITICAL
  const avgScore = totalEquipmentCount > 0 
    ? Math.round(predictions.reduce((acc, p) => acc + p.finalRiskScore, 0) / totalEquipmentCount) : 0

  const { paginatedItems: paginatedPredictions, PaginationControls } = usePagination(predictions, 10)

  const getRiskColor = (level: string) => {
    switch(level) {
      case "CRITICAL": return "bg-rose-500/10 text-rose-500"
      case "HIGH": return "bg-orange-500/10 text-orange-500"
      case "MEDIUM": return "bg-amber-500/10 text-amber-500"
      case "LOW": return "bg-emerald-500/10 text-emerald-500"
      default: return "bg-gray-500/10 text-gray-500"
    }
  }
  const getRiskProgressColor = (level: string) => {
    switch(level) {
      case "CRITICAL": return "bg-rose-500"
      case "HIGH": return "bg-orange-500"
      case "MEDIUM": return "bg-amber-500"
      case "LOW": return "bg-emerald-500"
      default: return "bg-gray-500"
    }
  }
  const getCriticalityColor = (crit: string | null | undefined) => {
    switch(crit) {
      case "CRITICAL": return "bg-rose-500/10 text-rose-500"
      case "HIGH": return "bg-orange-500/10 text-orange-500"
      case "MEDIUM": return "bg-amber-500/10 text-amber-500"
      case "LOW": return "bg-emerald-500/10 text-emerald-500"
      default: return "bg-gray-500/10 text-gray-500"
    }
  }
  const getSeverityColor = (sev: string) => {
    if (sev.includes("IMMINENT")) return "bg-rose-600 text-white"
    if (sev.includes("HIGH_FAILURE")) return "bg-rose-500/15 text-rose-600"
    if (sev.includes("DEGRADED")) return "bg-orange-500/15 text-orange-600"
    if (sev.includes("EARLY")) return "bg-amber-500/15 text-amber-600"
    return "bg-emerald-500/15 text-emerald-600"
  }

  const handleCreatePredictiveWo = async (pred: PredictionResponse) => {
    setIsCreatingWo(pred.equipmentId)
    try {
      const reasonsText = pred.reasons && pred.reasons.length > 0
        ? `\n\n${t("riskFactors")}:\n` + pred.reasons.map(f => "• " + f).join("\n") : ""
      const dueDate = pred.riskLevel === "CRITICAL" 
        ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
        : pred.riskLevel === "HIGH"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

      const description = `${t("predictiveMaintenanceDesc")}

${t("finalRiskScore")}: ${pred.finalRiskScore}/100
${t("riskLevel")}: ${pred.riskLevel}
${t("suggestedSeverity")}: ${pred.suggestedSeverity}

${t("riskBreakdown")}:
- ${t("ageRisk")}: ${pred.ageRisk}/25
- ${t("failureHistoryRisk")}: ${pred.failureHistoryRisk}/40
- ${t("meterThresholdRisk")}: ${pred.meterThresholdRisk}/20
- ${t("predictiveOutcomeCredit")}: -${pred.predictiveOutcomeCredit}
- ${t("pofScore")}: ${pred.pofScore}
- ${t("criticalityMultiplier")}: ${pred.criticalityMultiplier}x
${reasonsText}

${t("recommendedAction")}:
${pred.recommendation}`

      const wo = await workOrdersApi.create({
        equipmentId: pred.equipmentId,
        woType: pred.suggestedWorkOrderType,
        priority: pred.suggestedPriority,
        title: `${t("predictive")} ${t("maintenance")} - ${pred.equipmentName || t('equipmentHash') + pred.equipmentId}`,
        description,
        dueDate,
      })
      toast.success(`${t("predictiveWorkOrderCreated")} (${t('woHash')} ${wo.woId})`)
      router.push(`/work-orders/${wo.woId}`)
    } catch (err: any) {
      console.error("Failed to create predictive WO", err)
      toast.error(t("failedToCreatePredictive"))
    } finally {
      setIsCreatingWo(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
        <Activity className="h-8 w-10 text-primary animate-pulse" />
        <p className="text-muted-foreground">{t("analyzingRiskProfiles")}</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
        <AlertTriangle className="h-8 w-10 text-destructive" />
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={() => loadData()}>{t("tryAgain")}</Button>
      </div>
    )
  }

  return (
    <motion.div initial="initial" animate="animate" className="flex-1 space-y-6 overflow-auto pb-10" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-primary/10 p-3 rounded-2xl shadow-inner">
            <BrainCircuit className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("predictiveMaintenance")}</h1>
            <p className="text-muted-foreground italic">{t("predictiveMaintenanceDesc")}</p>
          </div>
        </div>
        <Button onClick={() => loadData(true)} variant="outline" className="gap-2" disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {t("refreshAnalysis")}
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeInUp} className="grid gap-2 md:gap-3 md:grid-cols-5">
        {[
          { label: t("equipmentMonitored"), value: totalEquipmentCount, color: "text-primary" },
          { label: t("highRisk"), value: riskDistribution.HIGH, color: "text-orange-500" },
          { label: t("criticalRisk"), value: riskDistribution.CRITICAL, color: "text-rose-500" },
          { label: t("interventionsNeeded"), value: interventionsNeeded, color: "text-amber-500" },
          { label: t("avgRiskScore"), value: avgScore, color: "text-primary" },
        ].map(s => (
          <Card key={s.label} className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent><div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Risk Distribution */}
      <motion.div variants={fadeInUp} className="grid gap-2 md:gap-3 md:grid-cols-4">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => {
          const count = riskDistribution[level]
          const pct = totalEquipmentCount > 0 ? Math.round((count / totalEquipmentCount) * 100) : 0
          return (
            <Card key={level} className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className={`border-none text-xs ${getRiskColor(level)}`}>{t(level.toLowerCase())}</Badge>
                  <span className="text-xs font-bold">{count}</span>
                </div>
                <Progress value={pct} className="h-1.5" indicatorClassName={getRiskProgressColor(level)} />
                <p className="text-xs text-muted-foreground mt-1">{pct}% {t("of")} {t("equipment")}</p>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row gap-2 md:gap-3">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
          <Input placeholder={t("searchEquipmentPlaceholder")} className={`${isRTL ? "pr-9" : "pl-9"} bg-card/50 border-border`}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[150px] bg-card/50 border-border"><SelectValue placeholder={t("riskLevel")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allRiskLevels")}</SelectItem>
            <SelectItem value="CRITICAL">{t("critical")}</SelectItem>
            <SelectItem value="HIGH">{t("high")}</SelectItem>
            <SelectItem value="MEDIUM">{t("medium")}</SelectItem>
            <SelectItem value="LOW">{t("low")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
          <SelectTrigger className="w-[160px] bg-card/50 border-border"><SelectValue placeholder={t("criticality")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allCriticalities")}</SelectItem>
            <SelectItem value="CRITICAL">{t("critical")}</SelectItem>
            <SelectItem value="HIGH">{t("high")}</SelectItem>
            <SelectItem value="MEDIUM">{t("medium")}</SelectItem>
            <SelectItem value="LOW">{t("low")}</SelectItem>
            <SelectItem value="UNKNOWN">{t("unknown")}</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Equipment Risk Table */}
      <motion.div variants={fadeInUp}>
        <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
          <CardContent className="p-0">
            {predictions.length === 0 ? (
              <div className="py-20 text-center">
                <div className="bg-primary/10 w-16 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gauge className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold mb-2">{t("noEquipmentData")}</h3>
                <p className="text-muted-foreground">{t("equipmentMustBeReg")}</p>
              </div>
            ) : filteredPredictions.length === 0 ? (
              <div className="py-20 text-center"><p className="text-muted-foreground">{t("noMatches")}</p></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("equipment")}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("criticality")}</TableHead>
                      <TableHead className="text-center">{t("age")}<br/><span className="text-[10px] text-muted-foreground">/25</span></TableHead>
                      <TableHead className="text-center">{t("failures")}<br/><span className="text-[10px] text-muted-foreground">/40</span></TableHead>
                      <TableHead className="text-center">{t("meter")}<br/><span className="text-[10px] text-muted-foreground">/20</span></TableHead>
                      <TableHead className="text-center">{t("score")}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("risk")}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("severity")}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("state")}</TableHead>
                      <TableHead className={isRTL ? "text-left" : "text-right"}>{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPredictions.map((pred) => (
                      <TableRow key={pred.equipmentId} className="group">
                        <TableCell>
                          <div className={isRTL ? "text-right" : "text-left"}>
                            <div className="font-medium">{pred.equipmentName || t("unknown")}</div>
                            <div className="text-xs text-muted-foreground">{pred.equipmentCode || `ID: ${pred.equipmentId}`}</div>
                            {pred.location && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{pred.location}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none ${getCriticalityColor(pred.criticality)}`}>
                            {pred.criticality ? t(pred.criticality.toLowerCase()) : t('notAvailableShort')}
                          </Badge>
                          <span className={`text-[10px] text-muted-foreground ${isRTL ? "mr-1" : "ml-1"}`}>×{pred.criticalityMultiplier}</span>
                        </TableCell>
                        <TableCell className="text-center font-medium">{pred.ageRisk}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${pred.failureHistoryRisk >= 30 ? "text-rose-500" : ""}`}>{pred.failureHistoryRisk}</span>
                          <div className="text-[10px] text-muted-foreground">{pred.correctiveWoCount} {t("workOrders")}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${pred.meterThresholdRisk >= 15 ? "text-orange-500" : ""}`}>{pred.meterThresholdRisk}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={pred.finalRiskScore} className="h-1.5 flex-1" indicatorClassName={getRiskProgressColor(pred.riskLevel)} />
                            <span className={`text-xs font-bold w-8 ${isRTL ? "text-left" : "text-right"}`}>{pred.finalRiskScore}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none ${getRiskColor(pred.riskLevel)}`}>{t(pred.riskLevel.toLowerCase())}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none text-[10px] ${getSeverityColor(pred.suggestedSeverity)}`}>
                            {t(pred.suggestedSeverity.toLowerCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none text-[10px]`}>
                            {t(pred.interventionState.toLowerCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className={isRTL ? "text-left" : "text-right"}>
                          <div className={`flex items-center ${isRTL ? "justify-start" : "justify-end"} gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity`}>
                            <Button size="icon" variant="ghost" title={t("viewEquipment")}
                              onClick={() => router.push(`/equipment`)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            {pred.interventionState === "WO_OPEN" || pred.interventionState === "AWAITING_VALIDATION" ? (
                              <Badge variant="outline" className="text-[10px] opacity-70">{t("woActive")}</Badge>
                            ) : pred.shouldSuggestWorkOrder ? (
                              <Button size="icon" variant="ghost"
                                className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                title={t("createPredictiveWO")}
                                disabled={isCreatingWo === pred.equipmentId}
                                onClick={() => handleCreatePredictiveWo(pred)}>
                                <Wrench className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <PaginationControls />
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Cards for HIGH & CRITICAL */}
      {filteredPredictions.some(p => p.riskLevel === "CRITICAL" || p.riskLevel === "HIGH") && (
        <motion.div variants={fadeInUp}>
          <h2 className="text-sm sm:text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("riskFactorDetails")}
          </h2>
          <div className="grid gap-2 md:gap-3 md:grid-cols-2">
            {filteredPredictions
              .filter(p => p.riskLevel === "CRITICAL" || p.riskLevel === "HIGH")
              .map((pred) => (
                <Card key={`detail-${pred.equipmentId}`} className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className={isRTL ? "text-right" : "text-left"}>
                        <CardTitle className="text-sm">{pred.equipmentName}</CardTitle>
                        <p className="text-xs text-muted-foreground">{pred.equipmentCode || `EQ-${pred.equipmentId}`}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={`border-none ${getRiskColor(pred.riskLevel)}`}>
                          {t(pred.riskLevel.toLowerCase())} — {pred.finalRiskScore}
                        </Badge>
                        <Badge variant="outline" className={`border-none text-[10px] ${getSeverityColor(pred.suggestedSeverity)}`}>
                          {t(pred.suggestedSeverity.toLowerCase())}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">{t("riskBreakdown")}</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span>{t("ageRisk")}</span>
                              <span className="font-medium">{pred.ageRisk}/25</span>
                            </div>
                            <Progress value={(pred.ageRisk / 25) * 100} className="h-1" indicatorClassName="bg-primary" />
                            <div className="flex justify-between text-xs">
                              <span>{t("failureHistoryRisk")}</span>
                              <span className="font-medium">{pred.failureHistoryRisk}/40</span>
                            </div>
                            <Progress value={(pred.failureHistoryRisk / 40) * 100} className="h-1" indicatorClassName="bg-primary" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">{t("recommendedAction")}</p>
                          <div className="bg-muted/50 p-2 rounded-lg text-xs italic border-l-2 border-primary">
                            {pred.recommendation}
                          </div>
                        </div>
                      </div>
                      {pred.reasons && pred.reasons.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">{t("riskFactors")}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {pred.reasons.map((r, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] font-normal py-0">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
