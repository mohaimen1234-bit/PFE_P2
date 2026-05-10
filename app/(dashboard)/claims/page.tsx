"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuditTrail, type AuditEntry } from "@/components/audit-trail"
import { useI18n } from "@/lib/i18n"
import { translateEnum } from "@/lib/enum-mappers"
import { claimsApi } from "@/lib/api/claims"
import { auditLogsApi } from "@/lib/api/audit-logs"
import type {
  AuditLog,
  ClaimListItemResponse,
  ClaimStatsResponse,
} from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

function toTitleCase(value: string) {
  const cleaned = value
    .replaceAll("_", " ")
    .trim()
    .toLowerCase()
  return cleaned.replace(/\b\w/g, (m) => m.toUpperCase())
}

function normalizeLabel(value: string) {
  return value.replaceAll("_", " ").trim().toLowerCase()
}

function normalizeStatusLabel(value: string) {
  const normalized = normalizeLabel(value)
  if (normalized === "qualified") return "open"
  return normalized
}

function toDisplayStatusLabel(value: string) {
  const normalized = normalizeStatusLabel(value)
  return toTitleCase(normalized)
}

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function mapAuditLogToEntry(a: AuditLog, t: any): AuditEntry {
  const actionType = (a.actionType ?? "").toUpperCase()
  const action: AuditEntry["action"] = actionType.includes("CREATE")
    ? "create"
    : actionType.includes("DELETE")
      ? "delete"
      : actionType.includes("EXPORT")
        ? "export"
        : actionType.includes("STATUS")
          ? "status_change"
          : "update"

  return {
    id: `audit-${a.id}`,
    timestamp: formatTimestamp(a.createdAt),
    user: a.userId == null ? t('system') : `${t('user')} #${a.userId}`,
    userRole: "",
    action,
    description: actionType.replaceAll("_", " ") || "Audit",
    resource: a.entityName ?? "Claim",
    details: a.details,
  }
}

export default function ClaimsPage() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER, ROLES.TECHNICIAN]}>
      <ClaimsPageContent />
    </RouteGuard>
  )
}

