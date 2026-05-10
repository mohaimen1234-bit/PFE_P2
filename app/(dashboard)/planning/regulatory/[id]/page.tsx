"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  ArrowLeft, 
  Clock, 
  ShieldCheck, 
  Calendar, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle,
  History,
  FileText,
  Edit,
  FastForward,
  MoreVertical,
  Activity,
  Check
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/lib/i18n"
import { useToast } from "@/components/ui/use-toast"
import { regulatoryApi, type RegulatoryPlanResponse } from "@/lib/api/regulatory"
import { workOrdersApi } from "@/lib/api/work-orders"
import type { WorkOrderResponse } from "@/lib/api/types"
import { format, formatDistanceToNow } from "date-fns"
import { fr, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function RegulatoryPlanDetailPage() {
  const { t, language } = useI18n()
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const planId = Number(params?.id)

  const [plan, setPlan] = useState<RegulatoryPlanResponse | null>(null)
  const [history, setHistory] = useState<WorkOrderResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRescheduling, setIsRescheduling] = useState(false)
  
  // Reschedule Form
  const [newDueDate, setNewDueDate] = useState("")
  const [postponeReason, setPostponeReason] = useState("")

  const dateLocale = language === 'fr' ? fr : enUS

  const loadData = async () => {
    try {
      setIsLoading(true)
      const data = await regulatoryApi.getById(planId)
      setPlan(data)
      setNewDueDate(data.nextDueDate.split('T')[0])

      // Load linked WOs
      const allWos = await workOrdersApi.list()
      const planWos = allWos.filter(wo => wo.regulatoryPlanId === planId)
      setHistory(planWos)
    } catch (err) {
      toast({ title: "Error", description: "Failed to load plan details", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (planId) loadData()
  }, [planId])

  const handleReschedule = async () => {
    if (!postponeReason.trim()) {
        toast({ title: "Reason Required", description: "Please provide a reason for rescheduling", variant: "destructive" })
        return
    }

    try {
      setIsRescheduling(true)
      await regulatoryApi.update(planId, {
        nextDueDate: new Date(newDueDate).toISOString(),
        postponementReason: postponeReason
      })
      toast({ title: "Success", description: "{t('planRescheduledSucce')}" })
      loadData()
    } catch (err) {
      toast({ title: "Error", description: "{t('failedToReschedulePl')}", variant: "destructive" })
    } finally {
      setIsRescheduling(false)
    }
  }

  if (isLoading) return <div className="p-20 text-center animate-pulse">{t('loadingPlanDetails')}</div>
  if (!plan) return <div className="p-20 text-center text-rose-500 font-bold">{t('planNotFound')}</div>

  return (
    <motion.div initial="initial" animate="animate" className="flex-1 space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{plan.planCode}</h1>
              <Badge className={cn(
                    "ml-2",
                    plan.status === 'OVERDUE' ? 'bg-rose-500' : 
                    plan.status === 'DUE_SOON' ? 'bg-amber-500' : 'bg-emerald-500'
              )}>
                {plan.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{plan.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
           <Dialog>
             <DialogTrigger asChild>
              {plan.status === 'UPCOMING' && (
                <Button variant="outline" className="rounded-xl border-dashed">
                    <FastForward className="h-4 w-4 mr-2" />
                    {t('reschedule')}
                </Button>
              )}
             </DialogTrigger>
             <DialogContent className="rounded-2xl border-border bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle>{t('rescheduleMaintenanc')}</DialogTitle>
                    <DialogDescription>
                        {t('regulatoryTraceabilityDesc')}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-3">
                    <div className="grid gap-2">
                        <Label>{t('newDueDate')}</Label>
                        <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('reasonForPostponement')}</Label>
                        <Textarea 
                            placeholder="e.g. Spare parts delay, Provider unavailability..." 
                            value={postponeReason}
                            onChange={e => setPostponeReason(e.target.value)}
                            className="rounded-xl min-h-[100px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => {}} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleReschedule} disabled={isRescheduling} className="rounded-xl bg-primary text-primary-foreground">
                        {isRescheduling ? t('wait') : t('updateDueDate')}
                    </Button>
                </DialogFooter>
             </DialogContent>
           </Dialog>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-2 md:gap-3 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border bg-card/40 backdrop-blur-sm rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t('configuration')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-2 md:gap-3">
                <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">{t('recurrence')}</Label>
                    <p className="text-xs font-bold flex items-center gap-1.5 mt-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {t('everyRecurrence', { value: plan.recurrenceValue, unit: plan.recurrenceUnit })}
                    </p>
                </div>
                <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">{t('priority')}</Label>
                    <p className="mt-1">{plan.priority}</p>
                </div>
                <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">{t('mandatory')}</Label>
                    <p className="mt-1 font-bold text-primary">{plan.isMandatory ? t('yes') : t('no')}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/50 pt-4">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">{t('linkedEquipment')}</Label>
                <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-xl border border-border/40">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary"><Wrench className="h-5 w-5" /></div>
                    <div>
                        <p className="text-xs font-bold">{plan.equipmentName}</p>
                        <p className="text-[10px] text-muted-foreground">{plan.departmentName}</p>
                    </div>
                </div>
              </div>

              {plan.postponementReason && (
                 <div className="bg-amber-500/10 border-l-4 border-amber-500 p-3 rounded-r-xl">
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">{t('lastPostponementReason')}</p>
                    <p className="text-xs italic text-amber-900/80">{plan.postponementReason}</p>
                 </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card className="border-border bg-card/40 backdrop-blur-sm rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-500" />
                {t('executionHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground italic text-xs">
                    {t('noWorkOrdersGeneratedYet')}
                </div>
              ) : (
                <div className="space-y-3">
                    {history.sort((a,b) => b.woId - a.woId).map(wo => (
                        <div key={wo.woId} className="flex items-center justify-between p-3 bg-muted/20 border border-border/40 rounded-2xl hover:bg-muted/40 transition-colors">
                            <div className="flex flex-col">
                                <span className="font-mono text-xs font-bold text-primary">{wo.woCode}</span>
                                <span className="text-xs font-bold">{format(new Date(wo.createdAt), 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="hidden sm:flex flex-col text-right">
                                <span className="text-[10px] text-muted-foreground uppercase">{t('status')}</span>
                                <Badge variant="outline" className="text-[10px] h-4">{wo.status}</Badge>
                            </div>
                            <Link href={`/work-orders/${wo.woId}`}>
                                <Button variant="ghost" size="sm" className="rounded-lg h-8">
                                    <Activity className="h-4 w-4 mr-2" />
                                    {t('viewWO')}
                                </Button>
                            </Link>
                        </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-xl rounded-2xl overflow-hidden">
             <div className="h-1.5 w-full bg-primary" />
             <CardHeader>
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('planStatus')}</CardTitle>
             </CardHeader>
             <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-3 gap-2">
                    <div className={cn(
                        "h-20 w-20 rounded-full flex items-center justify-center border-4",
                        plan.status === 'OVERDUE' ? 'border-rose-500 text-rose-500 bg-rose-500/10' :
                        plan.status === 'DUE_SOON' ? 'border-amber-500 text-amber-500 bg-amber-500/10' :
                        'border-emerald-500 text-emerald-500 bg-emerald-500/10'
                    )}>
                        {plan.status === 'OVERDUE' ? <AlertTriangle className="h-8 w-10" /> : <ShieldCheck className="h-8 w-10" />}
                    </div>
                    <span className="text-lg sm:text-xl font-black uppercase text-foreground">{plan.status}</span>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('nextDue')}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg sm:text-xl font-bold">{format(new Date(plan.nextDueDate), 'dd MMM')}</span>
                            <span className="text-muted-foreground text-xs">{format(new Date(plan.nextDueDate), 'yyyy')}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(plan.nextDueDate), { addSuffix: true, locale: dateLocale })}
                        </p>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('lastExecution')}</span>
                        <p className="text-xs font-medium">
                            {plan.lastExecutionDate ? format(new Date(plan.lastExecutionDate), 'dd/MM/yyyy') : (t('never'))}
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t('progressToNextDue')}</span>
                        <span className="font-bold">75%</span>
                    </div>
                    <Progress value={75} className="h-1.5" />
                </div>

                {(plan.status === 'OVERDUE' || plan.status === 'DUE_SOON') && (
                    <Button 
                        onClick={async () => {
                            try {
                                await regulatoryApi.generateWorkOrder(planId)
                                toast({ title: "Success", description: "Work Order generated successfully" })
                                loadData()
                            } catch (err) {
                                toast({ title: "Error", description: "Failed to generate work order", variant: "destructive" })
                            }
                        }}
                        className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-primary-foreground mt-4"
                    >
                        <Wrench className="h-4 w-4 mr-2" />
                        {t('generateWONow')}
                    </Button>
                )}
             </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
