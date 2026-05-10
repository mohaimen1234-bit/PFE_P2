"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { 
  AlertTriangle, Search, Activity, FileText, Filter, 
  ChevronRight, Calendar, Building, ListFilter 
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { aiApi } from "@/lib/api/ai"
import { departmentsApi } from "@/lib/api/departments"
import type { 
  FailureAnalysisReportSummary,
  FailureAnalysisReportDetail,
  DepartmentResponse
} from "@/lib/api/types"
import { useI18n } from "@/lib/i18n"
import { usePagination } from "@/lib/hooks/use-pagination"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

export default function FailureAnalysisPage() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER, ROLES.FINANCE_MANAGER]}>
      <FailureAnalysisPageContent />
    </RouteGuard>
  )
}

function FailureAnalysisPageContent() {
  const { t, isRTL } = useI18n()
  
  // Filters State
  const [periodDays, setPeriodDays] = useState<string>("90")
  const [minClaims, setMinClaims] = useState<string>("3")
  const [minAffected, setMinAffected] = useState<string>("2")
  const [departmentId, setDepartmentId] = useState<string>("ALL")
  const [severity, setSeverity] = useState<string>("ALL")
  
  // Data State
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [reports, setReports] = useState<FailureAnalysisReportSummary[]>([])
  const { paginatedItems: paginatedReports, PaginationControls } = usePagination(reports, 10)
  const [isLoading, setIsLoading] = useState(false)
  
  // Detail State
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [reportDetail, setReportDetail] = useState<FailureAnalysisReportDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Initial load
  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    try {
      const data = await departmentsApi.getAll()
      setDepartments(data)
    } catch (error) {
      console.error("Failed to load departments:", error)
      toast.error(t("failedToLoad"))
    }
  }

  const handleGenerateReport = async () => {
    setIsLoading(true)
    setReports([])
    try {
      const params = {
        analysisPeriodDays: parseInt(periodDays, 10),
        minClaims: parseInt(minClaims, 10),
        minAffectedEquipment: parseInt(minAffected, 10),
        ...(departmentId !== "ALL" && { departmentId: parseInt(departmentId, 10) }),
        ...(severity !== "ALL" && { severity })
      }
      
      const data = await aiApi.getFailureAnalysisReports(params)
      setReports(data)
      
      if (data.length === 0) {
        toast.info(t("noPatternsDetected"))
      } else {
        toast.success(t("success"))
      }
    } catch (error) {
      console.error("Failed to generate reports:", error)
      toast.error(t("error"))
      setReports([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetFilters = () => {
    setPeriodDays("90")
    setMinClaims("3")
    setMinAffected("2")
    setDepartmentId("ALL")
    setSeverity("ALL")
    setReports([])
    toast.info(t("reset"))
  }

  const handleViewDetails = async (reportId: string) => {
    setSelectedReportId(reportId)
    setReportDetail(null)
    setIsDetailOpen(true)
    setIsDetailLoading(true)
    
    try {
      const params = {
        analysisPeriodDays: parseInt(periodDays, 10),
        minClaims: parseInt(minClaims, 10),
        minAffectedEquipment: parseInt(minAffected, 10),
        ...(departmentId !== "ALL" && { departmentId: parseInt(departmentId, 10) }),
        ...(severity !== "ALL" && { severity })
      }
      
      const detail = await aiApi.getFailureAnalysisReportDetail(reportId, params)
      setReportDetail(detail)
    } catch (error) {
      console.error("Failed to load report details:", error)
      toast.error(t("failedToLoad"))
      setIsDetailOpen(false)
    } finally {
      setIsDetailLoading(false)
    }
  }

  // Calculate summary metrics
  const totalOpenClaims = reports.reduce((acc, r) => acc + r.claimCount, 0)
  const highestSeverityValue = reports.some(r => r.severity === 'CRITICAL') ? 'CRITICAL' :
                         reports.some(r => r.severity === 'HIGH') ? 'HIGH' :
                         reports.some(r => r.severity === 'MEDIUM') ? 'MEDIUM' :
                         reports.some(r => r.severity === 'LOW') ? 'LOW' : 'NONE'
                         
  const totalAffected = reports.reduce((acc, r) => acc + r.affectedEquipmentCount, 0)

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-700 hover:bg-red-500/20'
      case 'HIGH': return 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/20'
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20'
      case 'LOW': return 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '-'
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="flex-1 space-y-4 p-3 md:p-3 sm:p-6 pt-6" dir={isRTL ? "rtl" : "ltr"}>
      
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            {t("failureAnalysis")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t("failureAnalysisDesc")}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3 items-end">
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-slate-600">
                <Calendar className="h-4 w-4" /> {t("period")}
              </label>
              <Select value={periodDays} onValueChange={setPeriodDays}>
                <SelectTrigger>
                  <SelectValue placeholder={t("select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">{t("last30Days")}</SelectItem>
                  <SelectItem value="90">{t("last90Days")}</SelectItem>
                  <SelectItem value="180">{t("last6Months")}</SelectItem>
                  <SelectItem value="365">{t("last1Year")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-slate-600">
                <Building className="h-4 w-4" /> {t("department")}
              </label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("allDepartments")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("allDepartments")}</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.departmentId} value={dept.departmentId.toString()}>
                      {dept.departmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-slate-600">
                <Filter className="h-4 w-4" /> {t("minClaims")}
              </label>
              <Input 
                type="number" 
                min="1" 
                value={minClaims} 
                onChange={(e) => setMinClaims(e.target.value)} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-slate-600">
                <ListFilter className="h-4 w-4" /> {t("minAffectedEquip")}
              </label>
              <Input 
                type="number" 
                min="1" 
                value={minAffected} 
                onChange={(e) => setMinAffected(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                className="w-full" 
                onClick={handleGenerateReport}
                disabled={isLoading}
              >
                <Search className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                {isLoading ? t("analyzing") : t("generateReports")}
              </Button>
              <Button 
                variant="outline"
                className="w-full" 
                onClick={handleResetFilters}
                disabled={isLoading}
              >
                {t("reset")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">{t("suspiciousPatterns")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">{t("showing")} {periodDays} {t("days")}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">{t("affectedEquipment")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalAffected}</div>
            <p className="text-xs text-muted-foreground">{t("allInterventions")}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">{t("claimsInvolved")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalOpenClaims}</div>
            <p className="text-xs text-muted-foreground">{t("totalClaims")}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">{t("highestSeverity")}</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", highestSeverityValue === 'CRITICAL' ? 'text-red-500' : 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {highestSeverityValue === 'NONE' ? '-' : highestSeverityValue}
            </div>
            <p className="text-xs text-muted-foreground">{t("criticality")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Report List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("analysisReports")}</CardTitle>
          <CardDescription>
            {t("evidenceBasedFindings")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Search className="h-12 w-16 text-slate-200 dark:text-slate-800 mb-4" />
              <p className="text-sm sm:text-lg font-semibold text-slate-400">{t("noPatternsDetected")}</p>
              <p className="text-xs mt-1 max-w-xs text-center">{t("noPatternsDesc")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-2 md:gap-3">
              {paginatedReports.map((report) => (
                <div 
                  key={report.id} 
                  onClick={() => handleViewDetails(report.id)}
                  className="group relative flex flex-col p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={cn("px-2 py-0.5 rounded-md font-bold text-[10px] tracking-tight", getSeverityColor(report.severity))} variant="secondary">
                      {report.severity}
                    </Badge>
                    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-[10px] border-slate-100 dark:border-slate-700">
                      {report.scopeLabel}
                    </Badge>
                  </div>
                  
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors text-left rtl:text-right">
                    {report.title}
                  </h3>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 font-medium leading-relaxed text-left rtl:text-right">
                    {report.mainFinding}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex gap-2 md:gap-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t("claims")}</span>
                        <span className="text-xs font-black dark:text-white">{report.claimCount}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t("equipment")}</span>
                        <span className="text-xs font-black dark:text-white">{report.affectedEquipmentCount}</span>
                      </div>
                    </div>
                    
                    <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-violet-600 group-hover:text-white transition-all">
                      <ChevronRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </div>
              ))}
              <PaginationControls />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side={isRTL ? "left" : "right"} className="w-full sm:max-w-2xl overflow-y-auto">
          {isDetailLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Activity className="h-8 w-10 text-violet-500 animate-pulse" />
              <p className="text-muted-foreground font-medium">{t("analyzing")}</p>
            </div>
          ) : reportDetail ? (
            <div className="space-y-8 pb-10" dir={isRTL ? "rtl" : "ltr"}>
              <SheetHeader className="text-left rtl:text-right">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={cn("font-bold text-[10px] tracking-widest uppercase px-3 py-1 rounded-full shadow-sm", getSeverityColor(reportDetail.summary.severity))}>
                    {reportDetail.summary.severity}
                  </Badge>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{reportDetail.summary.scopeLabel}</span>
                </div>
                <SheetTitle className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {reportDetail.summary.title}
                </SheetTitle>
                <SheetDescription className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-2">
                  {reportDetail.summary.mainFinding}
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="findings" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1">
                  <TabsTrigger value="findings" className="rounded-lg font-bold text-xs uppercase tracking-wider">{t("summary")}</TabsTrigger>
                  <TabsTrigger value="evidence" className="rounded-lg font-bold text-xs uppercase tracking-wider">{t("audit")}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="findings" className="mt-6 space-y-8">
                  <section>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{t("recommendation")}</h4>
                    <div className="p-5 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/50 shadow-sm">
                      <p className="text-xs font-bold text-violet-900 dark:text-violet-200 leading-relaxed">
                        {reportDetail.actionRecommendation}
                      </p>
                    </div>
                  </section>

                  <section className="grid grid-cols-2 gap-2 md:gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t("totalCost")}</h4>
                      <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{formatCurrency(reportDetail.estimatedImpactCost)}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{t("maintenance")}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t("availabilityRate")}</h4>
                      <p className="text-lg sm:text-xl font-black text-rose-600">-{Math.round(reportDetail.summary.claimCount * 0.4)}%</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{t("estimated")}</p>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="evidence" className="mt-6 space-y-8">
                  <section>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{t("affectedEquipment")}</h4>
                    <div className="space-y-3">
                      {reportDetail.affectedEquipment.map(eq => (
                        <div key={eq.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40">
                          <div className={isRTL ? "text-right" : "text-left"}>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{eq.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{eq.code}</p>
                          </div>
                          <Badge variant="secondary" className="font-bold text-[10px]">{eq.claimCount} {t("claims")}</Badge>
                        </div>
                      ))}
                    </div>
                  </section>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
