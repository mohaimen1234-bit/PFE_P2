"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  BrainCircuit, 
  Activity,
  Search,
  RefreshCw,
  Check,
  X,
  Edit2,
  Eye,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { aiApi } from "@/lib/api/ai"
import type { 
  PriorityDashboardResponse, 
  PrioritySuggestionResponse,
  ClaimPriority,
  SlaStatus,
  PriorityDecisionStatus
} from "@/lib/api/types"
import { useI18n } from "@/lib/i18n"
import { usePagination } from "@/lib/hooks/use-pagination"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function AiPrioritizationPage() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER, ROLES.FINANCE_MANAGER]}>
      <AiPrioritizationPageContent />
    </RouteGuard>
  )
}

function AiPrioritizationPageContent() {
  const router = useRouter()
  const { t, isRTL } = useI18n()
  
  // State
  const [dashboard, setDashboard] = useState<PriorityDashboardResponse | null>(null)
  const [suggestions, setSuggestions] = useState<PrioritySuggestionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL")
  const [slaFilter, setSlaFilter] = useState<string>("ALL")
  const [decisionFilter, setDecisionFilter] = useState<string>("ALL")

  // Dialogs
  const [overrideDialog, setOverrideDialog] = useState<{ isOpen: boolean; suggestionId: number | null }>({ isOpen: false, suggestionId: null })
  const [rejectDialog, setRejectDialog] = useState<{ isOpen: boolean; suggestionId: number | null }>({ isOpen: false, suggestionId: null })
  
  // Dialog Form State
  const [overridePriority, setOverridePriority] = useState<ClaimPriority | "">("")
  const [overrideDate, setOverrideDate] = useState<string>("")
  const [overrideReason, setOverrideReason] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  
  // Action state
  const [isActing, setIsActing] = useState(false)

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)
    
    try {
      const [dashData, suggData] = await Promise.all([
        aiApi.getPriorityDashboard(),
        aiApi.getPrioritySuggestions()
      ])
      setDashboard(dashData)
      setSuggestions(suggData)
    } catch (err: any) {
      console.error("Failed to load prioritization data", err)
      setError(t("failedToLoad"))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtering
  const filteredSuggestions = suggestions.filter(s => {
    const matchesSearch = search === "" || s.claimTitle.toLowerCase().includes(search.toLowerCase()) || s.claimId.toString().includes(search)
    const matchesPriority = priorityFilter === "ALL" || s.suggestedPriority === priorityFilter
    const matchesSla = slaFilter === "ALL" || s.slaStatus === slaFilter
    const matchesDecision = decisionFilter === "ALL" || s.decisionStatus === decisionFilter
    return matchesSearch && matchesPriority && matchesSla && matchesDecision
  })

  const { paginatedItems: paginatedSuggestions, PaginationControls } = usePagination(filteredSuggestions, 10)

  // Format Helpers
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-"
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateStr
    }
  }

  const getPriorityColor = (priority: ClaimPriority | string) => {
    switch(priority) {
      case 'CRITICAL': return "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
      case 'HIGH': return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
      case 'MEDIUM': return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
      case 'LOW': return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
      default: return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
    }
  }

  const getSlaColor = (status: SlaStatus | string) => {
    switch(status) {
      case 'BREACHED': return "bg-rose-500/10 text-rose-500"
      case 'AT_RISK': return "bg-orange-500/10 text-orange-500"
      case 'SAFE': return "bg-emerald-500/10 text-emerald-500"
      default: return "bg-gray-500/10 text-gray-500"
    }
  }

  const getDecisionColor = (status: PriorityDecisionStatus | string) => {
    switch(status) {
      case 'ACCEPTED': return "bg-emerald-500/10 text-emerald-500"
      case 'OVERRIDDEN': return "bg-blue-500/10 text-blue-500"
      case 'REJECTED': return "bg-rose-500/10 text-rose-500"
      case 'PENDING': return "bg-amber-500/10 text-amber-500"
      default: return "bg-gray-500/10 text-gray-500"
    }
  }

  // Actions
  const handleCalculate = async (claimId: number) => {
    setIsActing(true)
    try {
      await aiApi.calculateClaimPriority(claimId)
      toast.success(t("success"))
      loadData(true)
    } catch (e) {
      toast.error(t("error"))
    } finally {
      setIsActing(false)
    }
  }

  const handleAccept = async (id: number) => {
    setIsActing(true)
    try {
      await aiApi.acceptPrioritySuggestion(id, { note: "Accepted from dashboard" })
      toast.success(t("success"))
      loadData(true)
    } catch (e) {
      toast.error(t("error"))
    } finally {
      setIsActing(false)
    }
  }

  const submitOverride = async () => {
    if (!overrideDialog.suggestionId || !overridePriority || !overrideReason) {
      toast.error(t("missingRequiredField"))
      return
    }
    setIsActing(true)
    try {
      await aiApi.overridePrioritySuggestion(overrideDialog.suggestionId, {
        finalPriority: overridePriority as ClaimPriority,
        finalDueDate: overrideDate ? new Date(overrideDate).toISOString() : null,
        reason: overrideReason
      })
      toast.success(t("success"))
      setOverrideDialog({ isOpen: false, suggestionId: null })
      setOverridePriority("")
      setOverrideDate("")
      setOverrideReason("")
      loadData(true)
    } catch (e) {
      toast.error(t("error"))
    } finally {
      setIsActing(false)
    }
  }

  const submitReject = async () => {
    if (!rejectDialog.suggestionId || !rejectReason) {
      toast.error(t("missingRequiredField"))
      return
    }
    setIsActing(true)
    try {
      await aiApi.rejectPrioritySuggestion(rejectDialog.suggestionId, {
        reason: rejectReason
      })
      toast.success(t("success"))
      setRejectDialog({ isOpen: false, suggestionId: null })
      setRejectReason("")
      loadData(true)
    } catch (e) {
      toast.error(t("error"))
    } finally {
      setIsActing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
        <Activity className="h-8 w-10 text-primary animate-pulse" />
        <p className="text-muted-foreground">{t("loading")}...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={() => loadData()}>{t("tryAgain")}</Button>
      </div>
    )
  }

  return (
    <motion.div 
      initial="initial" 
      animate="animate" 
      className="flex-1 space-y-6 overflow-auto pb-10"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 md:gap-3">
           <div className="bg-primary/10 p-3 rounded-2xl shadow-inner">
             <BrainCircuit className="h-8 w-8 text-primary" />
           </div>
           <div>
             <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
               {t("automaticPrioritization")}
             </h1>
             <p className="text-muted-foreground italic">
               {t("priorityDashboardDesc")}
             </p>
           </div>
        </div>
        <Button onClick={() => loadData(true)} variant="outline" className="gap-2" disabled={isRefreshing}>
           <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
           {t("refreshData")}
        </Button>
      </motion.div>

      {/* KPI Cards */}
      {dashboard && (
        <motion.div variants={fadeInUp} className="grid gap-2 md:gap-3 md:grid-cols-4 lg:grid-cols-5">
          <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{t("pendingDecisions")}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold text-amber-500">{dashboard.pendingManagerDecisions}</div>
            </CardContent>
          </Card>
          <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{t("critical")} / {t("high")}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold text-rose-500">{dashboard.criticalSuggestions} / {dashboard.highSuggestions}</div></CardContent>
          </Card>
          <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{t("slaAtRiskBreached")}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold text-orange-500">{dashboard.slaAtRisk} / {dashboard.slaBreached}</div></CardContent>
          </Card>
          <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{t("acceptanceRate")}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold text-emerald-500">{dashboard.acceptanceRate}%</div></CardContent>
          </Card>
          <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{t("avgScore")}</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold text-primary">{dashboard.averagePriorityScore}</div></CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row gap-2 md:gap-3">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
          <Input 
            placeholder={t("searchClaims")} 
            className={`${isRTL ? "pr-9" : "pl-9"} bg-card/50 border-border`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px] bg-card/50 border-border">
            <SelectValue placeholder={t("priority")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allPriorities")}</SelectItem>
            <SelectItem value="CRITICAL">{t("critical")}</SelectItem>
            <SelectItem value="HIGH">{t("high")}</SelectItem>
            <SelectItem value="MEDIUM">{t("medium")}</SelectItem>
            <SelectItem value="LOW">{t("low")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={slaFilter} onValueChange={setSlaFilter}>
          <SelectTrigger className="w-[150px] bg-card/50 border-border">
            <SelectValue placeholder={t("sla")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allSlas")}</SelectItem>
            <SelectItem value="SAFE">{t("safe") || "Safe"}</SelectItem>
            <SelectItem value="AT_RISK">{t("at_risk") || "At Risk"}</SelectItem>
            <SelectItem value="BREACHED">{t("breached") || "Breached"}</SelectItem>
            <SelectItem value="NO_DUE_DATE">{t("noDueDate") || "No Due Date"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={decisionFilter} onValueChange={setDecisionFilter}>
          <SelectTrigger className="w-[160px] bg-card/50 border-border">
            <SelectValue placeholder={t("decision")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allDecisions")}</SelectItem>
            <SelectItem value="PENDING">{t("pending")}</SelectItem>
            <SelectItem value="ACCEPTED">{t("accepted")}</SelectItem>
            <SelectItem value="OVERRIDDEN">{t("overridden")}</SelectItem>
            <SelectItem value="REJECTED">{t("rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Main Table */}
      <motion.div variants={fadeInUp}>
        <Card className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
          <CardContent className="p-0">
            {suggestions.length === 0 ? (
              <div className="py-20 text-center">
                <div className="bg-indigo-50 w-16 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold mb-2">{t("noSuggestionsYet")}</h3>
                <p className="text-muted-foreground mb-6">
                  {t("noSuggestionsDesc")}
                </p>
                <Link href="/claims">
                  <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
                    {t("goToClaims")}
                  </Button>
                </Link>
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-muted-foreground">{t("noMatches")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("id")}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("claimTitle")}</TableHead>
                      <TableHead className="text-center">{t("scoreConf")}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("suggested")}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("dueDateSug")}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("sla")}</TableHead>
                      <TableHead className={isRTL ? "text-right" : "text-left"}>{t("decision")}</TableHead>
                      <TableHead className={isRTL ? "text-left" : "text-right"}>{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSuggestions.map((s) => (
                      <TableRow key={s.id} className="group">
                        <TableCell className="font-mono text-xs">#{s.claimId}</TableCell>
                        <TableCell>
                          <div className={isRTL ? "text-right" : "text-left"}>
                            <div className="font-medium text-xs line-clamp-1">{s.claimTitle}</div>
                            <div className="text-[10px] text-muted-foreground">{t("by")} {s.createdBy || "System"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col items-center">
                              <span className="font-bold text-xs">{s.priorityScore}</span>
                              <span className="text-[10px] text-muted-foreground">{Math.round(s.confidenceScore * 100)}% conf</span>
                           </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none ${getPriorityColor(s.suggestedPriority)}`}>
                            {t(s.suggestedPriority.toLowerCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(s.suggestedDueDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-none ${getSlaColor(s.slaStatus)} text-[10px]`}>
                            {s.slaStatus.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className={`border-none ${getDecisionColor(s.decisionStatus)} text-[10px]`}>
                            {t(s.decisionStatus.toLowerCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className={isRTL ? "text-left" : "text-right"}>
                          <div className={`flex items-center ${isRTL ? "justify-start" : "justify-end"} gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity`}>
                             <Button size="icon" variant="ghost" asChild>
                               <Link href={`/claims`}><Eye className="h-4 w-4" /></Link>
                             </Button>
                             {s.decisionStatus === 'PENDING' && (
                               <>
                                 <Button size="icon" variant="ghost" className="text-emerald-500" onClick={() => handleAccept(s.id)} disabled={isActing}>
                                   <Check className="h-4 w-4" />
                                 </Button>
                                 <Button size="icon" variant="ghost" className="text-blue-500" onClick={() => {
                                   setOverrideDialog({ isOpen: true, suggestionId: s.id })
                                   setOverridePriority(s.suggestedPriority)
                                   setOverrideDate(s.suggestedDueDate ? s.suggestedDueDate.split('T')[0] : "")
                                 }} disabled={isActing}>
                                   <Edit2 className="h-4 w-4" />
                                 </Button>
                                 <Button size="icon" variant="ghost" className="text-rose-500" onClick={() => setRejectDialog({ isOpen: true, suggestionId: s.id })} disabled={isActing}>
                                   <X className="h-4 w-4" />
                                 </Button>
                               </>
                             )}
                             <Button size="icon" variant="ghost" title={t("recalculate")} onClick={() => handleCalculate(s.claimId)} disabled={isActing}>
                               <RefreshCw className={`h-4 w-4 ${isActing ? "animate-spin" : ""}`} />
                             </Button>
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

      {/* Override Dialog */}
      <Dialog open={overrideDialog.isOpen} onOpenChange={(open) => setOverrideDialog({ isOpen: open, suggestionId: open ? overrideDialog.suggestionId : null })}>
        <DialogContent className="sm:max-max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("override")} {t("decision")}</DialogTitle>
            <DialogDescription>Set final priority and due date for this claim.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 md:gap-3 py-3">
             <div className="space-y-2">
               <label className="text-xs font-medium">{t("priority")}</label>
               <Select value={overridePriority} onValueChange={(v) => setOverridePriority(v as ClaimPriority)}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="CRITICAL">{t("critical")}</SelectItem>
                   <SelectItem value="HIGH">{t("high")}</SelectItem>
                   <SelectItem value="MEDIUM">{t("medium")}</SelectItem>
                   <SelectItem value="LOW">{t("low")}</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <label className="text-xs font-medium">{t("dueDate")}</label>
               <Input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-medium">{t("reason")}</label>
               <Textarea placeholder="Explain why you are overriding the AI suggestion..." value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog({ isOpen: false, suggestionId: null })}>{t("cancel")}</Button>
            <Button onClick={submitOverride} disabled={isActing}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.isOpen} onOpenChange={(open) => setRejectDialog({ isOpen: open, suggestionId: open ? rejectDialog.suggestionId : null })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("reject")} {t("decision")}</DialogTitle>
            <DialogDescription>Dismiss this AI suggestion. The claim will keep its original priority.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 md:gap-3 py-3">
             <div className="space-y-2">
               <label className="text-xs font-medium">{t("reason")}</label>
               <Textarea placeholder="Why are you rejecting this suggestion?" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ isOpen: false, suggestionId: null })}>{t("cancel")}</Button>
            <Button variant="destructive" onClick={submitReject} disabled={isActing}>{t("reject")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
