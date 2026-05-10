"use client"
import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Activity, Clock, DollarSign, RefreshCw, Search, TrendingDown, TrendingUp, Wrench, X } from "lucide-react"
import { AreaChart, Area, BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { biApi } from "@/lib/api/bi"
import { workOrdersApi } from "@/lib/api/work-orders"
import { departmentsApi } from "@/lib/api/departments"
import { referenceDataApi } from "@/lib/api/reference-data"
import type { KpiResponse, WorkOrderResponse, DepartmentResponse, EquipmentCategory } from "@/lib/api/types"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { getMaintenanceColorVar } from "@/lib/colors-util"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

const C = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f59e0b","#10b981","#06b6d4"]
const ALL = "__all__"
const fmtDT = (v:number) => v>=1000?`${(v/1000).toFixed(1)}k DT`:`${v.toFixed(0)} DT`

function Empty(){
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
      <div className="w-16 h-16 mb-4 rounded-full bg-muted/50 flex items-center justify-center">
        <Search className="h-8 w-8 opacity-20" />
      </div>
      <p className="text-sm font-medium">{t('noDataForSelected')}</p>
    </div>
  )
}

function KpiCard({label,sub,value,icon,trend,colorClass,bgClass,colorVar,bgColorVar,higherIsBetter=true}:any){
  const isGood=trend!=null&&trend!==0?(higherIsBetter?trend>0:trend<0):null
  
  return(
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
      <Card className="relative overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow h-full">
        <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none opacity-50" />
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</p>
              </div>
              <p className="text-xs text-muted-foreground/80 line-clamp-1">{sub}</p>
            </div>
            <div className={cn("p-3 rounded-2xl shrink-0 backdrop-blur-sm border shadow-inner",bgClass,colorClass)} style={{ backgroundColor: bgColorVar, color: colorVar, borderColor: colorVar ? `color-mix(in srgb, ${colorVar} 20%, transparent)` : undefined }}>
              {icon}
            </div>
          </div>
          {isGood!==null && (
            <div className={cn("inline-flex items-center gap-1 mt-4 text-xs font-semibold px-2 py-1 rounded-md border", isGood?"bg-emerald-500/10 text-emerald-600 border-emerald-500/20":"bg-rose-500/10 text-rose-600 border-rose-500/20")}>
              {isGood?<TrendingUp className="h-3.5 w-3.5"/>:<TrendingDown className="h-3.5 w-3.5"/>}
              {Math.abs(trend).toFixed(1)}% {isGood ? 'vs last month' : ''}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border p-3 rounded-xl shadow-xl">
        <p className="text-sm font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {formatter ? formatter(entry.value, entry.name)[0] : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ExecutiveDashboard() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER, ROLES.FINANCE_MANAGER]}>
      <ExecutiveDashboardContent />
    </RouteGuard>
  )
}

function ExecutiveDashboardContent() {
  const {language,t}=useI18n()
  const [kpi,setKpi]=useState<KpiResponse|null>(null)
  const [wos,setWos]=useState<WorkOrderResponse[]>([])
  const [depts,setDepts]=useState<DepartmentResponse[]>([])
  const [cats,setCats]=useState<EquipmentCategory[]>([])
  const [loading,setLoading]=useState(true)
  const [refreshing,setRefreshing]=useState(false)
  
  // filters
  const [nameQ,setNameQ]=useState("")
  const [deptF,setDeptF]=useState(ALL)
  const [catF,setCatF]=useState(ALL)

  const load=async(r=false)=>{
    r?setRefreshing(true):setLoading(true)
    try{
      const [k,w,d,c]=await Promise.all([biApi.getKpis(),workOrdersApi.list(),departmentsApi.getAll(),referenceDataApi.getCategories()])
      setKpi(k);setWos(w);setDepts(d);setCats(c)
    }catch(e){
      console.error(e)
    }finally{
      setLoading(false);setRefreshing(false)
    }
  }
  
  useEffect(()=>{load()},[])

  // filtered WOs
  const filteredWos=useMemo(()=>wos.filter(wo=>{
    const n=nameQ.trim().toLowerCase()
    const mName=!n||(wo.equipmentName??"").toLowerCase().includes(n)
    const mDept=deptF===ALL||(wo.departmentName??"")===(depts.find(d=>String(d.departmentId)===deptF)?.departmentName??"")
    const mCat=catF===ALL
    return mName&&mDept&&mCat
  }),[wos,nameQ,deptF,catF,depts])

  const hasFilter=nameQ.trim()!==""||deptF!==ALL||catF!==ALL
  const clear=()=>{setNameQ("");setDeptF(ALL);setCatF(ALL)}

  const costPerEq=useMemo(()=>{
    const m:Record<string,number>={}
    for(const wo of filteredWos){
      const k=wo.equipmentName??"Unknown"
      m[k]=(m[k]??0)+Number(wo.actualCost??0)
    }
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,value])=>({name,value}))
  },[filteredWos])

  const costPerDept=useMemo(()=>{
    const m:Record<string,number>={}
    for(const wo of filteredWos){
      const k=wo.departmentName??"Unknown"
      m[k]=(m[k]??0)+Number(wo.actualCost??0)
    }
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}))
  },[filteredWos])

  const avgCostEq=costPerEq.length?costPerEq.reduce((a,b)=>a+b.value,0)/costPerEq.length:0
  const avgCostDept=costPerDept.length?costPerDept.reduce((a,b)=>a+b.value,0)/costPerDept.length:0

  const paretoData=useMemo(()=>{
    const total=costPerEq.reduce((a,b)=>a+b.value,0)
    let cum=0
    return costPerEq.map(e=>{
      cum+=e.value;
      return{name:e.name,cost:e.value,cumPct:total>0?Number((cum/total*100).toFixed(1)):0}
    })
  },[costPerEq])

  const costTrends=useMemo(()=>kpi?.monthlyCostTrends?Object.entries(kpi.monthlyCostTrends).map(([month,cost])=>({month,cost:Number(cost)})):[],[kpi])
  const annualData=useMemo(()=>kpi?.annualProjection?Object.entries(kpi.annualProjection).map(([name,value])=>({name,value:Number(value)})):[],[kpi])

  if(loading)return(
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/>
      <p className="text-muted-foreground font-medium animate-pulse">{t('loadingExecutiveDash')}</p>
    </div>
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return(
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">{t('managementDashboard')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('workOrderManagementDesc')}</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium rounded-lg shrink-0">
            {t('wosCount', { count: filteredWos.length })}
          </Badge>
          <Button variant="default" className="gap-2 shadow-md hover:shadow-lg transition-all rounded-xl" onClick={()=>load(true)} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4",refreshing&&"animate-spin")}/>
            <span className="hidden sm:inline">{t('refresh')}</span>
          </Button>
        </div>
      </motion.div>

      {/* Filter Bar */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input placeholder={t('search')} value={nameQ} onChange={e=>setNameQ(e.target.value)} className="pl-9 h-10 rounded-xl bg-muted/50 border-transparent focus:bg-background"/>
        </div>
        <Select value={catF} onValueChange={setCatF}>
          <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-transparent"><SelectValue placeholder={t('category')}/></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value={ALL}>{t('all')}</SelectItem>
            {cats.map(c=><SelectItem key={c.categoryId} value={String(c.categoryId)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deptF} onValueChange={setDeptF}>
          <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-transparent"><SelectValue placeholder={t('department')}/></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value={ALL}>{t('all')}</SelectItem>
            {depts.map(d=><SelectItem key={d.departmentId} value={String(d.departmentId)}>{d.departmentName}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-end">
          {hasFilter&&(
            <Button variant="ghost" onClick={clear} className="h-10 rounded-xl text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 me-2"/>{t('clear')}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Strategic KPI Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="MTBF" sub={t('mtbfDesc')} value={`${kpi?.mtbf?.toFixed(0)??"—"}h`} icon={<Activity className="h-6 w-6"/>} trend={kpi?.mtbfTrend} colorClass="text-emerald-500" bgClass="bg-emerald-500/10" higherIsBetter/>
        <KpiCard label="MTTR" sub={t('mttrDesc')} value={`${kpi?.mttr?.toFixed(1)??"—"}h`} icon={<Clock className="h-6 w-6"/>} trend={kpi?.mttrTrend} colorClass="text-indigo-500" bgClass="bg-indigo-500/10" higherIsBetter={false}/>
        <KpiCard label={t('availability')} sub={t('equipmentAvailRate')} value={`${kpi?.availabilityRate?.toFixed(1)??"—"}%`} icon={<Activity className="h-6 w-6"/>} colorClass="text-cyan-500" bgClass="bg-cyan-500/10" higherIsBetter/>
        <KpiCard label={t('correctivePreventive')} sub={t('correctiveRatio')} value={`${kpi?.correctivePreventiveRatio?.toFixed(0)??"—"}%`} icon={<Wrench className="h-6 w-6"/>} colorVar={getMaintenanceColorVar('CORRECTIVE')} bgColorVar={`rgba(var(--color-maintenance-type-corrective-rgb, 239, 68, 68), 0.1)`} higherIsBetter={false}/>
        <KpiCard label={t('costEquipment')} sub={hasFilter?t('filteredAvgFromWOs'):t('avgCostPerAsset')} value={fmtDT(avgCostEq)} icon={<DollarSign className="h-6 w-6"/>} colorClass="text-violet-500" bgClass="bg-violet-500/10" higherIsBetter={false}/>
        <KpiCard label={t('costDept')} sub={hasFilter?t('filteredAvgFromWOs'):t('avgCostPerDept')} value={fmtDT(avgCostDept)} icon={<DollarSign className="h-6 w-6"/>} colorClass="text-rose-500" bgClass="bg-rose-500/10" higherIsBetter={false}/>
      </motion.div>

      {/* Row 1: Cost trend + Pareto */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
            <CardTitle className="text-base font-semibold">{t('monthlyCostTrend')}</CardTitle>
            <CardDescription>{t('woTrendsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-6">
            {costTrends.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costTrends} margin={{top:10,right:10,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4}/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:12}} dy={10}/>
                  <YAxis axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:12}} tickFormatter={v=>`${v/1000}k DT`} dx={-10}/>
                  <Tooltip content={<CustomTooltip formatter={(v:any)=>[`${Number(v).toLocaleString('fr-TN')} DT`,t('cost')]} />}/>
                  <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={3} fill="url(#colorCost)" animationDuration={1500}/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
            <CardTitle className="text-base font-semibold">{t('paretoChartEquipment')}</CardTitle>
            <CardDescription>{t('strategicKPIsProject')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-6">
            {paretoData.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoData} margin={{top:10,right:10,left:0,bottom:60}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4}/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:11}} angle={-45} textAnchor="end" dy={15}/>
                  <YAxis yAxisId="l" axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:12}} tickFormatter={v=>`${v/1000}k DT`} dx={-10}/>
                  <YAxis yAxisId="r" orientation="right" axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:12}} tickFormatter={v=>`${v}%`} domain={[0,100]} dx={10}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <Bar yAxisId="l" dataKey="cost" barSize={32} radius={[6,6,0,0]} animationDuration={1500}>
                    {paretoData.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}
                  </Bar>
                  <Line yAxisId="r" type="monotone" dataKey="cumPct" stroke="#ef4444" strokeWidth={3} dot={{r:4,fill:"#ef4444",strokeWidth:0}} name={t('cumulativePercent')} animationDuration={1500}/>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 2: Cost distribution */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
            <CardTitle className="text-base font-semibold">{t('costDistributionByDe')}</CardTitle>
            <CardDescription>{t('ytdSpendingBreakdown')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-6">
            {costPerDept.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costPerDept} cx="50%" cy="50%" outerRadius={110} innerRadius={70} paddingAngle={4} dataKey="value" animationDuration={1500} stroke="none">
                    {costPerDept.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}
                  </Pie>
                  <Tooltip content={<CustomTooltip formatter={(v:any)=>[`${Number(v).toLocaleString('fr-TN')} DT`,t('cost')]} />}/>
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{fontSize:'12px', paddingTop:'20px'}}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
            <CardTitle className="text-base font-semibold">{t('annualCostProjection')}</CardTitle>
            <CardDescription>{t('ytdBudget')}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-6">
            {annualData.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualData} layout="vertical" margin={{top:10,right:10,left:10,bottom:10}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.4}/>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:12}} tickFormatter={v=>`${v/1000}k DT`}/>
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:12}} width={120} dy={4}/>
                  <Tooltip content={<CustomTooltip formatter={(v:any)=>[`${Number(v).toLocaleString('fr-TN')} DT`,t('amount')]} />}/>
                  <Bar dataKey="value" radius={[0,8,8,0]} barSize={28} animationDuration={1500}>
                    {annualData.map((e,i)=><Cell key={i} fill={e.name.toLowerCase().includes("limit")||e.name.toLowerCase().includes("budget")?"#f43f5e":C[i%C.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Maintenance cost per equipment */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
            <CardTitle className="text-base font-semibold">{t('maintenanceCostEquip')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] p-6">
            {costPerEq.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costPerEq} margin={{top:10,right:10,left:0,bottom:40}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4}/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:11}} angle={-30} textAnchor="end" dy={15}/>
                  <YAxis axisLine={false} tickLine={false} tick={{fill:"var(--muted-foreground)",fontSize:12}} tickFormatter={v=>`${v/1000}k DT`} dx={-10}/>
                  <Tooltip content={<CustomTooltip formatter={(v:any)=>[`${Number(v).toLocaleString('fr-TN')} DT`,t('cost')]} />}/>
                  <Bar dataKey="value" radius={[8,8,0,0]} barSize={48} animationDuration={1500}>
                    {costPerEq.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Costly equipment table */}
      {(kpi?.costlyEquipments?.length??0)>0&&(
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
              <CardTitle className="text-base font-semibold">{t('topCostlyEquipment')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/10">
                      {[t('equipment'),t('category'),t('department'),t('totalCostTable'),t('percentOfTotal')].map(h=>(
                        <th key={h} className="text-start py-4 px-6 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kpi!.costlyEquipments!.map((eq,i)=>(
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                        <td className="py-4 px-6 font-medium text-foreground">{eq.name}</td>
                        <td className="py-4 px-6">
                          <Badge variant="outline" className="text-xs uppercase tracking-wider bg-background group-hover:bg-muted transition-colors">{eq.category}</Badge>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">{eq.department}</td>
                        <td className="py-4 px-6 font-bold text-foreground">{Number(eq.totalCost).toLocaleString('fr-TN')} DT</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(eq.percentageOfTotal, 100)}%` }}
                                transition={{ duration: 1, delay: 0.2 + (i * 0.1) }}
                                className="h-full bg-indigo-500 rounded-full" 
                              />
                            </div>
                            <span className="text-sm font-mono font-medium text-muted-foreground w-12 text-end">{eq.percentageOfTotal?.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
