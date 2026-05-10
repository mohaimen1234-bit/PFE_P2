"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Database,
  Filter,
  Search,
  Settings2,
  Wrench,
  X,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { equipmentApi } from "@/lib/api/equipment"
import { departmentsApi } from "@/lib/api/departments"
import { referenceDataApi } from "@/lib/api/reference-data"
import type {
  EquipmentResponse,
  DepartmentResponse,
  EquipmentCategory,
} from "@/lib/api/types"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const CHART_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

const ALL_VALUE = "__all__"

export default function BiEquipmentPage() {
  const { language, t } = useI18n()

  // --- raw data ---
  const [allEquipment, setAllEquipment] = useState<EquipmentResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // --- filter state ---
  const [nameQuery, setNameQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState(ALL_VALUE)
  const [departmentFilter, setDepartmentFilter] = useState(ALL_VALUE)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([
      equipmentApi.getAll(),
      departmentsApi.getAll(),
      referenceDataApi.getCategories(),
    ])
      .then(([eq, depts, cats]) => {
        if (cancelled) return
        setAllEquipment(eq)
        setDepartments(depts)
        setCategories(cats)
      })
      .catch(() => {
        if (cancelled) return
        setAllEquipment([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // --- lookup maps ---
  const deptNameById = useMemo(() => {
    const m: Record<number, string> = {}
    for (const d of departments) m[d.departmentId] = d.departmentName
    return m
  }, [departments])

  const catNameById = useMemo(() => {
    const m: Record<number, string> = {}
    for (const c of categories) m[c.categoryId] = c.name
    return m
  }, [categories])

  // --- filtered list ---
  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase()
    return allEquipment.filter((e) => {
      const matchName = !q || (e.name ?? "").toLowerCase().includes(q)
      const matchCat =
        categoryFilter === ALL_VALUE ||
        (e.categoryId != null && String(e.categoryId) === categoryFilter)
      const matchDept =
        departmentFilter === ALL_VALUE || String(e.departmentId) === departmentFilter
      return matchName && matchCat && matchDept
    })
  }, [allEquipment, nameQuery, categoryFilter, departmentFilter])

  const hasActiveFilters =
    nameQuery.trim() !== "" || categoryFilter !== ALL_VALUE || departmentFilter !== ALL_VALUE

  const clearFilters = () => {
    setNameQuery("")
    setCategoryFilter(ALL_VALUE)
    setDepartmentFilter(ALL_VALUE)
  }

  // --- KPIs ---
  const kpis = useMemo(() => {
    const total = filtered.length
    const operational = filtered.filter((e) => (e.status ?? "").toUpperCase() === "OPERATIONAL").length
    const underRepair = filtered.filter((e) => (e.status ?? "").toUpperCase() === "UNDER_REPAIR").length
    const archived = filtered.filter((e) => (e.status ?? "").toUpperCase() === "ARCHIVED").length
    const critical = filtered.filter((e) => (e.criticality ?? "").toUpperCase() === "CRITICAL").length
    const availabilityRate = total > 0 ? Math.round((operational / total) * 100) : 0
    return { total, operational, underRepair, archived, critical, availabilityRate }
  }, [filtered])

  // --- chart data: by status ---
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of filtered) {
      const s = (e.status ?? "UNKNOWN").toUpperCase()
      counts[s] = (counts[s] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace("_", " "), value }))
  }, [filtered])

  // --- chart data: by category ---
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of filtered) {
      const label = e.categoryId != null ? (catNameById[e.categoryId] ?? t('unknown')) : t('uncategorized')
      counts[label] = (counts[label] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [filtered, catNameById])

  // --- chart data: by department ---
  const departmentChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of filtered) {
      const label = deptNameById[e.departmentId] ?? t('unknown')
      counts[label] = (counts[label] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [filtered, deptNameById])

  // --- chart data: criticality distribution ---
  const criticalityData = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, MEDIUM: 0, LOW: 0 }
    for (const e of filtered) {
      const c = (e.criticality ?? "LOW").toUpperCase()
      if (c in counts) counts[c]++
      else counts["LOW"]++
    }
    return [
      { name: t('critical'), value: counts["CRITICAL"], color: "#ef4444" },
      { name: t('medium'), value: counts["MEDIUM"], color: "#f59e0b" },
      { name: t('low'), value: counts["LOW"], color: "#10b981" },
    ].filter((d) => d.value > 0)
  }, [filtered])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-xs animate-pulse">
            {t('loadingEquipmentData')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <BarChart2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('bIEquipmentKPIs')}
          </h1>
        </div>
        <p className="text-muted-foreground ml-14">
          {t('equipmentPerformance')}
        </p>
      </div>

      {/* ── FILTER BAR ── */}
      <Card className="border-none bg-card/60 backdrop-blur-sm shadow-lg ring-1 ring-border">
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Name search */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Search className="h-3 w-3" />
                {t('equipmentName')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search')}
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category filter */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Settings2 className="h-3 w-3" />
                {t('category')}
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>
                    {t('allCategories')}
                  </SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department filter */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Filter className="h-3 w-3" />
                {t('department')}
              </label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('allDepartments')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>
                    {t('allDepartments')}
                  </SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.departmentId} value={String(d.departmentId)}>
                      {d.departmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="gap-2 self-end h-8"
              >
                <X className="h-4 w-4" />
                {t('clearFilters')}
              </Button>
            )}

            {/* Result count */}
            <div className="self-end ml-auto">
              <Badge variant="secondary" className="h-8 px-3 text-xs font-semibold rounded-lg">
                {t('equipmentCount', { count: filtered.length })}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI CARDS ── */}
      <div className="grid gap-2 md:gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label={t('totalEquipment')}
          value={kpis.total}
          icon={<Database className="h-5 w-5" />}
          colorClass="text-violet-600"
          bgClass="bg-violet-50 dark:bg-violet-900/20"
        />
        <KpiCard
          label={t('operational')}
          value={kpis.operational}
          icon={<CheckCircle2 className="h-5 w-5" />}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <KpiCard
          label={t('underRepair')}
          value={kpis.underRepair}
          icon={<Wrench className="h-5 w-5" />}
          colorClass="text-amber-600"
          bgClass="bg-amber-50 dark:bg-amber-900/20"
        />
        <KpiCard
          label={t('archived')}
          value={kpis.archived}
          icon={<Activity className="h-5 w-5" />}
          colorClass="text-slate-500"
          bgClass="bg-slate-100 dark:bg-slate-800/30"
        />
        <KpiCard
          label={t('critical')}
          value={kpis.critical}
          icon={<AlertTriangle className="h-5 w-5" />}
          colorClass="text-rose-600"
          bgClass="bg-rose-50 dark:bg-rose-900/20"
        />
        <KpiCard
          label={t('availability')}
          value={`${kpis.availabilityRate}%`}
          icon={<BarChart2 className="h-5 w-5" />}
          colorClass="text-cyan-600"
          bgClass="bg-cyan-50 dark:bg-cyan-900/20"
        />
      </div>

      {/* ── CHARTS ROW 1 ── */}
      <div className="grid gap-3 sm:gap-2 md:gap-3 lg:grid-cols-2">
        {/* Equipment by Category */}
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-sm">
              {t('equipmentByCategory')}
            </CardTitle>
            <CardDescription>
              {t('distributionAcrossEq')}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {categoryChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(99,102,241,0.06)" }}
                    contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                    {categoryChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Equipment by Department */}
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-sm">
              {t('equipmentByDepartmen')}
            </CardTitle>
            <CardDescription>
              {t('distributionAcrossDe')}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {departmentChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    width={110}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(6,182,212,0.06)" }}
                    contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {departmentChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── CHARTS ROW 2 ── */}
      <div className="grid gap-3 sm:gap-2 md:gap-3 lg:grid-cols-2">
        {/* Status donut */}
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-sm">
              {t('statusDistribution')}
            </CardTitle>
            <CardDescription>
              {t('fleetOperationalStat')}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-center justify-center">
            {statusChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "none" }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Criticality breakdown */}
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-sm">
              {t('criticalityLevels')}
            </CardTitle>
            <CardDescription>
              {t('fleetRiskExposurePro')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {kpis.total === 0 ? (
              <EmptyChart />
            ) : (
              criticalityData.map((item) => {
                const pct = kpis.total > 0 ? Math.round((item.value / kpis.total) * 100) : 0
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{item.name}</span>
                      <span className="font-bold tabular-nums">
                        {item.value} <span className="text-muted-foreground font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

// ── Sub-components ──

function KpiCard({
  label,
  value,
  icon,
  colorClass,
  bgClass,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  colorClass: string
  bgClass: string
}) {
  return (
    <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border hover:shadow-2xl transition-all duration-300">
      <CardContent className="p-5">
        <div className={cn("inline-flex p-2 rounded-lg mb-3", bgClass, colorClass)}>{icon}</div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
      {t('noDataForFilters')}
    </div>
  )
}
