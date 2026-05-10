"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { 
  CheckCircle2, 
  Circle, 
  Search, 
  Filter, 
  Clock, 
  Wrench,
  MoreVertical,
  ChevronRight,
  AlertTriangle,
  History,
  Briefcase,
  LayoutDashboard,
  Plus,
  Calendar,
  AlertCircle,
  Timer,
  PauseCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskExecutionHub } from "@/components/tasks/TaskExecutionHub"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useI18n } from "@/lib/i18n"
import { usePagination } from "@/lib/hooks/use-pagination"
import { useAuth } from "@/lib/auth-context"
import { tasksApi } from "@/lib/api/tasks"
import { workOrdersApi } from "@/lib/api/work-orders"
import { taskTemplatesApi } from "@/lib/api/task-templates"
import type { TaskResponse, WorkOrderResponse, TaskTemplateResponse } from "@/lib/api/types"
import { format, isPast } from "date-fns"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function TasksPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { isRTL, t } = useI18n()
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [myWorkOrders, setMyWorkOrders] = useState<WorkOrderResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")

  // Detailed Task View
  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

  // Reschedule State
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false)
  const [rescheduleWoId, setRescheduleWoId] = useState<number | null>(null)
  const [plannedStart, setPlannedStart] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [rescheduleDuration, setRescheduleDuration] = useState("")

  // New Task State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedWoId, setSelectedWoId] = useState<string>("")
  const [newTaskDesc, setNewTaskDesc] = useState("")
  const [newTaskDuration, setNewTaskDuration] = useState("")
  const [newTaskParentId, setNewTaskParentId] = useState<number | null>(null)
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM")
  const [newTaskDueDate, setNewTaskDueDate] = useState("")
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("")
  
  // Template States
  const [creationMode, setCreationMode] = useState<'CUSTOM' | 'TEMPLATE'>('CUSTOM')
  const [templates, setTemplates] = useState<TaskTemplateResponse[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplateResponse | null>(null)

  const [technicians, setTechnicians] = useState<any[]>([])

  const isManager = user?.roleName?.toUpperCase() === 'ADMIN' || user?.roleName?.toUpperCase() === 'MAINTENANCE_MANAGER'

  const loadData = async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const isManagerRole = user?.roleName?.toUpperCase() === 'ADMIN' || user?.roleName?.toUpperCase() === 'MAINTENANCE_MANAGER'
      const [tasksData, woData] = await Promise.all([
        tasksApi.getAll(),
        workOrdersApi.list()
      ])
      setTasks(tasksData)
      
      if (isManagerRole) {
        setMyWorkOrders(woData)
      } else {
        setMyWorkOrders(woData.filter(wo => wo.assignedToUserId === user?.id))
      }

      if (isManagerRole) {
        try {
          const { usersApi } = await import("@/lib/api/users")
          const techs = await usersApi.getAll()
          setTechnicians(techs.filter(t => t.roleName === 'TECHNICIAN' || t.roleId === 3))
        } catch { }
      } else {
        setNewTaskAssignedTo(user!.id.toString())
      }
    } catch (error) {
      console.error("Failed to load tasks", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      loadData()
      taskTemplatesApi.getAll().then(setTemplates).catch(console.error)
    }
  }, [isAuthenticated, isAuthLoading])

  const handleAddAdHocTask = async () => {
    const targetWoId = parseInt(selectedWoId)
    if (!targetWoId || !newTaskDesc) return

    try {
      await tasksApi.create({
        woId: targetWoId,
        templateId: (creationMode === 'TEMPLATE' && selectedTemplateId) ? parseInt(selectedTemplateId) : undefined,
        description: newTaskDesc,
        estimatedDuration: newTaskDuration ? parseFloat(newTaskDuration) : null,
        title: newTaskDesc.split(' ').slice(0, 5).join(' '),
        parentTaskId: newTaskParentId,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || null,
        assignedToUserId: newTaskAssignedTo ? parseInt(newTaskAssignedTo) : undefined
      })
      setNewTaskDesc("")
      setNewTaskDuration("")
      setNewTaskParentId(null)
      setNewTaskPriority("MEDIUM")
      setNewTaskDueDate("")
      setNewTaskAssignedTo("")
      setCreationMode('CUSTOM')
      setSelectedTemplateId("")
      setSelectedTemplate(null)
      setIsAddDialogOpen(false)
      loadData()
    } catch (e) {
      console.error("Failed to add task", e)
    }
  }

  const openRescheduleFor = (woId: number) => {
    const wo = myWorkOrders.find(w => w.woId === woId)
    if (!wo) return
    setRescheduleWoId(woId)
    setPlannedStart(wo.plannedStart ? format(new Date(wo.plannedStart), "yyyy-MM-dd'T'HH:mm") : "")
    setDueDate(wo.dueDate ? format(new Date(wo.dueDate), "yyyy-MM-dd'T'HH:mm") : "")
    setRescheduleDuration(wo.estimatedDuration?.toString() || "")
    setIsRescheduleDialogOpen(true)
  }

  const handleReschedule = async () => {
    if (!rescheduleWoId) return
    try {
      const formatDateTime = (dt: string) => dt && !dt.includes(':00') ? `${dt}:00` : dt;
      await workOrdersApi.reschedule(rescheduleWoId, {
        plannedStart: formatDateTime(plannedStart) || null,
        dueDate: formatDateTime(dueDate) || null,
        estimatedDuration: rescheduleDuration ? parseFloat(rescheduleDuration) : null
      })
      setIsRescheduleDialogOpen(false)
      loadData()
    } catch (e) {
      console.error("Reschedule failed", e)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const template = templates.find(t => t.id === parseInt(templateId))
    if (template) {
      setSelectedTemplate(template)
      setNewTaskDesc(template.name)
      if (template.estimatedHours) setNewTaskDuration(template.estimatedHours.toString())
      if (template.defaultPriority) setNewTaskPriority(template.defaultPriority)
    } else {
      setSelectedTemplate(null)
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = (task.description ?? task.title ?? '').toLowerCase().includes(search.toLowerCase())
      const matchesFilter = filter === "all" || task.status.toLowerCase() === filter.toLowerCase()
      return matchesSearch && matchesFilter
    })
  }, [tasks, search, filter])

  const { paginatedItems: paginatedTasks, PaginationControls } = usePagination(filteredTasks, 10);

  const kpis = useMemo(() => {
    return {
      total: tasks.length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      blocked: tasks.filter(t => t.status === 'BLOCKED').length,
      completed: tasks.filter(t => t.status === 'DONE' || t.status === 'PASS').length,
      overdue: tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'DONE').length,
      hours: tasks.reduce((acc, t) => acc + (t.actualDuration || 0), 0)
    }
  }, [tasks])

  if (isAuthLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex-1 space-y-3 p-3 md:p-3 pt-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
           <div className="bg-primary/10 p-2 rounded-lg">
             <Wrench className="h-5 w-5 text-primary" />
           </div>
           <div>
             <h1 className="text-xl font-bold tracking-tight text-foreground">{t('executionTaskCenter')}</h1>
             <p className="text-xs text-muted-foreground">{t('manageYourMaintenance')}</p>
           </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8 bg-primary">
                <Plus className="h-3.5 w-3.5" />
                {t('newTask')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
              <DialogHeader className={isRTL ? "text-right" : "text-left"}>
                <DialogTitle>{t('createExecutionTask')}</DialogTitle>
                <DialogDescription>
                  {t('executionTaskDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 md:gap-3 py-3 max-h-[70vh] overflow-auto px-1">
                {isManager && (
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('creationMode')}</Label>
                    <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1 rounded-lg">
                      <Button 
                        variant={creationMode === 'CUSTOM' ? 'default' : 'ghost'} 
                        size="sm"
                        onClick={() => setCreationMode('CUSTOM')}
                        className={cn("h-8 text-xs", creationMode === 'CUSTOM' && "bg-background text-foreground shadow-sm hover:bg-background")}
                      >
                        {t('customTask')}
                      </Button>
                      <Button 
                        variant={creationMode === 'TEMPLATE' ? 'default' : 'ghost'} 
                        size="sm"
                        onClick={() => setCreationMode('TEMPLATE')}
                        className={cn("h-8 text-xs", creationMode === 'TEMPLATE' && "bg-background text-foreground shadow-sm hover:bg-background")}
                      >
                        {t('useTemplate')}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label className={isRTL ? "text-right" : "text-left"}>{t('workOrders')}</Label>
                  <select 
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                    value={selectedWoId}
                    onChange={(e) => setSelectedWoId(e.target.value)}
                  >
                    <option value="">{t('select')} {t('workOrders')}...</option>
                    {myWorkOrders.map(wo => (
                      <option key={wo.woId} value={wo.woId}>{wo.woCode} - {wo.title}</option>
                    ))}
                  </select>
                </div>

                {creationMode === 'TEMPLATE' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={cn("grid gap-2 md:gap-3 py-2 bg-primary/5 rounded-r-lg", isRTL ? "border-r-2 pr-4" : "border-l-2 pl-4")}>
                    <div className="grid gap-2">
                      <Label className={cn("font-bold text-primary", isRTL ? "text-right" : "text-left")}>{t('selectTemplate')}</Label>
                      <select 
                        className="flex h-8 w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                        value={selectedTemplateId}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                      >
                        <option value="">-- {t('select')} --</option>
                        {templates.map(tmp => (
                          <option key={tmp.id} value={tmp.id}>{tmp.name}</option>
                        ))}
                      </select>
                    </div>

                    {selectedTemplate && (
                      <div className="space-y-3">
                        <div className="text-[11px] text-muted-foreground italic bg-background/50 p-2 rounded border border-border/40">
                          {selectedTemplate.description}
                        </div>
                        <div className="grid gap-1.5">
                           <Label className={cn("text-[10px] font-bold uppercase tracking-widest text-primary/70", isRTL ? "text-right" : "text-left")}>{t('generatedChecklist')}</Label>
                           <div className="space-y-1 max-h-[120px] overflow-auto pr-1">
                              {selectedTemplate.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs bg-background/40 p-1.5 rounded border border-border/30">
                                   <div className="h-4 w-4 rounded-full border border-primary/40 flex items-center justify-center text-[8px] font-bold text-primary">{idx + 1}</div>
                                   <span className="truncate">{item.label}</span>
                                   {item.isRequired && <span className="text-[8px] text-rose-500 font-bold ml-auto">REQ</span>}
                                </div>
                              ))}
                           </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="grid gap-2">
                  <Label className={isRTL ? "text-right" : "text-left"}>{t('description')}</Label>
                  <Input 
                    placeholder={t('sterilizeUnitEx')} 
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-3">
                   <div className="grid gap-2">
                      <Label className={isRTL ? "text-right" : "text-left"}>{t('priority')}</Label>
                      <select 
                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value)}
                      >
                         <option value="LOW">{t('low')}</option>
                         <option value="MEDIUM">{t('medium')}</option>
                         <option value="HIGH">{t('high')}</option>
                         <option value="CRITICAL">{t('critical')}</option>
                      </select>
                   </div>
                   <div className="grid gap-2">
                      <Label className={isRTL ? "text-right" : "text-left"}>{t('estimatedTime')} (H)</Label>
                      <Input 
                        type="number"
                        step="0.5"
                        placeholder="1.5"
                        value={newTaskDuration}
                        onChange={(e) => setNewTaskDuration(e.target.value)}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div className="grid gap-2">
                    <Label className={isRTL ? "text-right" : "text-left"}>{t('rootTask')}</Label>
                    <select 
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                      value={newTaskParentId || ""}
                      onChange={(e) => setNewTaskParentId(e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">{t('rootTask')}</option>
                      {tasks.filter(t => !t.parentTaskId).map(t => (
                        <option key={t.taskId} value={t.taskId}>{t.title || t.description}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label className={isRTL ? "text-right" : "text-left"}>{t('dueDate')}</Label>
                    <Input 
                      type="datetime-local" 
                      value={newTaskDueDate} 
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {isManager && (
                  <div className="grid gap-2">
                    <Label className={isRTL ? "text-right" : "text-left"}>{t('assignedTo')}</Label>
                    <select 
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                      value={newTaskAssignedTo}
                      onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                    >
                      <option value="">{t('select')} {t('users')}...</option>
                      {technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>{tech.firstName} {tech.lastName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t('cancel')}</Button>
                <Button onClick={handleAddAdHocTask}>{t('createTask')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t('total'), value: kpis.total, icon: Briefcase, color: "text-primary" },
          { label: t('inProgress'), value: kpis.inProgress, icon: Timer, color: "text-amber-500" },
          { label: t('completed'), value: kpis.completed, icon: CheckCircle2, color: "text-emerald-500" },
          { label: t('overdue'), value: kpis.overdue, icon: AlertCircle, color: "text-rose-500" },
          { label: t('estDurationHrs'), value: kpis.hours, icon: Clock, color: "text-indigo-500" },
        ].map((kpi, idx) => (
          <Card key={idx} className="border-none bg-card/50 backdrop-blur-sm ring-1 ring-border">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
                <p className={cn("text-lg sm:text-xl font-black", kpi.color)}>{kpi.value}</p>
              </div>
              <div className={cn("p-2 rounded-lg bg-muted/50", kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground", isRTL ? "right-2" : "left-2")} />
          <Input 
            placeholder={t('searchWorkOrders')} 
            className={cn("bg-card/50 h-8 text-xs", isRTL ? "pr-8" : "pl-8")} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           {["all", "in_progress", "done", "blocked"].map(f => (
             <Button 
               key={f} 
               variant={filter === f ? "default" : "outline"} 
               size="sm" 
               className="capitalize"
               onClick={() => setFilter(f)}
             >
               {t(f)}
             </Button>
           ))}
        </div>
      </div>

      {/* Task Hub Integration */}
      <div className="grid gap-3 sm:gap-2 md:gap-3 lg:grid-cols-12">
        <div className="lg:col-span-12">
           <TaskExecutionHub 
             tasks={paginatedTasks} 
             isLoading={isLoading} 
             onTaskUpdate={loadData}
             isManager={isManager}
             onRescheduleRequest={openRescheduleFor}
           />
        </div>
           <PaginationControls />
        </div>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
         <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
           <DialogHeader className={isRTL ? "text-right" : "text-left"}>
             <DialogTitle>{t('rescheduleMaintenance')}</DialogTitle>
             <DialogDescription>{t('adjustingTimelinesFor')} {t('woHash')} {rescheduleWoId}</DialogDescription>
           </DialogHeader>
           <div className="grid gap-2 md:gap-3 py-3">
              <div className="grid gap-2">
                <Label className={isRTL ? "text-right" : "text-left"}>{t('startDate')}</Label>
                <Input type="datetime-local" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label className={isRTL ? "text-right" : "text-left"}>{t('dueDate')}</Label>
                <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label className={isRTL ? "text-right" : "text-left"}>{t('estDurationHrs')}</Label>
                <Input type="number" step="0.5" value={rescheduleDuration} onChange={(e) => setRescheduleDuration(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label className={isRTL ? "text-right" : "text-left"}>{t('reasonForReplanning')}</Label>
                <Input placeholder="Priority change, missing parts, etc." />
              </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>{t('cancel')}</Button>
             <Button onClick={handleReschedule}>{t('replanTask')}</Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  )
}
