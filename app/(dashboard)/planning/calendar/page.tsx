"use client"

import { useState, useEffect } from "react"
import { useI18n } from "@/lib/i18n";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  differenceInMinutes,
  addMinutes
} from "date-fns"
import { ChevronLeft, ChevronRight, Info, AlertCircle, Plus, CalendarPlus, User, Clock, MapPin, Hash } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { EquipmentSelector } from "@/components/equipment-selector"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { workOrdersApi } from "@/lib/api/work-orders"
import { equipmentApi } from "@/lib/api/equipment"
import type { WorkOrderResponse, EquipmentResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

export default function CalendarPage() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER, ROLES.TECHNICIAN]}>
      <CalendarPageContent />
    </RouteGuard>
  )
}

function CalendarPageContent() {
  const { t, isRTL, language } = useI18n();

  const [currentDate, setCurrentDate] = useState(new Date())
  const [workOrders, setWorkOrders] = useState<WorkOrderResponse[]>([])
  const [equipments, setEquipments] = useState<EquipmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newWO, setNewWO] = useState({
    title: "",
    description: "",
    equipmentId: "",
    woType: "CORRECTIVE",
    priority: "MEDIUM"
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [wos, eqs] = await Promise.all([
          workOrdersApi.list(),
          equipmentApi.getAll()
        ])
        setWorkOrders(wos)
        setEquipments(eqs)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const getDayWos = (day: Date) => {
    return workOrders.filter(wo => {
      if (!wo.plannedStart && !wo.dueDate) return false
      const date = wo.plannedStart ? new Date(wo.plannedStart) : new Date(wo.dueDate!)
      return isSameDay(date, day)
    })
  }

  const handleDragStart = (e: React.DragEvent, woId: number) => {
    e.dataTransfer.setData("woId", woId.toString())
  }

  const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault()
    const woId = parseInt(e.dataTransfer.getData("woId"))
    if (!woId) return

    const wo = workOrders.find(w => w.woId === woId)
    if (!wo) return

    const originalTime = wo.plannedStart ? wo.plannedStart.split('T')[1] : "09:00:00"
    const newPlannedStart = format(targetDay, "yyyy-MM-dd") + "T" + originalTime

    let newPlannedEnd = null
    let newDueDate = null

    if (wo.plannedStart) {
      const oldStart = new Date(wo.plannedStart)
      const newStart = new Date(newPlannedStart)
      
      if (!isNaN(oldStart.getTime()) && !isNaN(newStart.getTime())) {
        const diffMins = differenceInMinutes(newStart, oldStart)

        if (wo.plannedEnd) {
          const oldEnd = new Date(wo.plannedEnd)
          if (!isNaN(oldEnd.getTime())) {
            newPlannedEnd = format(addMinutes(oldEnd, diffMins), "yyyy-MM-dd'T'HH:mm:ss")
          }
        }
        
        if (wo.dueDate) {
          const oldDue = new Date(wo.dueDate)
          if (!isNaN(oldDue.getTime())) {
            newDueDate = format(addMinutes(oldDue, diffMins), "yyyy-MM-dd'T'HH:mm:ss")
          }
        } else {
          const hours = wo.estimatedDuration || wo.estimatedTimeHours || 0
          if (hours > 0) {
            newDueDate = format(addMinutes(newStart, hours * 60), "yyyy-MM-dd'T'HH:mm:ss")
          }
        }
      }
    } else {
      if (wo.plannedEnd) {
        newPlannedEnd = format(targetDay, "yyyy-MM-dd") + "T" + wo.plannedEnd.split('T')[1]
      }
      
      const newStart = new Date(newPlannedStart)
      
      if (wo.dueDate) {
         newDueDate = format(targetDay, "yyyy-MM-dd") + "T" + wo.dueDate.split('T')[1]
      } else {
         const hours = wo.estimatedDuration || wo.estimatedTimeHours || 0
         if (hours > 0 && !isNaN(newStart.getTime())) {
           newDueDate = format(addMinutes(newStart, hours * 60), "yyyy-MM-dd'T'HH:mm:ss")
         }
      }
    }

    setIsUpdating(true)
    setWorkOrders(prev => prev.map(w => w.woId === woId ? { 
      ...w, 
      plannedStart: newPlannedStart,
      ...(newPlannedEnd && { plannedEnd: newPlannedEnd }),
      ...(newDueDate && { dueDate: newDueDate })
    } : w))

    try {
      await workOrdersApi.reschedule(woId, { 
        plannedStart: newPlannedStart,
        plannedEnd: newPlannedEnd,
        dueDate: newDueDate
      })
      toast.success(`${t('reScheduledTo')} ${format(targetDay, "MMM dd")}`)
    } catch (err) {
      console.error(err)
      toast.error(t('couldNotReschedule'))
      const refresh = await workOrdersApi.list()
      setWorkOrders(refresh)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    setNewWO(prev => ({ ...prev, title: "" }))
    setIsCreateDialogOpen(true)
  }

  const handleCreateSubmit = async () => {
    if (!newWO.title || !newWO.equipmentId || !selectedDate) {
      toast.error(t('titleAndEquipmentRequired'))
      return
    }

    setIsUpdating(true)
    try {
      const plannedStart = format(selectedDate, "yyyy-MM-dd") + "T09:00:00"
      await workOrdersApi.create({
        ...newWO,
        equipmentId: parseInt(newWO.equipmentId),
        plannedStart,
        status: 'SCHEDULED'
      })
      toast.success(t('woCreatedSuccess'))
      setIsCreateDialogOpen(false)
      const updated = await workOrdersApi.list()
      setWorkOrders(updated)
    } catch (err) {
      console.error(err)
      toast.error(t('failedToCreate'))
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
     return <div className="flex h-96 items-center justify-center text-muted-foreground animate-pulse">{t('initializingCalendar')}</div>
  }

  const dayNames = [
    t('sun') || "Sun", 
    t('mon') || "Mon", 
    t('tue') || "Tue", 
    t('wed') || "Wed", 
    t('thu') || "Thu", 
    t('fri') || "Fri", 
    t('sat') || "Sat"
  ]

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
    <Card className="shadow-xl border-border/40 overflow-hidden rounded-3xl">
      <CardHeader className={cn("flex flex-row items-center justify-between bg-muted/20 border-b border-border/60 py-3", isRTL ? "flex-row-reverse" : "")}>
        <div className={cn("flex flex-col", isRTL ? "text-right" : "")}>
          <CardTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            {format(currentDate, "MMMM yyyy")}
          </CardTitle>
          <div className={cn("flex gap-2 md:gap-3 mt-1", isRTL ? "flex-row-reverse" : "")}>
             <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-indigo-500" /> {t('planned')}
             </div>
             <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-amber-500" /> {t('dueDate')}
             </div>
          </div>
        </div>
        <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="h-8 rounded-lg">{t('today')}</Button>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 hover:bg-white"><ChevronLeft className={cn("h-4 w-4", isRTL ? "rotate-180" : "")} /></Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 hover:bg-white"><ChevronRight className={cn("h-4 w-4", isRTL ? "rotate-180" : "")} /></Button>
          </div>
        </div>
    </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/5">
          {dayNames.map((day) => (
            <div key={day} className="p-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[140px]">
          {calendarDays.map((day, idx) => {
            const dayWos = getDayWos(day)
            const isCurrentMonth = isSameMonth(day, monthStart)
            const isTodayDay = isToday(day)

            return (
              <div 
                key={idx} 
                className={cn(
                  "border-r border-b border-border/40 p-1 flex flex-col gap-1 transition-colors hover:bg-muted/5 group/day relative min-w-0",
                  !isCurrentMonth && "bg-muted/10 opacity-40"
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, day)}
                onClick={() => handleDayClick(day)}
              >
                <div className={cn("flex justify-between p-1.5 items-start", isRTL ? "flex-row-reverse" : "")}>
                  <span className={cn(
                    "text-xs font-semibold h-7 w-7 flex items-center justify-center rounded-full",
                    isTodayDay && "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    !isTodayDay && isCurrentMonth && "text-foreground",
                    !isTodayDay && !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                  <div className="opacity-0 group-hover/day:opacity-100 transition-opacity">
                    <Plus className="h-4 w-4 text-primary cursor-pointer hover:scale-110" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-1 space-y-1 z-10" onClick={(e) => e.stopPropagation()}>
                  {dayWos.map(wo => (
                    <div 
                      key={wo.woId}
                      draggable 
                      onDragStart={(e) => handleDragStart(e, wo.woId)}
                    >
                    <Link href={`/work-orders/${wo.woId}`}>
                      <div className={cn(
                         "text-[10px] p-1.5 rounded-lg border flex flex-col gap-0.5 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-move",
                         wo.status === 'COMPLETED' ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                         wo.status === 'IN_PROGRESS' ? "bg-amber-50 border-amber-100 text-amber-800" :
                         wo.plannedStart ? "bg-indigo-50 border-indigo-100 text-indigo-800" : "bg-zinc-50 border-zinc-200 text-zinc-800"
                      )}>
                        <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
                           <span className="font-bold tracking-tight">{wo.woCode}</span>
                           {wo.priority === 'CRITICAL' && <AlertCircle className="h-2 w-2 text-rose-500" />}
                        </div>
                        <span className={cn("truncate opacity-90 leading-tight", isRTL ? "text-right" : "")}>{wo.title}</span>
                      </div>
                    </Link>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border shadow-2xl" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : ""}>
            <DialogTitle>{t('createIntervention')}</DialogTitle>
            <DialogDescription>
              {t('fillDetailsIntervention')} {selectedDate && format(selectedDate, "MMMM dd, yyyy")}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="grid gap-2">
              <label className={cn("text-xs font-medium", isRTL ? "text-right" : "")}>{t('title')}</label>
              <Input 
                required 
                placeholder={t('brieflyDescribeTheIs')} 
                value={newWO.title}
                onChange={(e) => setNewWO({...newWO, title: e.target.value})}
                className={isRTL ? "text-right" : ""}
              />
            </div>
            <div className="grid gap-2">
              <EquipmentSelector
                equipmentList={equipments}
                value={newWO.equipmentId}
                onChange={(val) => setNewWO({...newWO, equipmentId: val})}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <div className="grid gap-2">
                <label className={cn("text-xs font-medium", isRTL ? "text-right" : "")}>{t('type')}</label>
                <select 
                  className={cn("flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background", isRTL ? "text-right" : "")}
                  value={newWO.woType}
                  onChange={(e) => setNewWO({...newWO, woType: e.target.value})}
                >
                  <option value="CORRECTIVE">{t('corrective')}</option>
                  <option value="PREVENTIVE">{t('preventive')}</option>
                  <option value="PREDICTIVE">{t('predictive')}</option>
                  <option value="REGULATORY">{t('regulatory')}</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className={cn("text-xs font-medium", isRTL ? "text-right" : "")}>{t('priority')}</label>
                <select 
                  className={cn("flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background", isRTL ? "text-right" : "")}
                  value={newWO.priority}
                  onChange={(e) => setNewWO({...newWO, priority: e.target.value})}
                >
                  <option value="LOW">{t('low')}</option>
                  <option value="MEDIUM">{t('medium')}</option>
                  <option value="HIGH">{t('high')}</option>
                  <option value="CRITICAL">{t('critical')}</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <label className={cn("text-xs font-medium", isRTL ? "text-right" : "")}>{t('description')}</label>
              <textarea 
                className={cn("flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground", isRTL ? "text-right" : "")}
                placeholder={t('describeTheIssueInDe')}
                value={newWO.description}
                onChange={(e) => setNewWO({...newWO, description: e.target.value})}
              />
            </div>
            <div className={cn("flex justify-end gap-3 pt-4", isRTL ? "flex-row-reverse" : "")}>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t('cancel')}</Button>
              <Button 
                onClick={handleCreateSubmit} 
                className="bg-primary text-primary-foreground"
                disabled={isUpdating}
              >
                {isUpdating ? t('creating') : t('createWorkOrder')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
