"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  User,
  Activity,
  ChevronRight,
  Info
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { regulatoryApi, type RegulatoryPlanResponse } from "@/lib/api/regulatory"
import { equipmentApi } from "@/lib/api/equipment"
import type { EquipmentResponse } from "@/lib/api/types"
import { format, formatDistanceToNow } from "date-fns"
import { fr, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function RegulatoryPlansPage() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER]}>
      <RegulatoryPlansPageContent />
    </RouteGuard>
  )
}

function RegulatoryPlansPageContent() {
  const { t, language, isRTL } = useI18n()
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [plans, setPlans] = useState<RegulatoryPlanResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const dateLocale = language === 'fr' ? fr : enUS

  const loadData = async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const data = await regulatoryApi.list()
      setPlans(data)
    } catch (error) {
      console.error("Failed to load regulatory plans", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, isAuthLoading])

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const q = search.toLowerCase()
      const matchesSearch = plan.title.toLowerCase().includes(q) || 
                           plan.planCode.toLowerCase().includes(q) ||
                           (plan.equipmentName?.toLowerCase().includes(q) ?? false)

      const f = filter.toLowerCase()
      if (f === "all") return matchesSearch
      return matchesSearch && plan.status.toLowerCase() === f
    })
  }, [plans, search, filter])

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "OVERDUE":
        return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20">{t('overdue')}</Badge>
      case "DUE_SOON":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">{t('dueSoon')}</Badge>
      case "ACTIVE":
      case "UPCOMING":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">{t('active')}</Badge>
      case "INACTIVE":
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20">{t('inactive')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "CRITICAL":
        return <Badge variant="destructive">{t('critical')}</Badge>
      case "HIGH":
        return <Badge className="bg-orange-500 border-none text-primary-foreground">{t('high')}</Badge>
      case "MEDIUM":
        return <Badge className="bg-amber-500 border-none text-primary-foreground">{t('medium')}</Badge>
      default:
        return <Badge className="bg-blue-500 border-none text-primary-foreground">{t('low')}</Badge>
    }
  }

  return (
    <motion.div 
      initial="initial" 
      animate="animate" 
      className="flex-1 space-y-6 overflow-auto"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            {t('regulatoryPlans')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('mandatoryScheduledMa')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
          {user?.roleName !== 'TECHNICIAN' && (
            <Link href="/planning/regulatory/new">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" />
                {t('newPlan')}
              </Button>
            </Link>
          )}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeInUp} className="grid gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            title: t('totalActive'), 
            count: plans.filter(p => p.isActive).length, 
            icon: Activity, 
            color: "text-blue-500",
            bg: "bg-blue-500/10"
          },
          { 
            title: t('dueThisMonth'), 
            count: plans.filter(p => {
                const due = new Date(p.nextDueDate)
                const now = new Date()
                return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear()
            }).length, 
            icon: Calendar, 
            color: "text-indigo-500",
            bg: "bg-indigo-500/10"
          },
          { 
            title: t('overdue'), 
            count: plans.filter(p => p.status === 'OVERDUE').length, 
            icon: AlertTriangle, 
            color: "text-rose-500",
            bg: "bg-rose-500/10"
          },
          { 
            title: t('complianceRate'), 
            count: plans.length > 0 ? Math.round((plans.filter(p => p.status !== 'OVERDUE').length / plans.length) * 100) + '%' : '100%', 
            icon: CheckCircle2, 
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
          },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm border-border bg-card/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.title}</CardTitle>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black">{stat.count}</div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center flex-wrap min-w-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t('searchPlans')} 
            className="pl-9 bg-card border-border shadow-sm rounded-xl h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-card border-border shadow-sm rounded-xl">
                <Filter className="h-4 w-4 mr-2" />
                {t('filter')}: {filter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border">
                <DropdownMenuItem onClick={() => setFilter("all")}>{t('allStatus')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("active")}>{t('active')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("overdue")}>{t('overdue')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("due_soon")}>{t('dueSoon')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("inactive")}>{t('inactive')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeInUp}>
        <Card className="border-border shadow-xl overflow-hidden bg-card/40 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center gap-2 md:gap-3">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">{t('loadingPlans')}</p>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="py-20 text-center">
                <Info className="h-8 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-sm sm:text-lg font-bold">{t('noPlansFound')}</h3>
                <p className="text-muted-foreground text-xs">{t('tryAdjustingYourSear')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className={cn("font-bold", isRTL && "text-right")}>{t('code')}</TableHead>
                      <TableHead className={cn("font-bold", isRTL && "text-right")}>{t('title')}</TableHead>
                      <TableHead className={cn("font-bold", isRTL && "text-right")}>{t('equipment')}</TableHead>
                      <TableHead className={cn("font-bold", isRTL && "text-right")}>{t('recurrence')}</TableHead>
                      <TableHead className={cn("font-bold", isRTL && "text-right")}>{t('nextDue')}</TableHead>
                      <TableHead className="font-bold text-center">{t('status')}</TableHead>
                      <TableHead className={cn("font-bold", isRTL ? "text-left pl-6" : "text-right pr-6")}>{t('action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan) => (
                      <TableRow key={plan.planId} className="hover:bg-muted/50 transition-colors group">
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {plan.planCode}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-xs">{plan.title}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{plan.description}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">{plan.equipmentName}</div>
                          <div className="text-[10px] text-muted-foreground">{plan.departmentName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {plan.recurrenceValue} {plan.recurrenceUnit}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold">
                            {format(new Date(plan.nextDueDate), 'dd MMM yyyy', { locale: dateLocale })}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(plan.nextDueDate), { addSuffix: true, locale: dateLocale })}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(plan.status)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <Link href={`/planning/regulatory/${plan.planId}`}>
                                <Button variant="ghost" size="sm" className="h-8 group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-lg">
                                    {t('details')}
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
