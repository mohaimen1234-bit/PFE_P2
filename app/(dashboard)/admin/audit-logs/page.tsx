"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { FileText, Download, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"
import { usePagination } from "@/lib/hooks/use-pagination"
import { useAuth } from "@/lib/auth-context"
import { auditLogsApi } from "@/lib/api/audit-logs"
import type { AuditLog } from "@/lib/api/types"
import { downloadCsv } from "@/lib/export"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
}

export default function AuditLogsPage() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN]}>
      <AuditLogsPageContent />
    </RouteGuard>
  )
}

function AuditLogsPageContent() {
  const { t, language } = useI18n()
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [items, setItems] = useState<AuditLog[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [timeRange, setTimeRange] = useState("7days")
  const [scope, setScope] = useState<string>("all")

  useEffect(() => {
    if (isLoading) return
    if (user && (user.roleName ?? "").toUpperCase() !== "ADMIN") {
      router.replace("/dashboard")
    }
  }, [isLoading, router, user])

  useEffect(() => {
    let cancelled = false
    setIsFetching(true)
    setError(null)
    const load = async () => {
      try {
        let res: AuditLog[] = []
        
        if (scope === "security") {
          res = await auditLogsApi.getSecurity(200)
        } else if (scope === "all") {
          res = await auditLogsApi.getRecent(200)
        } else {
          // Map scope to entity names
          const entityMapping: Record<string, string[]> = {
            workorder: ["WorkOrder"],
            claim: ["Claim"],
            inventory: ["SparePart"],
            task: ["Task"],
            meter: ["Meter"],
            equipment: ["EQUIPMENT"]
          }
          const entities = entityMapping[scope] || [scope]
          res = await auditLogsApi.getFiltered(entities, 500)
        }
        
        if (cancelled) return
        setItems(res)
      } catch {
        if (cancelled) return
        setItems([])
        setError(t('failedToLoadLogs'))
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [language, scope])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const now = Date.now()
    const cutoffMs =
      timeRange === "1day" ? 24 * 60 * 60 * 1000 :
      timeRange === "7days" ? 7 * 24 * 60 * 60 * 1000 :
      timeRange === "30days" ? 30 * 24 * 60 * 60 * 1000 :
      Infinity

    return items.filter((l) => {
      // Server-side filtering is now used for scopes other than "all" and "security"
      // but we keep this as a safeguard if needed.
      
      const createdAt = new Date(l.createdAt).getTime()
      if (Number.isNaN(createdAt)) return false
      if (cutoffMs !== Infinity && now - createdAt > cutoffMs) return false

      const action = (l.actionType ?? "").toLowerCase()
      if (actionFilter !== "all") {
        if (actionFilter === "create" && !action.includes("create")) return false
        if (actionFilter === "update" && !action.includes("update")) return false
        if (actionFilter === "delete" && !action.includes("delete")) return false
        if (actionFilter === "export" && !action.includes("export")) return false
      }

      if (!q) return true
      const haystack = [
        String(l.id),
        l.actionType,
        l.entityName,
        l.details,
        l.accountName || (l.userId ? `user #${l.userId}` : "system"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [actionFilter, items, query, timeRange])

  const { paginatedItems, PaginationControls } = usePagination(filtered, 10)

  const onExport = () => {
    downloadCsv(
      "audit-logs.csv",
      ["id", "timestamp", "account", "ipAddress", "actionType", "entityName", "entityId", "details"],
      filtered.map((l) => [
        l.id,
        l.createdAt,
        l.accountName || (l.userId ? `${t('user')} #${l.userId}` : t('system')),
        l.ipAddress || "0.0.0.0",
        l.actionType,
        l.entityName,
        l.entityId,
        l.details,
      ])
    )
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      className="flex-1 space-y-6 overflow-auto"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('auditLogs')}</h1>
          <p className="text-muted-foreground">{t('completeSystemActi')}</p>
        </div>
        <Button onClick={onExport} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 me-2" />
          {t('exportLogs')}
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeInUp} className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('searchLogs')}
            className="h-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('scope')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allLogs')}</SelectItem>
            <SelectItem value="security">{t('securityLogs')}</SelectItem>
            <SelectItem value="workorder">{t('workOrders')}</SelectItem>
            <SelectItem value="claim">{t('claims')}</SelectItem>
            <SelectItem value="inventory">{t('inventory')}</SelectItem>
            <SelectItem value="task">{t('tasks')}</SelectItem>
            <SelectItem value="meter">{t('meters')}</SelectItem>
            <SelectItem value="equipment">{t('equipmentLogs')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('action')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allActions')}</SelectItem>
            <SelectItem value="create">{t('create')}</SelectItem>
            <SelectItem value="update">{t('update')}</SelectItem>
            <SelectItem value="delete">{t('delete')}</SelectItem>
            <SelectItem value="export">{t('export')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('timeRange')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1day">{t('last24Hours')}</SelectItem>
            <SelectItem value="7days">{t('last7Days')}</SelectItem>
            <SelectItem value="30days">{t('last30Days')}</SelectItem>
            <SelectItem value="all">{t('allTime')}</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Logs Table */}
      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('timestamp')}</th>
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('account')}</th>
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('ipAddress')}</th>
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('action')}</th>
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('resource')}</th>
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isFetching ? (
                    <tr>
                      <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={6}>
                        {t('loading')}
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td className="py-1.5 px-2 text-[11px] text-destructive" colSpan={6}>
                        {error}
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={6}>
                        {t('noLogs')}
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((log) => (
                        <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground text-xs">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2 text-[11px] text-foreground font-medium">
                            {log.accountName || t('system')}
                          </td>
                          <td className="py-1.5 px-2 text-[11px] font-mono text-[10px] text-muted-foreground">
                            {log.ipAddress || "0.0.0.0"}
                          </td>
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground">{log.actionType || "—"}</td>
                          <td className="py-1.5 px-2 text-[11px]">
                            <Badge variant="outline">{log.entityName || "—"}</Badge>
                          </td>
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground text-xs max-w-sm">
                            {log.details || "—"}
                          </td>
                        </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls />
          </CardContent>
        </Card>
      </motion.div>


    </motion.div>
  )
}