function ClaimsPageContent() {
  const { t, language, isRTL } = useI18n()
  const [claims, setClaims] = useState<ClaimListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState<ClaimStatsResponse | null>(null)

  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, priorityFilter])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [claimsRes, auditsRes, statsRes] = await Promise.all([
          claimsApi.list(),
          auditLogsApi.getRecent(50).catch(() => []),
          claimsApi.getStats().catch(() => null),
        ])
        if (cancelled) return
        setClaims(claimsRes)
        setStats(statsRes)
        setAuditEntries(
          (auditsRes ?? [])
            .filter((a) => a.entityName === "Claim")
            .map((a) => mapAuditLogToEntry(a, t)),
        )
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError) {
          setError(`Request failed (${err.status})`)
          return
        }
        setError(t('failedToLoad'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [language])

  const rows = useMemo(() => claims ?? [], [claims])

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
      case "HIGH":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      case "MEDIUM":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      default:
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "OPEN":
      case "NEW":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "QUALIFIED":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
      case "ASSIGNED":
        return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
      case "IN_PROGRESS":
        return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
      case "CONVERTED_TO_WORK_ORDER":
        return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
      case "RESOLVED":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      case "CLOSED":
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
      case "REJECTED":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const filteredClaims = useMemo(() => {
    return rows.filter((claim) => {
      const id = claim.claimCode
      const title = claim.title ?? ""
      const statusKey = (claim.status || "").toUpperCase()
      const priorityKey = (claim.priority || "").toUpperCase()

      const matchesSearch =
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === "all" || statusFilter.toUpperCase() === statusKey
      const matchesPriority =
        priorityFilter === "all" || priorityFilter.toUpperCase() === priorityKey
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [rows, searchQuery, statusFilter, priorityFilter])

  const paginatedClaims = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredClaims.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredClaims, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage)

  const columns: Column<ClaimListItemResponse>[] = [
    { 
      header: t('id'), 
      accessor: (claim) => <span className="font-mono text-xs font-medium">{claim.claimCode}</span>,
      rtlOrder: 1
    },
    { 
      header: t('title'), 
      accessor: (claim) => (
        <div>
          <p className="font-medium text-xs">{claim.title}</p>
          <p className="text-[10px] text-muted-foreground line-clamp-1">{claim.description}</p>
        </div>
      ),
      rtlOrder: 2
    },
    { 
      header: t('equipment'), 
      accessor: (claim) => (
        <div className="text-xs text-muted-foreground font-medium">
          {claim.equipmentName || `#${claim.equipmentId}`}
        </div>
      ),
      rtlOrder: 3
    },
    { 
      header: t('priority'), 
      accessor: (claim) => {
        const key = (claim.priority || "").toUpperCase()
        return (
          <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", getPriorityColor(key))}>
            {translateEnum('priority', key, language)}
          </Badge>
        )
      },
      rtlOrder: 4
    },
    { 
      header: t('status'), 
      accessor: (claim) => {
        const key = (claim.status || "").toUpperCase()
        return (
          <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", getStatusColor(key))}>
            {translateEnum('status', key, language)}
          </Badge>
        )
      },
      rtlOrder: 5
    },
    { 
      header: t('actions'), 
      accessor: (claim) => (
        <div className="flex justify-end gap-1">
          <Link href={`/claims/${claim.claimId}`}>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-border">
              <DropdownMenuItem asChild>
                <Link href={`/claims/${claim.claimId}`}>
                  <Eye className="mr-2 h-4 w-4" /> {t('view')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/claims/${claim.claimId}/edit`}>
                   {t('edit')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      className: "text-right",
      rtlOrder: 99
    }
  ]

  const renderMobileCard = (claim: ClaimListItemResponse) => {
    const statusKey = (claim.status || "").toUpperCase()
    const priorityKey = (claim.priority || "").toUpperCase()
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-foreground">{claim.title}</h3>
            <p className="text-[10px] text-muted-foreground uppercase">{claim.claimCode}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", getStatusColor(statusKey))}>
              {translateEnum('status', statusKey, language)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between py-2 border-y border-border/50">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">{t('priority')}</p>
            <Badge variant="outline" className={cn("text-[9px] font-bold uppercase mt-1", getPriorityColor(priorityKey))}>
              {translateEnum('priority', priorityKey, language)}
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase">{t('equipment')}</p>
            <p className="font-medium text-xs truncate max-w-[120px]">{claim.equipmentName || '—'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/claims/${claim.claimId}`} className="flex-1">
            <Button className="w-full h-8 text-xs bg-primary/10 text-primary border-none">
              {t('view')}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const kpis = useMemo(() => {
    if (!stats) return [
      { label: t('totalClaims'), value: rows.length, icon: AlertTriangle, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-900/20" },
      { label: t('new'), value: rows.filter(c => (c.status || "").toUpperCase() === 'NEW').length, icon: Clock, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/20" },
      { label: t('inProgress'), value: rows.filter(c => ['ASSIGNED', 'IN_PROGRESS'].includes((c.status || "").toUpperCase())).length, icon: AlertTriangle, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/20" },
      { label: t('closed'), value: rows.filter(c => (c.status || "").toUpperCase() === 'CLOSED').length, icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/20" },
    ]
    return [
      { label: t('totalClaims'), value: stats.total, icon: AlertTriangle, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-900/20" },
      { label: t('new'), value: rows.filter(c => (c.status || "").toUpperCase() === 'NEW').length, icon: Clock, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/20" },
      { label: t('inProgress'), value: rows.filter(c => ['ASSIGNED', 'IN_PROGRESS'].includes((c.status || "").toUpperCase())).length, icon: AlertTriangle, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/20" },
      { label: t('closed'), value: rows.filter(c => (c.status || "").toUpperCase() === 'CLOSED').length, icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/20" },
    ]
  }, [stats, rows, language])

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-sm font-semibold text-foreground">{t("claimsList")}</h1>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 gap-1.5">
            <Download className="h-3 w-3" />
            {t("export")}
          </Button>
          <Link href="/claims/new">
            <Button size="sm" className="h-7 gap-1.5">
              <Plus className="h-3 w-3" />
              {t("newClaim")}
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-3">
        <TabsList className="h-8">
          <TabsTrigger value="list" className="gap-1.5 text-xs h-7">
            <AlertTriangle className="h-3 w-3" />
            {t('list')}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs h-7">
            <Clock className="h-3 w-3" />
            {t('audit')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3">
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            {kpis.map((stat) => (
              <motion.div key={stat.label} variants={fadeInUpItem} initial="initial" animate="animate">
                <Card variant="glass" hover="lift" className="h-full">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className={`rounded-xl p-2.5 shrink-0 transition-transform duration-300 hover:scale-110 ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate mb-1">{stat.label}</p>
                      <p className="text-xl font-bold tracking-tight text-foreground">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input
                placeholder={t('searchClaims')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("h-8 text-[13px] bg-muted/20 border-transparent hover:bg-muted/30 focus:border-primary/30 focus:bg-background transition-colors", isRTL ? "pr-9" : "pl-9")}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-[13px] bg-muted/20 border-transparent hover:bg-muted/30">
                <SelectValue placeholder={t("status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="NEW">{translateEnum('status', 'NEW', language)}</SelectItem>
                <SelectItem value="OPEN">{translateEnum('status', 'OPEN', language)}</SelectItem>
                <SelectItem value="ASSIGNED">{translateEnum('status', 'ASSIGNED', language)}</SelectItem>
                <SelectItem value="IN_PROGRESS">{translateEnum('status', 'IN_PROGRESS', language)}</SelectItem>
                <SelectItem value="RESOLVED">{translateEnum('status', 'RESOLVED', language)}</SelectItem>
                <SelectItem value="CLOSED">{translateEnum('status', 'CLOSED', language)}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] h-8 text-[13px] bg-muted/20 border-transparent hover:bg-muted/30">
                <SelectValue placeholder={t("priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="CRITICAL">{translateEnum('priority', 'CRITICAL', language)}</SelectItem>
                <SelectItem value="HIGH">{translateEnum('priority', 'HIGH', language)}</SelectItem>
                <SelectItem value="MEDIUM">{translateEnum('priority', 'MEDIUM', language)}</SelectItem>
                <SelectItem value="LOW">{translateEnum('priority', 'LOW', language)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Card variant="glass" className="overflow-hidden">
            <CardContent className="p-0">
              <ResponsiveDataTable
                columns={columns}
                data={paginatedClaims}
                renderCard={renderMobileCard}
                isLoading={isLoading}
                emptyMessage={t('noData')}
                className="border-none"
              />
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-3">
                  <p className="text-xs text-muted-foreground">
                    {t('showing')} <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> {t('to')} <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredClaims.length)}</span> {t('of')} <span className="font-medium">{filteredClaims.length}</span> {t('results')}
                  </p>
                  <div className="flex flex-wrap gap-2 min-w-0">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      {t('previous')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      {t('next')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <AuditTrail
            entries={auditEntries}
            title={t('claimsHistory')}
            description={t('trackChangesAndActio')}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
