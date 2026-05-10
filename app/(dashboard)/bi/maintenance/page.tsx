"use client"
import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Activity, AlertTriangle, CheckCircle2, Clock, Filter, RefreshCw, Search, Settings2, TrendingDown, TrendingUp, Wrench, X } from "lucide-react"
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts"
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
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

const C = ["#8b5cf6","#06b6d4","#ef4444","#10b981","#f59e0b","#6366f1","#ec4899"]
const ALL = "__all__"
function Empty(){return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data for selected filters</div>}

function KpiCard({label,sub,value,icon,trend,colorClass,bgClass,higherIsBetter=true}:any){
  const isGood=trend!=null&&trend!==0?(higherIsBetter?trend>0:trend<0):null
  return(
    <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border hover:shadow-2xl transition-all">
      <CardContent className="p-5">
        <div className={cn("inline-flex p-2 rounded-lg mb-3",bgClass,colorClass)}>{icon}</div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-xl font-bold mt-0.5">{value}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
        {isGood!==null&&<div className={cn("inline-flex items-center gap-1 mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full",isGood?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700")}>{isGood?<TrendingUp className="h-3 w-3"/>:<TrendingDown className="h-3 w-3"/>}{Math.abs(trend).toFixed(1)}%</div>}
      </CardContent>
    </Card>
  )
}

export default function MaintenanceDashboard() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER, ROLES.FINANCE_MANAGER]}>
      <MaintenanceDashboardContent />
    </RouteGuard>
  )
}

