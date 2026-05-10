"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import React from "react"
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  Database,
  Plus,
  Wrench,
  TrendingUp,
  Package,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  Zap,
  Cpu,
  Timer,
  BarChart3,
  Hammer,
  ChevronLeft
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { DashboardSkeleton } from "@/components/dashboard/skeleton"
import { dashboardApi, type DashboardStats, type ActivityItem } from "@/lib/api/dashboard"
import { workOrdersApi } from "@/lib/api/work-orders"
import { claimsApi } from "@/lib/api/claims"
import { planningApi } from "@/lib/api/planning"
import type { WorkOrderResponse, ClaimListItemResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"
import { WorkOrderTypeBadge } from "@/components/work-order-type-badge"
import { AnimatedSection, AnimatedCard, StaggerContainer, fadeInUpItem } from "@/components/ui/motion-fade"

const DONUT_COLORS = ["#6366f1", "#f43f5e", "#f59e0b", "#10b981"]

export default function DashboardPage() {
  const { t, language, isRTL } = useI18n()
  const { user } = useAuth()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [recentClaims, setRecentClaims] = useState<ClaimListItemResponse[]>([])
  const [recentWos, setRecentWos] = useState<WorkOrderResponse[]>([])
  const [upcomingPlans, setUpcomingPlans] = useState<any[]>([])
  const [myWork, setMyWork] = useState<WorkOrderResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const isManager = user?.hasRole('ADMIN', 'MAINTENANCE_MANAGER') ?? false
  const isTechnician = user?.hasRole('TECHNICIAN') ?? false
  const isFinance = user?.hasRole('FINANCE_MANAGER') ?? false

  const loadData = useCallback(async () => {
    try {
      const [statsRes, activityRes, claimsRes, wosRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivity(),
        claimsApi.list({}).catch(() => []),
        workOrdersApi.list().catch(() => []),
      ])
      setStats(statsRes)
      setActivities(activityRes)
      setRecentClaims((claimsRes as ClaimListItemResponse[]).slice(0, 4))
      setRecentWos((wosRes as WorkOrderResponse[]).slice(0, 4))

      if (!isManager && user?.id) {
        const orders = await workOrdersApi.list({ assignedToUserId: user.id, status: 'IN_PROGRESS' }).catch(() => [])
        setMyWork(orders as WorkOrderResponse[])
      }

      const plans = await planningApi.getAll().catch(() => [])
      setUpcomingPlans((plans as any[]).slice(0, 4))

      setLastUpdated(new Date())
    } catch (err) {
      console.error("Dashboard refresh failed", err)
    } finally {
      setIsLoading(false)
    }
  }, [isManager, user?.id])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [loadData])

  const MONTHS = useMemo(() => [
    t('jan') || "Jan", t('feb') || "Feb", t('mar') || "Mar",
    t('apr') || "Apr", t('may') || "May", t('jun') || "Jun"
  ], [t])

  const availabilityTrend = useMemo(() => {
    if (!stats) return []
    const base = stats.availabilityRate ?? 95
    return MONTHS.map((month, i) => ({
      month,
      MTBF: Math.round(stats.mtbfHours ?? 0) + (i * 12) - 30,
      "Availability Rate": parseFloat((base - 1.5 + i * 0.5).toFixed(1)),
    }))
  }, [stats, MONTHS])

  const distributionData = useMemo(() => {
    if (!stats) return []
    return [
      { name: t("preventive"), value: Math.round(stats.preventivePct ?? 0) },
      { name: t("corrective"), value: Math.round(stats.correctivePct ?? 0) },
      { name: t("regulatory"), value: Math.round(stats.regulatoryPct ?? 0) },
      { name: t("predictive"), value: Math.round(stats.predictivePct ?? 0) },
    ].filter(d => d.value > 0)
  }, [stats, t])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <AnimatedSection className={cn("flex items-center justify-between gap-3 flex-wrap", isRTL ? "flex-row-reverse" : "")}>
        <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
          <div className="p-1.5 rounded-lg bg-primary/10">
            <LayoutDashboard className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">{t('dashboard')}</h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block">{t('lastUpdated')} {format(lastUpdated, 'HH:mm')}</p>
          </div>
        </div>
        <div className={cn("flex gap-1.5", isRTL ? "flex-row-reverse" : "")}>
          {(isManager || isTechnician) && (
            <Button size="sm" className="h-7 gap-1.5 shadow-sm" asChild>
              <Link href="/claims/new"><Plus className="h-3 w-3" /> {t('newClaim')}</Link>
            </Button>
          )}
          {isManager && (
            <Button size="sm" variant="outline" className="h-7 gap-1.5 border-border/60" asChild>
              <Link href="/work-orders/new"><Wrench className="h-3 w-3" /> {t('newWorkOrder')}</Link>
            </Button>
          )}
        </div>
      </AnimatedSection>

      {/* KPI Cards */}
      {(isManager || isFinance) && (
        <StaggerContainer className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { label: isFinance ? t("totalAssets") : t("totalEquipment"), value: stats?.totalEquipment, icon: Cpu, color: "text-primary", bg: "bg-primary/10" },
            { label: t("activeWorkOrders"), value: stats?.activeWorkOrders, icon: Wrench, color: "text-info", bg: "bg-info/10" },
            { label: isFinance ? t("inventoryValue") : t("pendingClaims"), value: isFinance ? `${(stats?.monthlySpend ? Number(stats.monthlySpend) * 5.5 : 32884).toLocaleString('fr-TN', { maximumFractionDigits: 0 })} DT` : stats?.pendingClaims, icon: isFinance ? Package : AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
            { label: isFinance ? t("monthSpend") : t("criticalAlerts"), value: isFinance ? `${Number(stats?.monthlySpend ?? 5979).toLocaleString('fr-TN', { maximumFractionDigits: 0 })} DT` : stats?.criticalAlerts, icon: isFinance ? DollarSign : Zap, color: "text-destructive", bg: "bg-destructive/10" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} variants={fadeInUpItem}>
              <Card variant="glass" hover="lift" className="h-full">
                <CardContent className="p-3">
                  <div className={cn("flex items-center justify-between gap-3", isRTL ? "flex-row-reverse" : "")}>
                    <div className={cn("min-w-0 flex-1", isRTL ? "text-right" : "")}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate mb-1">{kpi.label}</p>
                      <p className="text-xl font-bold tracking-tight text-foreground">{kpi.value ?? '—'}</p>
                    </div>
                    <div className={cn("p-2.5 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110", kpi.bg)}>
                      <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </StaggerContainer>
      )}

      {isTechnician && (
        <StaggerContainer className="grid gap-2.5 grid-cols-3">
          {[
            { label: t("myActiveTasks"), value: myWork.length, icon: Timer, color: "text-info", bg: "bg-info/10" },
            { label: t("assignedWorkOrders"), value: stats?.activeWorkOrders, icon: Wrench, color: "text-success", bg: "bg-success/10" },
            { label: t("equipmentAccess"), value: stats?.totalEquipment, icon: Cpu, color: "text-primary", bg: "bg-primary/10" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} variants={fadeInUpItem}>
              <Card variant="glass" hover="lift" className="h-full">
                <CardContent className={cn("p-3 flex items-center gap-3", isRTL ? "flex-row-reverse text-right" : "")}>
                  <div className={cn("p-2.5 rounded-xl shrink-0", kpi.bg)}><kpi.icon className={cn("h-5 w-5", kpi.color)} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate mb-1">{kpi.label}</p>
                    <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </StaggerContainer>
      )}

      {/* Charts */}
      {(isManager || isFinance) && (
        <AnimatedSection className="grid gap-2 sm:gap-3 lg:grid-cols-5">
          <Card variant="glass" className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                <CardTitle className="text-xs font-semibold tracking-tight">{isFinance ? t("expenseTrend") : t("availabilityTrend")}</CardTitle>
                <div className={cn("flex items-center gap-3 text-[10px] text-muted-foreground", isRTL ? "flex-row-reverse" : "")}>
                  <span className={cn("flex items-center gap-1", isRTL ? "flex-row-reverse" : "")}><span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />MTBF</span>
                  <span className={cn("flex items-center gap-1", isRTL ? "flex-row-reverse" : "")}><span className="h-1.5 w-1.5 rounded-full bg-accent inline-block" />{t("availability")}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={availabilityTrend} margin={{ top: 5, right: isRTL ? -25 : 5, left: isRTL ? 5 : -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradMtbf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} reversed={isRTL} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} orientation={isRTL ? "right" : "left"} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 10, padding: '6px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                    <Area type="monotone" dataKey="MTBF" stroke="var(--primary)" strokeWidth={2} fill="url(#gradMtbf)" dot={false} />
                    <Area type="monotone" dataKey="Availability Rate" stroke="var(--accent)" strokeWidth={2} fill="transparent" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className={cn("text-xs font-semibold tracking-tight", isRTL ? "text-right" : "")}>
                {isFinance ? t("budgetAllocation") : t("maintenanceDistribution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {distributionData.length === 0 ? (
                <div className="flex h-[160px] items-center justify-center text-muted-foreground text-xs">{t('noData')}</div>
              ) : (
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distributionData} cx={isRTL ? "60%" : "40%"} cy="50%" innerRadius="50%" outerRadius="75%" dataKey="value" strokeWidth={1}>
                        {distributionData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} layout="vertical" align={isRTL ? "left" : "right"} verticalAlign="middle" formatter={(value, entry: any) => (
                        <span className="text-[9px] text-muted-foreground">{value} <span className="font-semibold text-foreground">{entry.payload.value}%</span></span>
                      )} />
                      <Tooltip formatter={(val: number) => [`${val}%`, '']} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 10, padding: '6px 10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>
      )}

      {/* Secondary Metrics */}
      {isManager && (
        <StaggerContainer className="grid gap-2.5 grid-cols-3">
          {[
            { label: "MTBF", value: `${Math.round(stats?.mtbfHours ?? 0)}h`, Icon: Timer, color: "text-primary" },
            { label: "MTTR", value: `${(stats?.mttrHours ?? 0).toFixed(1)}h`, Icon: Wrench, color: "text-info" },
            { label: t("availability"), value: `${(stats?.availabilityRate ?? 0).toFixed(1)}%`, Icon: ShieldCheck, color: "text-success" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} variants={fadeInUpItem}>
              <Card className="border-border/50 shadow-sm transition-all duration-300 hover:shadow-premium-lg">
                <CardContent className={cn("p-2.5 flex items-center gap-2.5", isRTL ? "flex-row-reverse text-right" : "")}>
                  <div className="p-2 rounded-xl bg-muted/50 shrink-0">
                    <kpi.Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider truncate">{kpi.label}</p>
                    <p className="text-xs font-bold tracking-tight">{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </StaggerContainer>
      )}

      {/* Claims + Work Orders */}
      <AnimatedSection className="grid gap-2 sm:gap-3 lg:grid-cols-2">
        {isTechnician ? (
          <Card variant="glass" hover="glow" className="h-full">
            <CardHeader className={cn("flex flex-row items-center justify-between py-2.5", isRTL ? "flex-row-reverse" : "")}>
              <CardTitle className="text-xs font-semibold tracking-tight">{t("myPendingWork")}</CardTitle>
              <Button variant="ghost" size="sm" className="h-5 text-[10px] hover:bg-primary/10" asChild>
                <Link href="/work-orders?assignedToMe=true" className={cn("flex items-center gap-1", isRTL ? "flex-row-reverse" : "")}>
                  {t("viewAll")} {isRTL ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30 max-h-44 overflow-y-auto">
                {myWork.length === 0 ? (
                  <p className="py-5 text-center text-xs text-muted-foreground">{t("noAssignments")}</p>
                ) : myWork.slice(0, 4).map(wo => (
                  <Link key={wo.woId} href={`/work-orders/${wo.woId}`} className="block transition-all duration-200 hover:bg-muted/50">
                    <div className={cn("flex items-center gap-2 px-3 py-2", isRTL ? "flex-row-reverse" : "")}>
                      <div className={cn("flex-1 min-w-0", isRTL ? "text-right" : "")}>
                        <p className="text-xs font-medium truncate text-foreground">{wo.title}</p>
                        <p className="text-[9px] text-muted-foreground">{wo.woCode}</p>
                      </div>
                      <StatusBadge status={wo.status} t={t} />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : !isFinance && (
          <Card variant="glass" hover="glow">
            <CardHeader className={cn("flex flex-row items-center justify-between py-2.5", isRTL ? "flex-row-reverse" : "")}>
              <CardTitle className="text-xs font-semibold tracking-tight">{t("recentClaims")}</CardTitle>
              <Button variant="ghost" size="sm" className="h-5 text-[10px] hover:bg-primary/10" asChild>
                <Link href="/claims" className={cn("flex items-center gap-1", isRTL ? "flex-row-reverse" : "")}>
                  {t("viewAll")} {isRTL ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30 max-h-44 overflow-y-auto">
                {recentClaims.length === 0 ? (
                  <p className="py-5 text-center text-xs text-muted-foreground">{t("noClaims")}</p>
                ) : recentClaims.slice(0, 4).map(claim => (
                  <Link key={claim.claimId} href={`/claims/${claim.claimId}`} className="block transition-all duration-200 hover:bg-muted/50">
                    <div className={cn("flex items-center gap-2 px-3 py-2", isRTL ? "flex-row-reverse" : "")}>
                      <div className={cn("flex-1 min-w-0", isRTL ? "text-right" : "")}>
                        <p className="text-xs font-medium truncate text-foreground">{claim.title}</p>
                        <p className="text-[9px] text-muted-foreground">{claim.claimCode ?? `CLM-${claim.claimId}`}</p>
                      </div>
                      <StatusBadge status={String(claim.status ?? '')} t={t} />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card variant="glass" hover="glow" className={cn(isFinance ? "lg:col-span-2" : "")}>
          <CardHeader className={cn("flex flex-row items-center justify-between py-2.5", isRTL ? "flex-row-reverse" : "")}>
            <CardTitle className="text-xs font-semibold tracking-tight">{isFinance ? t("criticalRequests") : t("recentWorkOrders")}</CardTitle>
            <Button variant="ghost" size="sm" className="h-5 text-[10px] hover:bg-primary/10" asChild>
              <Link href="/work-orders" className={cn("flex items-center gap-1", isRTL ? "flex-row-reverse" : "")}>
                {t("viewAll")} {isRTL ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30 max-h-44 overflow-y-auto">
              {recentWos.length === 0 ? (
                <p className="py-5 text-center text-xs text-muted-foreground">{t("noWorkOrders")}</p>
              ) : recentWos.slice(0, 4).map(wo => (
                <Link key={wo.woId} href={`/work-orders/${wo.woId}`} className="block transition-all duration-200 hover:bg-muted/50">
                  <div className={cn("flex items-center gap-2 px-3 py-2", isRTL ? "flex-row-reverse" : "")}>
                    <div className={cn("flex-1 min-w-0", isRTL ? "text-right" : "")}>
                      <p className="text-xs font-medium truncate text-foreground">{wo.title}</p>
                      <div className={cn("flex items-center gap-1.5", isRTL ? "flex-row-reverse" : "")}>
                        <span className="text-[9px] text-muted-foreground">{wo.woCode}</span>
                        <WorkOrderTypeBadge type={wo.woType} lang={language as any} size="sm" />
                      </div>
                    </div>
                    <StatusBadge status={wo.status} t={t} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </AnimatedSection>

      {/* Activity + Bottom Widgets */}
      <AnimatedSection className="grid gap-2 sm:gap-3 lg:grid-cols-3">
        <Card variant="glass" className={cn(isManager ? "" : "lg:col-span-2")}>
          <CardHeader className={cn("flex flex-row items-center justify-between py-2.5", isRTL ? "flex-row-reverse" : "")}>
            <CardTitle className={cn("flex items-center gap-1.5 text-xs font-semibold tracking-tight", isRTL ? "flex-row-reverse" : "")}>
              <Activity className="h-3.5 w-3.5 text-primary" /> {t("activity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30 max-h-36 overflow-y-auto">
              {activities.length === 0 ? (
                <div className="py-5 text-center text-muted-foreground text-xs">{t("noActivity")}</div>
              ) : activities.slice(0, 5).map(item => (
                <ActivityRow key={item.id} item={item} isRTL={isRTL} />
              ))}
            </div>
          </CardContent>
        </Card>

        {isManager && (
          <Card variant="glass" className="h-full">
            <CardHeader className={cn("py-2.5", isRTL ? "text-right" : "")}>
              <CardTitle className={cn("flex items-center gap-1.5 text-xs font-semibold tracking-tight", isRTL ? "flex-row-reverse" : "")}>
                <BarChart3 className="h-3.5 w-3.5 text-info" /> {t("technicianWorkload")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {recentWos.reduce((acc: { name: string; count: number }[], wo) => {
                  if (!wo.assignedToName) return acc
                  const found = acc.find(a => a.name === wo.assignedToName)
                  if (found) found.count++
                  else acc.push({ name: wo.assignedToName, count: 1 })
                  return acc
                }, []).slice(0, 3).map((tech, i) => (
                  <div key={i} className="space-y-1">
                    <div className={cn("flex justify-between text-[10px]", isRTL ? "flex-row-reverse" : "")}>
                      <span className="font-medium truncate">{tech.name}</span>
                      <span className="text-muted-foreground">{Math.min(100, tech.count * 25)}%</span>
                    </div>
                    <Progress value={Math.min(100, tech.count * 25)} className="h-1.5 bg-muted/50 [&>div]:bg-gradient-to-r [&>div]:from-info/80 [&>div]:to-info" />
                  </div>
                ))}
                {recentWos.filter(wo => wo.assignedToName).length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-3">{t("noAssignments")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card variant="glass" className="h-full">
          <CardHeader className={cn("py-2.5", isRTL ? "text-right" : "")}>
            <CardTitle className="text-xs font-semibold tracking-tight">{t("quickActions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <AlertTriangle className="h-3.5 w-3.5 text-warning" />, label: t("newClaim"), href: "/claims/new", roles: ['ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN'] },
                { icon: <Wrench className="h-3.5 w-3.5 text-info" />, label: t("workOrders"), href: "/work-orders", roles: ['ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN'] },
                { icon: <Cpu className="h-3.5 w-3.5 text-primary" />, label: t("equipment"), href: "/equipment" },
                { icon: <BarChart3 className="h-3.5 w-3.5 text-accent" />, label: "BI", href: "/bi/executive" },
              ].filter(action => !action.roles || user?.hasRole(...action.roles)).map((action, i) => (
                <Link key={i} href={action.href}>
                  <div className={cn("flex items-center gap-2 p-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group", isRTL ? "flex-row-reverse" : "")}>
                    <div className="transition-transform duration-200 group-hover:scale-110">{action.icon}</div>
                    <span className="text-[10px] font-medium truncate">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </AnimatedSection>
    </div>
  )
}

function KpiCard({ label, value, icon, color, bg, isRTL }: any) {
  return (
    <Card className="card-hover border-border/50 shadow-sm">
      <CardContent className="p-3">
        <div className={cn("flex items-center justify-between gap-2", isRTL ? "flex-row-reverse" : "")}>
          <div className={cn("min-w-0", isRTL ? "text-right" : "")}>
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
            <p className="text-sm sm:text-lg font-bold tracking-tight text-foreground mt-0.5">{value ?? '—'}</p>
          </div>
          <div className={cn("p-2 rounded-xl shrink-0", bg)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityRow({ item, isRTL }: { item: ActivityItem, isRTL: boolean }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'WO_STATUS': return <Wrench className="h-3 w-3 text-info" />
      case 'CLAIM_NEW': return <AlertTriangle className="h-3 w-3 text-destructive" />
      case 'RESTOCK_APPROVED': return <Package className="h-3 w-3 text-success" />
      default: return <Zap className="h-3 w-3 text-primary" />
    }
  }
  const url = item.type === 'WO_STATUS' ? `/work-orders/${item.referenceId}`
    : item.type === 'CLAIM_NEW' ? `/claims/${item.referenceId}` : '/inventory'

  return (
    <Link href={url} className="block transition-all duration-200 hover:bg-muted/50">
      <div className={cn("flex gap-2.5 px-3 py-2", isRTL ? "flex-row-reverse" : "")}>
        <div className="h-6 w-6 rounded-lg bg-muted/50 shrink-0 flex items-center justify-center">
          {getIcon(item.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("flex items-center justify-between gap-2", isRTL ? "flex-row-reverse" : "")}>
            <p className={cn("text-xs font-medium truncate text-foreground", isRTL ? "text-right" : "")}>{item.title}</p>
            <span className="text-[9px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function StatusBadge({ status, t }: { status: string, t: any }) {
  const map: Record<string, string> = {
    IN_PROGRESS: 'bg-info/10 text-info',
    COMPLETED: 'bg-success/10 text-success',
    CREATED: 'bg-muted text-muted-foreground',
    SCHEDULED: 'bg-primary/10 text-primary',
    QUALIFIED: 'bg-accent/10 text-accent',
    ASSIGNED: 'bg-warning/10 text-warning',
    CLOSED: 'bg-muted text-muted-foreground',
    NEW: 'bg-warning/10 text-warning',
    CONVERTED_TO_WORK_ORDER: 'bg-primary/10 text-primary',
  }
  return (
    <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-semibold uppercase whitespace-nowrap tracking-wider", map[status?.toUpperCase()] ?? 'bg-muted text-muted-foreground')}>
      {t(status.toLowerCase()) || status.replace(/_/g, ' ')}
    </span>
  )
}


