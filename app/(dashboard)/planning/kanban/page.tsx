"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  MoreHorizontal, 
  Calendar, 
  User, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  ChevronRight,
  UserPlus,
  CalendarCheck,
  Pause,
  ArrowRight
} from "lucide-react"
import { format, differenceInMinutes, addMinutes } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { workOrdersApi } from "@/lib/api/work-orders"
import { usersApi } from "@/lib/api/users"
import type { WorkOrderResponse, UserResponse } from "@/lib/api/types"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { ApiError } from "@/lib/api/client"
import { useI18n } from "@/lib/i18n"

function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const payload = err.payload as any
    if (payload && typeof payload === "object") {
      return payload.message || payload.error || `Request failed (${err.status})`
    }
    return `Request failed (${err.status})`
  }
  if (err instanceof Error) return err.message
  return "An unexpected error occurred"
}

const COLUMNS = [
  { id: 'CREATED', label: 'backlog', border: 'border-zinc-200 dark:border-zinc-800', dot: 'bg-zinc-400' },
  { id: 'ASSIGNED', label: 'assigned', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  { id: 'SCHEDULED', label: 'scheduled', border: 'border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500' },
  { id: 'IN_PROGRESS', label: 'inProgress', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  { id: 'ON_HOLD', label: 'onHold', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
  { id: 'COMPLETED', label: 'done', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
]

export default function KanbanPage() {
  const { user } = useAuth()
  const { t, language } = useI18n()
  const [workOrders, setWorkOrders] = useState<WorkOrderResponse[]>([])
  const [technicians, setTechnicians] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Dialog states
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: number; status: string } | null>(null)
  const [pendingWo, setPendingWo] = useState<WorkOrderResponse | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [isOnHoldDialogOpen, setIsOnHoldDialogOpen] = useState(false)

  // Interaction states
  const [selectedTechId, setSelectedTechId] = useState<string>("")
  const [plannedStart, setPlannedStart] = useState<string>("")
  const [plannedEnd, setPlannedEnd] = useState<string>("")
  const [estDuration, setEstDuration] = useState<string>("")
  const [holdNote, setHoldNote] = useState<string>("")

  const handlePlannedStartChange = (newStart: string) => {
    if (!newStart) {
      setPlannedStart("")
      return
    }

    const newStartDate = new Date(newStart)
    if (isNaN(newStartDate.getTime())) {
      setPlannedStart(newStart)
      return
    }

    if (estDuration) {
      const mins = parseFloat(estDuration) * 60
      const newEndDate = addMinutes(newStartDate, mins)
      setPlannedEnd(format(newEndDate, "yyyy-MM-dd'T'HH:mm"))
    } else if (plannedStart && plannedEnd) {
      const oldStartDate = new Date(plannedStart)
      const oldEndDate = new Date(plannedEnd)
      if (!isNaN(oldStartDate.getTime()) && !isNaN(oldEndDate.getTime())) {
        const diffMins = differenceInMinutes(oldEndDate, oldStartDate)
        const newEndDate = addMinutes(newStartDate, diffMins)
        setPlannedEnd(format(newEndDate, "yyyy-MM-dd'T'HH:mm"))
      }
    }

    setPlannedStart(newStart)
  }

  const isManager = user?.roleName?.toUpperCase() === 'ADMIN' || user?.roleName?.toUpperCase() === 'MAINTENANCE_MANAGER'

  const loadData = async () => {
    try {
      setLoading(true)
      const [wos, users] = await Promise.all([
        workOrdersApi.list(),
        usersApi.getAll()
      ])
      setWorkOrders(wos)
      setTechnicians(users.filter(u => u.roleName?.toUpperCase() === 'TECHNICIAN' || u.roleId === 3))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDragStart = (e: React.DragEvent, woId: number) => {
    if (!isManager) return
    setDraggingId(woId)
    e.dataTransfer.setData("woId", woId.toString())
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault()
    const idStr = e.dataTransfer.getData("woId")
    if (!idStr) return
    const id = parseInt(idStr)
    setDraggingId(null)

    const wo = workOrders.find(w => w.woId === id)
    if (!wo) return
    // Allow re-opening dialogs even if same status
    if (wo.status === status && !['ASSIGNED', 'SCHEDULED', 'ON_HOLD'].includes(status)) return

    // Special handling for certain transitions
    if (status === 'ASSIGNED') {
      setPendingStatusChange({ id, status })
      setPendingWo(wo)
      setSelectedTechId(wo.assignedToUserId?.toString() || "")
      setIsAssignDialogOpen(true)
      return
    }

    if (status === 'SCHEDULED') {
      setPendingStatusChange({ id, status })
      setPlannedStart(wo.plannedStart ? wo.plannedStart.slice(0, 16) : "")
      setPlannedEnd(wo.plannedEnd ? wo.plannedEnd.slice(0, 16) : "")
      setEstDuration(wo.estimatedDuration?.toString() || "")
      setIsScheduleDialogOpen(true)
      return
    }

    if (status === 'ON_HOLD') {
      setPendingStatusChange({ id, status })
      setHoldNote("")
      setIsOnHoldDialogOpen(true)
      return
    }

    await executeStatusUpdate(id, status)
  }

  const { toast } = useToast()

  const executeStatusUpdate = async (id: number, status: string, additionalData: any = {}) => {
    setActionLoading(true)
    // Optimistic Update
    setWorkOrders(prev => prev.map(wo => wo.woId === id ? { ...wo, status, ...additionalData } : wo))
    
    try {
      if (status === 'ASSIGNED' && additionalData.assignedToUserId) {
        await workOrdersApi.assign(id, { assignedToUserId: additionalData.assignedToUserId })
        toast({ title: t('workOrderAssigned'), description: t('techRegisteredSuccess') })
      } else if (status === 'SCHEDULED' && additionalData.plannedStart) {
        await workOrdersApi.reschedule(id, additionalData)
        toast({ title: t('workOrderScheduled'), description: t('interventionUpdated') })
      } else {
        await workOrdersApi.updateStatus(id, { status, note: additionalData.note })
        toast({ title: t('statusUpdated'), description: `${t('workOrderMovedTo')} ${t(status.toLowerCase())}.` })
      }
      await loadData() // Refresh to get server values
    } catch (e) {
      console.error(e)
      toast({
        title: "Action Failed",
        description: getApiErrorMessage(e),
        variant: "destructive"
      })
      loadData() // Rollback
    } finally {
      setActionLoading(false)
      setPendingStatusChange(null)
    }
  }

  const confirmAssignment = () => {
    if (!pendingStatusChange || !selectedTechId) return
    const tech = technicians.find(t => t.userId === parseInt(selectedTechId))
    executeStatusUpdate(pendingStatusChange.id, 'ASSIGNED', { 
      assignedToUserId: parseInt(selectedTechId),
      assignedToName: tech?.fullName 
    })
    setIsAssignDialogOpen(false)
  }

  const confirmSchedule = () => {
    if (!pendingStatusChange || !plannedStart) return
    executeStatusUpdate(pendingStatusChange.id, 'SCHEDULED', {
      plannedStart: `${plannedStart}:00`,
      plannedEnd: plannedEnd ? `${plannedEnd}:00` : null,
      estimatedDuration: estDuration ? parseFloat(estDuration) : null
    })
    setIsScheduleDialogOpen(false)
  }

  const confirmHold = () => {
    if (!pendingStatusChange || !holdNote) return
    executeStatusUpdate(pendingStatusChange.id, 'ON_HOLD', { note: holdNote })
    setIsOnHoldDialogOpen(false)
  }

  const [columnWidth, setColumnWidth] = useState<'standard' | 'wide' | 'compact'>('standard')

  if (loading) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground animate-pulse">{t('loadingBoard')}</div>
  }

  const widthClass = columnWidth === 'wide' ? 'w-96' : columnWidth === 'compact' ? 'w-64' : 'w-80'

  return (
    <div className="space-y-4">
      {/* Board Controls */}
      <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm p-2 rounded-2xl border border-border/40 shadow-sm">
        <div className="flex items-center gap-2 pl-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2">{t('columnWidth')}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setColumnWidth('compact')}
            className={cn("h-7 px-3 text-[10px] uppercase font-bold tracking-tighter rounded-lg transition-all", columnWidth === 'compact' ? "bg-background text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:bg-background/50 hover:text-foreground")}
          >
            {t('compact')}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setColumnWidth('standard')}
            className={cn("h-7 px-3 text-[10px] uppercase font-bold tracking-tighter rounded-lg transition-all", columnWidth === 'standard' ? "bg-background text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:bg-background/50 hover:text-foreground")}
          >
            {t('standard')}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setColumnWidth('wide')}
            className={cn("h-7 px-3 text-[10px] uppercase font-bold tracking-tighter rounded-lg transition-all", columnWidth === 'wide' ? "bg-background text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:bg-background/50 hover:text-foreground")}
          >
            {t('wide')}
          </Button>
        </div>
        
        <div className="flex items-center gap-1 pr-1 text-[10px] font-black text-muted-foreground uppercase opacity-40">
          <ArrowRight className="h-3 w-3 animate-pulse" />
          {t('scrollForMoreColu')}
        </div>
      </div>

      <div className="relative group/kanban">
      {/* Scroll indicator for horizontal exploration */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none opacity-0 group-hover/kanban:opacity-100 transition-opacity hidden md:flex flex-col items-center gap-2 pr-4">
        <div className="bg-primary/20 backdrop-blur-md p-3 rounded-full border border-primary/30 text-primary animate-bounce-x">
          <ArrowRight className="h-6 w-6" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-primary drop-shadow-sm bg-background/50 px-2 py-0.5 rounded-full">{t('slideForMore')}</span>
      </div>

      <div className={cn(
        "flex gap-3 sm:gap-2 md:gap-3 overflow-x-auto pb-12 pt-2 px-2 min-h-[75vh] scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40 transition-all",
        "mask-fade-right" // Optional: custom CSS mask for fading edge
      )}>
      {COLUMNS.map(column => {
        const columnWos = workOrders.filter(wo => wo.status === column.id)
        
        return (
          <div 
            key={column.id}
            className={cn("flex-shrink-0 flex flex-col gap-2 md:gap-3 transition-all duration-500", widthClass)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={cn("h-3 w-3 rounded-full shadow-sm ring-2 ring-background", column.dot)} />
                <h3 className="font-bold text-xs text-foreground/80 tracking-tight">{t(column.label)}</h3>
                <Badge variant="outline" className="text-[10px] h-5 bg-muted/40 border-none font-bold text-muted-foreground">
                  {columnWos.length}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className={cn(
              "flex-1 bg-muted/30 dark:bg-muted/10 rounded-3xl p-2.5 space-y-3 min-h-[600px] border-2 border-transparent transition-all duration-300",
              draggingId && "border-primary/20 bg-primary/5 scale-[1.01]"
            )}>
              <AnimatePresence mode="popLayout">
                {columnWos.map(wo => (
                  <motion.div
                    key={wo.woId}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    draggable={isManager}
                    onDragStart={(e) => handleDragStart(e, wo.woId)}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      "bg-card text-card-foreground p-3 rounded-2xl shadow-sm border group cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
                      column.border,
                      draggingId === wo.woId && "opacity-40",
                      !isManager && "cursor-default drag-none"
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-black text-muted-foreground tracking-[0.2em]">{wo.woCode}</p>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] h-4.5 border px-2 font-bold uppercase tracking-tighter",
                          wo.priority === 'CRITICAL' ? "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:border-rose-800" :
                          wo.priority === 'HIGH' ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800" :
                          "border-zinc-200 bg-zinc-50 text-zinc-700 dark:bg-zinc-900/40 dark:border-zinc-800"
                        )}
                      >
                        {t(wo.priority.toLowerCase())}
                      </Badge>
                    </div>
                    
                    <h4 className="text-xs font-semibold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors">
                      {wo.title}
                    </h4>

                    <div className="space-y-2 mb-4">
                      {wo.equipmentName && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <AlertCircle className="h-3 w-3" />
                          <span className="truncate">{wo.equipmentName}</span>
                        </div>
                      )}
                      {wo.plannedStart && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(wo.plannedStart).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-1">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                          {wo.assignedToName?.[0] || '?'}
                        </div>
                        <span className="text-[10px] font-medium text-foreground/70 truncate w-24">
                          {wo.assignedToName || t('unassigned')}
                        </span>
                      </div>
                      <Link href={`/work-orders/${wo.woId}`}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )
      })}
      </div>
    </div>

    {/* ── ASSIGNMENT DIALOG ─────────────────────────────────── */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" />
              {t('assignTechnician')}
            </DialogTitle>
            <DialogDescription>
              {t('selectPrimaryTechnician')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>{t('selectPrimaryTechnician')}</Label>
              <select 
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
              >
                <option value="">{t('selectATechnician')}</option>
                {technicians
                  .filter(t => !pendingWo?.departmentId || t.departmentId === pendingWo.departmentId || !t.departmentId)
                  .map(t => (
                  <option key={t.userId} value={t.userId}>{t.fullName} {t.departmentName ? `(${t.departmentName})` : ' (No Department)'}</option>
                ))}
              </select>
              {technicians.length > 0 && technicians.filter(t => !pendingWo?.departmentId || t.departmentId === pendingWo.departmentId || !t.departmentId).length === 0 && (
                <p className="text-[11px] text-rose-500 mt-1">
                  {t('noTechniciansFound')}: {pendingWo?.departmentName || t('unknown')}
                </p>
              )}
              {technicians.length === 0 && (
                <p className="text-[11px] text-zinc-500 mt-1">
                  {t('noTechniciansAvail')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={confirmAssignment} disabled={!selectedTechId || actionLoading}>
              {actionLoading ? t('assigning') : t('confirmAssignment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SCHEDULE DIALOG ───────────────────────────────────── */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-indigo-500" />
              {t('scheduleInterventi')}
            </DialogTitle>
            <DialogDescription>
              {t('setThePlannedDates')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>{t('plannedStart')}</Label>
              <Input type="datetime-local" value={plannedStart} onChange={e => handlePlannedStartChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('plannedEnd')}</Label>
              <Input type="datetime-local" value={plannedEnd} onChange={e => setPlannedEnd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('estimatedDuration')}</Label>
              <Input type="number" step="0.5" placeholder="e.g. 4.5" value={estDuration} onChange={e => setEstDuration(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsScheduleDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={confirmSchedule} disabled={!plannedStart || actionLoading}>
              {actionLoading ? t('scheduling') : t('saveSchedule')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ON HOLD DIALOG ────────────────────────────────────── */}
      <Dialog open={isOnHoldDialogOpen} onOpenChange={setIsOnHoldDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-rose-500" />
              {t('pauseWork')}
            </DialogTitle>
            <DialogDescription>
              {t('pleaseProvideAReas')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>{t('reasonForPause')}</Label>
              <Textarea 
                placeholder="e.g. Waiting for spare parts delivery..." 
                value={holdNote} 
                onChange={e => setHoldNote(e.target.value)} 
                className="resize-none"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOnHoldDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={confirmHold} disabled={!holdNote || actionLoading} className="bg-rose-600 hover:bg-rose-700 text-primary-foreground">
              {actionLoading ? t('pausing') : t('putOnHold')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