function MaintenanceDashboardContent(){
  const { t, language } = useI18n()
  const [kpi,setKpi]=useState<KpiResponse|null>(null)
  const [wos,setWos]=useState<WorkOrderResponse[]>([])
  const [depts,setDepts]=useState<DepartmentResponse[]>([])
  const [cats,setCats]=useState<EquipmentCategory[]>([])
  const [loading,setLoading]=useState(true)
  const [refreshing,setRefreshing]=useState(false)
  const [nameQ,setNameQ]=useState("")
  const [deptF,setDeptF]=useState(ALL)
  const [catF,setCatF]=useState(ALL)

  const load=async(r=false)=>{
    r?setRefreshing(true):setLoading(true)
    try{
      const [k,w,d,c]=await Promise.all([biApi.getKpis(),workOrdersApi.list(),departmentsApi.getAll(),referenceDataApi.getCategories()])
      setKpi(k);setWos(w);setDepts(d);setCats(c)
    }finally{setLoading(false);setRefreshing(false)}
  }
  useEffect(()=>{load()},[])

  const filteredWos=useMemo(()=>wos.filter(wo=>{
    const n=nameQ.trim().toLowerCase()
    const mName=!n||(wo.equipmentName??"").toLowerCase().includes(n)
    const mDept=deptF===ALL||(wo.departmentName??"")===(depts.find(d=>String(d.departmentId)===deptF)?.departmentName??"")
    return mName&&mDept
  }),[wos,nameQ,deptF,depts])

  const hasFilter=nameQ.trim()!==""||deptF!==ALL||catF!==ALL
  const clear=()=>{setNameQ("");setDeptF(ALL);setCatF(ALL)}

  // derived KPIs from filtered WOs
  const totalFiltered=filteredWos.length
  const corrective=filteredWos.filter(w=>(w.woType??"").toUpperCase()==="CORRECTIVE").length
  const preventive=filteredWos.filter(w=>(w.woType??"").toUpperCase()==="PREVENTIVE").length
  const totalTyped=corrective+preventive
  const cpRatio=totalTyped>0?Math.round(corrective/totalTyped*100):0
  const preventivePct=totalTyped>0?Math.round(preventive/totalTyped*100):0
  const totalCost=filteredWos.reduce((a,wo)=>a+Number(wo.actualCost??0),0)
  const avgCostEq=useMemo(()=>{
    const m:Record<string,number>={}
    for(const wo of filteredWos){const k=wo.equipmentName??"Unknown";m[k]=(m[k]??0)+Number(wo.actualCost??0)}
    const vals=Object.values(m)
    return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0
  },[filteredWos])

  // WO status breakdown from filtered
  const statusData=useMemo(()=>{
    const m:Record<string,number>={}
    for(const wo of filteredWos){const s=(wo.status??"UNKNOWN").replace(/_/g," ");m[s]=(m[s]??0)+1}
    return Object.entries(m).map(([name,value])=>({name,value}))
  },[filteredWos])

  // WO type breakdown from filtered
  const typeData=useMemo(()=>{
    const m:Record<string,number>={}
    for(const wo of filteredWos){const t=(wo.woType??"OTHER").replace(/_/g," ");m[t]=(m[t]??0)+1}
    return Object.entries(m).map(([name,value])=>({name,value}))
  },[filteredWos])

  // cost per dept from filtered
  const costPerDept=useMemo(()=>{
    const m:Record<string,number>={}
    for(const wo of filteredWos){const k=wo.departmentName??"Unknown";m[k]=(m[k]??0)+Number(wo.actualCost??0)}
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}))
  },[filteredWos])

  const woTrends=useMemo(()=>kpi?.monthlyWorkOrderTrends?Object.entries(kpi.monthlyWorkOrderTrends).map(([month,stats])=>({
    month,
    Completed:stats["Completed"]||stats["COMPLETED"]||0,
    Planned:stats["Planned"]||stats["PLANNED"]||0,
    Emergency:stats["Emergency"]||stats["EMERGENCY"]||0,
  })):[], [kpi])

  const costTrend=useMemo(()=>kpi?.monthlyCostTrends?Object.entries(kpi.monthlyCostTrends).map(([month,cost])=>({month,cost:Number(cost)})):[],[kpi])

  if(loading)return(
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
        <p className="text-muted-foreground text-xs animate-pulse">{t('loadingMaintenanceDash')}</p>
      </div>
    </div>
  )

  return(
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.4}} className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30"><Wrench className="h-6 w-6 text-violet-600"/></div>
            {t('maintenanceDashboard')}
          </h1>
          <p className="text-muted-foreground ml-14">{t('operationalIndicator')}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={()=>load(true)} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4",refreshing&&"animate-spin")}/>{t('refresh')}
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="border-none bg-card/60 backdrop-blur-sm shadow-lg ring-1 ring-border">
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Search className="h-3 w-3"/>{t('equipmentName')}</label>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input placeholder={t('search')} value={nameQ} onChange={e=>setNameQ(e.target.value)} className="pl-9"/>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Settings2 className="h-3 w-3"/>{t('category')}</label>
              <Select value={catF} onValueChange={setCatF}>
                <SelectTrigger><SelectValue placeholder={t('allCategories')}/></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('allCategories')}</SelectItem>
                  {cats.map(c=><SelectItem key={c.categoryId} value={String(c.categoryId)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Filter className="h-3 w-3"/>{t('department')}</label>
              <Select value={deptF} onValueChange={setDeptF}>
                <SelectTrigger><SelectValue placeholder={t('allDepartments')}/></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('allDepartments')}</SelectItem>
                  {depts.map(d=><SelectItem key={d.departmentId} value={String(d.departmentId)}>{d.departmentName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {hasFilter&&<Button variant="outline" size="sm" onClick={clear} className="gap-2 self-end h-8"><X className="h-4 w-4"/>{t('clear')}</Button>}
            <div className="self-end ml-auto">
              <Badge variant="secondary" className="h-8 px-3 text-xs font-semibold rounded-lg">{t('wosCount', { count: totalFiltered })}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategic KPI Cards */}
      <div className="grid gap-2 md:gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="MTBF" sub={t('mtbfDesc')} value={`${kpi?.mtbf?.toFixed(0)??"—"}h`} icon={<Activity className="h-5 w-5"/>} trend={kpi?.mtbfTrend} colorClass="text-emerald-600" bgClass="bg-emerald-50 dark:bg-emerald-900/20" higherIsBetter/>
        <KpiCard label="MTTR" sub={t('mttrDesc')} value={`${kpi?.mttr?.toFixed(1)??"—"}h`} icon={<Clock className="h-5 w-5"/>} trend={kpi?.mttrTrend} colorClass="text-indigo-600" bgClass="bg-indigo-50 dark:bg-indigo-900/20" higherIsBetter={false}/>
        <KpiCard label={t('availability')} sub={t('operationalUptime')} value={`${kpi?.availabilityRate?.toFixed(1)??"—"}%`} icon={<CheckCircle2 className="h-5 w-5"/>} colorClass="text-cyan-600" bgClass="bg-cyan-50 dark:bg-cyan-900/20" higherIsBetter/>
        <KpiCard label="Corrective %" sub={hasFilter?t('filteredWOs'):t('fromFilteredWOs')} value={`${cpRatio}%`} icon={<Wrench className="h-5 w-5"/>} colorClass="text-amber-600" bgClass="bg-amber-50 dark:bg-amber-900/20" higherIsBetter={false}/>
        <KpiCard label="Preventive %" sub={hasFilter?t('filteredWOs'):t('fromFilteredWOs')} value={`${preventivePct}%`} icon={<CheckCircle2 className="h-5 w-5"/>} colorClass="text-violet-600" bgClass="bg-violet-50 dark:bg-violet-900/20" higherIsBetter/>
        <KpiCard label={t('totalCost')} sub={t('sumOfWoCosts')} value={totalCost>=1000?`${(totalCost/1000).toFixed(1)}k DT`:`${totalCost.toFixed(0)} DT`} icon={<AlertTriangle className="h-5 w-5"/>} colorClass="text-rose-600" bgClass="bg-rose-50 dark:bg-rose-900/20" higherIsBetter={false}/>
      </div>

      {/* Row 1: WO Trends + Type Pie */}
      <div className="grid gap-3 sm:gap-2 md:gap-3 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader><CardTitle className="text-sm">{t('workOrderTrends')}</CardTitle><CardDescription>{t('woTrendsDesc')}</CardDescription></CardHeader>
          <CardContent className="h-[300px]">
            {woTrends.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={woTrends} margin={{top:10,right:10,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5}/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}}/>
                  <YAxis axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}}/>
                  <Tooltip contentStyle={{borderRadius:"10px",border:"none"}}/>
                  <Legend verticalAlign="bottom" height={36}/>
                  <Bar dataKey="Completed" fill="#8b5cf6" radius={[4,4,0,0]} barSize={18}/>
                  <Bar dataKey="Planned" fill="#06b6d4" radius={[4,4,0,0]} barSize={18}/>
                  <Bar dataKey="Emergency" fill="#ef4444" radius={[4,4,0,0]} barSize={18}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader><CardTitle className="text-sm">{t('wOTypeDistribution')}</CardTitle><CardDescription>{t('woTypeDistDesc')} {hasFilter&&`· ${t('filtered')}`}</CardDescription></CardHeader>
          <CardContent className="h-[300px]">
            {typeData.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" outerRadius={95} innerRadius={50} paddingAngle={4} dataKey="value">
                    {typeData.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius:"10px",border:"none"}}/>
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Cost trend + Status breakdown */}
      <div className="grid gap-3 sm:gap-2 md:gap-3 lg:grid-cols-2">
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader><CardTitle className="text-sm">{t('monthlyCostCurve')}</CardTitle><CardDescription>{t('monthlyCostTrendDesc')}</CardDescription></CardHeader>
          <CardContent className="h-[280px]">
            {costTrend.length===0?<Empty/>:(
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costTrend} margin={{top:10,right:10,left:0,bottom:0}}>
                  <defs><linearGradient id="mc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5}/>
                  <YAxis axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>`${v/1000}k DT`}/>
                  <Tooltip contentStyle={{borderRadius:"10px",border:"none"}} formatter={(v:any)=>[`${Number(v).toLocaleString('fr-TN')} DT`,t('cost')]}/>
                  <Area type="monotone" dataKey="cost" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#mc)"/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader><CardTitle className="text-sm">{t('wOStatusBreakdown')}</CardTitle><CardDescription>{t('currentStatusDist')} {hasFilter&&`· ${t('filtered')}`}</CardDescription></CardHeader>
          <CardContent className="space-y-4 pt-2">
            {statusData.length===0?<Empty/>:statusData.map((item,i)=>{
              const pct=totalFiltered>0?Math.round(item.value/totalFiltered*100):0
              return(
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold capitalize">{item.name.toLowerCase()}</span>
                    <span className="font-bold tabular-nums">{item.value} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8,ease:"easeOut"}} className="h-full rounded-full" style={{backgroundColor:C[i%C.length]}}/>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Cost per dept */}
      {costPerDept.length>0&&(
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardHeader><CardTitle className="text-sm">{t('maintenanceCostDepar')}</CardTitle><CardDescription>{t('derivedFromWoCosts')} {hasFilter&&`· ${t('filtered')}`}</CardDescription></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costPerDept} layout="vertical" margin={{top:10,right:30,left:10,bottom:10}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.5}/>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>`${v/1000}k DT`}/>
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:11}} width={110}/>
                <Tooltip contentStyle={{borderRadius:"10px",border:"none"}} formatter={(v:any)=>[`${Number(v).toLocaleString('fr-TN')} DT`,t('cost')]}/>
                <Bar dataKey="value" radius={[0,6,6,0]} barSize={22}>{costPerDept.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Work Orders */}
      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
        <CardHeader><CardTitle className="text-sm">{t('recentWorkOrders')}</CardTitle><CardDescription>{t('latestMaintenanceActi')} {hasFilter&&`· ${t('filtered')}`}</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredWos.length===0?(
              <p className="text-center text-muted-foreground italic py-3">{t('noWorkOrdersMatch')}</p>
            ):filteredWos.slice(0,8).map((wo,i)=>(
              <div key={i} className="flex justify-between items-center p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div>
                  <h3 className="font-semibold">{wo.equipmentName??"—"}</h3>
                  <p className="text-xs text-muted-foreground">{wo.woCode} · {wo.woType} · {wo.departmentName??"—"}</p>
                </div>
                <Badge className={cn("border-none text-primary-foreground text-xs",
                  ["COMPLETED","CLOSED","VALIDATED"].includes(wo.status??"")?"bg-emerald-500":
                  wo.status==="IN_PROGRESS"?"bg-amber-500":"bg-blue-500"
                )}>{(wo.status??"").replace(/_/g," ")}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
