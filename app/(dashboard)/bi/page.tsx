"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Activity, 
  ShieldAlert,
  ArrowRight,
  Filter,
  Download,
  Calendar
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
  AreaChart,
  Area
} from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { biApi } from "@/lib/api/bi"
import type { KpiResponse } from "@/lib/api/types"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function BiDashboardPage() {
  const { language, t } = useI18n()
  const [data, setData] = useState<KpiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    biApi.getKpis()
      .then(setData)
      .finally(() => setIsLoading(false))
  }, [])

  const costData = useMemo(() => {
    if (!data?.costByCategory) return []
    return Object.entries(data.costByCategory).map(([name, value]) => ({ name, value }))
  }, [data])

  const statusData = useMemo(() => {
    if (!data?.woByStatus) return []
    return Object.entries(data.woByStatus).map(([name, value]) => ({ name: name.replace('_', ' '), value }))
  }, [data])

  if (isLoading) {
    return <div className="p-3 sm:p-6 text-center animate-pulse text-muted-foreground">Loading Analytics Engine...</div>
  }

  return (
    <motion.div 
      initial="initial" 
      animate="animate" 
      className="space-y-6 pb-12"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
             <div className="bg-primary/10 p-2 rounded-xl">
               <BarChartIcon className="h-6 w-6 text-primary" />
             </div>
             {t('businessIntelligence')}
          </h1>
          <p className="text-muted-foreground">
             {t('maintenancePerforman')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
           <Button variant="outline" className="gap-2 border-border shadow-sm">
             <Calendar className="h-4 w-4" />
             {t('last12Months')}
           </Button>
           <Button className="gap-2 shadow-lg shadow-primary/20">
             <Download className="h-4 w-4" />
             {t('exportPdf')}
           </Button>
        </div>
      </motion.div>

      {/* Primary KPI Cards */}
      <div className="grid gap-3 sm:gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
           title={t('totalSpend')} 
           value={`$${data?.totalMaintenanceCost?.toLocaleString()}`} 
           trend={data?.costTrend} 
           icon={<DollarSign className="h-5 w-5" />}
           color="text-emerald-500"
           inverseTrend={true}
        />
        <KpiCard 
           title={t('mttr')} 
           value={`${data?.mttr?.toFixed(1)}h`} 
           description={t('meanTimeToRepair')}
           trend={data?.mttrTrend} 
           icon={<Clock className="h-5 w-5" />}
           color="text-indigo-500"
           inverseTrend={true}
        />
        <KpiCard 
           title={t('mtbf')} 
           value={`${data?.mtbf?.toFixed(0)}h`} 
           description={t('meanTimeBetweenFailures')}
           trend={data?.mtbfTrend} 
           icon={<Activity className="h-5 w-5" />}
           color="text-cyan-500"
        />
        <KpiCard 
           title={t('lowStockAlerts')} 
           value={data?.lowStockParts.toString() || "0"} 
           description={t('urgentRestocksNeeded')}
           icon={<ShieldAlert className="h-5 w-5" />}
           color="text-rose-500"
        />
      </div>

      <div className="grid gap-3 sm:gap-2 md:gap-3 lg:grid-cols-7">
        {/* Cost by Type Chart */}
        <Card className="lg:col-span-4 border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-sm sm:text-lg">{t('maintenanceSpendByType')}</CardTitle>
            <CardDescription>{t('financialDistDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#64748b', fontSize: 12 }} 
                   angle={-25} 
                   textAnchor="end"
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#64748b', fontSize: 12 }} 
                   tickFormatter={(val) => `$${val/1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Work Order Distribution Chart */}
        <Card className="lg:col-span-3 border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border overflow-hidden relative">
          <CardHeader>
            <CardTitle className="text-sm sm:text-lg">{t('operationalHealthCheck')}</CardTitle>
            <CardDescription>{t('statusDistDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                 >
                   {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
                 <Legend verticalAlign="bottom" height={36}/>
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute top-[57%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-xl sm:text-2xl font-bold tracking-tighter">{data?.totalWorkOrders}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{t('totalWo')}</p>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-2 md:gap-3 lg:grid-cols-2">
         {/* Reliability Leaderboard */}
         <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
           <CardHeader>
              <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-500" />
                {t('reliabilityCompliance')}
              </CardTitle>
              <CardDescription>{t('benchmarkingDesc')}</CardDescription>
           </CardHeader>
           <CardContent>
              <div className="space-y-6">
                 <ReliabilityRow label={t('systemAvailability')} value="98.2%" color="bg-emerald-500" sub={t('optimalPerformance')} />
                 <ReliabilityRow label={t('pmCompliance')} value="89.5%" color="bg-indigo-500" sub={t('plannedVsActual')} />
                 <ReliabilityRow label={t('emergencyRatio')} value="12.4%" color="bg-amber-500" sub={t('reactiveWorkPressure')} />
                 <ReliabilityRow label={t('safetyCheckRate')} value="100%" color="bg-cyan-500" sub={t('medicalComplianceLocked')} />
              </div>
           </CardContent>
         </Card>

         {/* Efficiency Summary */}
         <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
               <CardTitle className="text-sm sm:text-lg">{t('efficiencyInsights')}</CardTitle>
               <CardDescription>{t('aiObservationsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <InsightBox 
                  icon={<TrendingDown className="h-4 w-4 text-emerald-500" />}
                  title={t('repairEfficiencyImproving')}
                  desc={t('mttrDecreasedDesc')}
               />
               <InsightBox 
                  icon={<TrendingUp className="h-4 w-4 text-rose-500" />}
                  title={t('stockoutsImaging')}
                  desc={t('xraySpikeDesc')}
               />
               <InsightBox 
                  icon={<ShieldAlert className="h-4 w-4 text-indigo-500" />}
                  title={t('complianceMilestone')}
                  desc={t('calibrationAlertsDesc')}
               />
            </CardContent>
         </Card>
      </div>
    </motion.div>
  )
}

function KpiCard({ title, value, description, trend, icon, color, inverseTrend = false }: any) {
  const isPositive = (trend || 0) > 0;
  const isGood = inverseTrend ? !isPositive : isPositive;

  return (
    <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border hover:shadow-2xl transition-all duration-300">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
           <div className={cn("p-2 rounded-lg bg-muted", color)}>
             {icon}
           </div>
           {trend !== undefined && (
             <Badge variant="outline" className={cn(
               "gap-1 h-6",
               isGood ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-rose-200 text-rose-700 bg-rose-50"
             )}>
               {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
               {Math.abs(trend).toFixed(1)}%
             </Badge>
           )}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl font-bold">{value}</h3>
          </div>
          {description && <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-1">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function ReliabilityRow({ label, value, color, sub }: any) {
  return (
    <div className="space-y-2">
       <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold">{label}</span>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          </div>
          <span className="font-bold">{value}</span>
       </div>
       <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: value }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn("h-full", color)} 
          />
       </div>
    </div>
  )
}

function InsightBox({ icon, title, desc }: any) {
  return (
    <div className="p-3 rounded-xl border border-border/60 bg-white/50 dark:bg-black/20 flex gap-3">
       <div className="mt-1">{icon}</div>
       <div>
         <p className="text-xs font-bold">{title}</p>
         <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
       </div>
    </div>
  )
}
