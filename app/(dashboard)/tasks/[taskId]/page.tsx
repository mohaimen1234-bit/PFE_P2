"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeft, Clock, CheckSquare, History, MessageSquare, AlertTriangle, Save,
  Play, CheckCircle2, Lock, Camera, Image as ImageIcon, Timer, AlertCircle,
  Wrench, ChevronRight, Calendar, User, Briefcase, FileText, Activity,
  CheckCheck, XCircle, PauseCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { StatusBadge } from "@/components/status-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { tasksApi } from "@/lib/api/tasks"
import { TaskResponse } from "@/lib/api/types"
import { format } from "date-fns"
import { TaskTimeline } from "@/components/tasks/TaskTimeline"
import { useAuth } from "@/lib/auth-context"
import { AuthenticatedImage } from "@/components/ui/authenticated-image"
import { cn } from "@/lib/utils"

type Tab = 'steps' | 'docs' | 'data' | 'history'

export default function TaskDetailPage() {
  const { t, isRTL } = useI18n();

  const router = useRouter()
  const params = useParams<{ taskId: string }>()
  const taskId = Number(params?.taskId)
  const { user } = useAuth()

  const [task, setTask] = useState<TaskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [notes, setNotes] = useState("")
  const [actualDuration, setActualDuration] = useState("")
  const [blockedReason, setBlockedReason] = useState("")
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)

  const loadTask = async () => {
    try {
      const data = await tasksApi.getById(taskId)
      setTask(data)
      setNotes(data.notes || "")
      setActualDuration(data.actualDuration?.toString() || "")
      setBlockedReason(data.blockedReason || "")
    } catch (e) {
      console.error("Failed to load task", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (taskId) loadTask()
  }, [taskId])

  // Live timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (task?.status === 'IN_PROGRESS' && task.currentTimerStartedAt) {
      const startTime = new Date(task.currentTimerStartedAt).getTime()
      const base = task.totalTimerDuration || 0
      const tick = () => setElapsedSeconds(base + Math.floor((Date.now() - startTime) / 1000))
      tick()
      interval = setInterval(tick, 1000)
    } else if (task) {
      setElapsedSeconds(task.totalTimerDuration || 0)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [task?.status, task?.currentTimerStartedAt, task?.totalTimerDuration])

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const handleStatus = async (status: string) => {
    if (!task) return
    try {
      setIsSaving(true)
      await tasksApi.updateStatus(task.taskId, status)
      await loadTask()
    } catch (e) { 
      console.error("Task action failed:", e) 
    } finally { 
      setIsSaving(false) 
    }
  }

  const handleSave = async () => {
    if (!task) return
    try {
      setIsSaving(true)
      await tasksApi.update(task.taskId, { notes, actualDuration: actualDuration ? parseFloat(actualDuration) : null, blockedReason })
      await loadTask()
      toast({ title: t('updated') })
    } catch (e) { console.error(e) } finally { setIsSaving(false) }
  }

  const handleToggleSub = async (subId: number, completed: boolean) => {
    try {
      await tasksApi.toggleSubTask(subId, completed)
      await loadTask()
    } catch (e) { console.error(e) }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'BEFORE' | 'AFTER') => {
    const file = e.target.files?.[0]
    if (!file || !task) return
    try {
      setIsUploading(true)
      await tasksApi.uploadPhoto(task.taskId, file, type)
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsUploading(false) }
  }

  const handlePhotoDelete = async (photoId: number) => {
    if (!task) return
    try {
      setIsUploading(true)
      await tasksApi.deletePhoto(task.taskId, photoId)
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsUploading(false) }
  }

  const handleApproval = async (status: 'APPROVED' | 'REJECTED') => {
    if (!task) return
    try {
      setIsSaving(true)
      await tasksApi.approve(task.taskId, status)
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsSaving(false) }
  }

  const handleReplanRequest = async (reason: string) => {
    if (!task || !reason) return
    try {
      setIsSaving(true)
      await tasksApi.replanRequest(task.taskId, reason)
      await loadTask()
      setBlockedReason("")
    } catch (e) { console.error(e) } finally { setIsSaving(false) }
  }

  const handleApproveReplan = async (status: 'APPROVED' | 'REJECTED') => {
    if (!task) return
    try {
      setIsSaving(true)
      await tasksApi.approveReplan(task.taskId, status)
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsSaving(false) }
  }

  const handleDirectReplan = async (reason?: string) => {
    if (!task) return
    try {
      setIsSaving(true)
      await tasksApi.replan(task.taskId, reason)
      await loadTask()
    } catch (e) { console.error(e) } finally { setIsSaving(false) }
  }

  const statusConfig = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'DONE': case 'PASS': return { color: 'bg-emerald-600', label: t('completed'), icon: <CheckCircle2 className="h-4 w-4" /> }
      case 'IN_PROGRESS': return { color: 'bg-blue-600', label: t('executing'), icon: <Timer className="h-4 w-4" /> }
      case 'BLOCKED': return { color: 'bg-rose-600', label: t('blocked'), icon: <AlertTriangle className="h-4 w-4" /> }
      case 'FAIL': return { color: 'bg-rose-50', label: t('failed'), icon: <XCircle className="h-4 w-4 text-rose-600" /> }
      default: return { color: 'bg-slate-500', label: t('pending'), icon: <Clock className="h-4 w-4" /> }
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-2 md:gap-3">
        <div className="h-8 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium text-xs">{t('loadingTaskDetails')}</p>
      </div>
    </div>
  )

  if (!task) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-rose-500 font-semibold">{t('taskNotFound')}</p>
    </div>
  )

  const cfg = statusConfig(task.status)
  const isDone = task.status === 'DONE' || task.status === 'PASS'
  const isPendingApproval = task.approvalStatus === 'PENDING'
  const isReplanRequested = task.approvalStatus === 'REPLAN_REQUESTED'
  const isInProgress = task.status === 'IN_PROGRESS'
  const isManager = user?.hasRole('ADMIN', 'MAINTENANCE_MANAGER')
  const isTechnician = user?.hasRole('TECHNICIAN')

  const getPhotoForType = (type: 'BEFORE' | 'AFTER') => {
    return task.photos?.find(p => p.type === type)
  }

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* TOP HEADER: BREADCRUMBS & TITLE & TIMER */}
      <div className={cn("flex flex-col lg:flex-row lg:items-start justify-between gap-2 md:gap-3", isRTL && "lg:flex-row-reverse")}>
        <div className="space-y-3 lg:space-y-4">
          <Breadcrumb>
            <BreadcrumbList className="flex-wrap">
              <BreadcrumbItem>
                <BreadcrumbLink href="/tasks" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('taskCenter')}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                {isRTL ? <ArrowLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/work-orders/${task.woId}`} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{t('workOrder')} #{task.woId}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                 {isRTL ? <ArrowLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[10px] font-bold uppercase tracking-widest text-foreground line-clamp-1 break-all">{task.title || task.description}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-1.5">
            <div className={cn("flex flex-wrap items-center gap-2", isRTL && "flex-row-reverse")}>
              <h1 className="text-lg sm:text-xl sm:text-xl lg:text-xl sm:text-2xl font-black text-foreground">{task.title || task.description}</h1>
              <Badge variant="outline" className="bg-muted text-[10px] font-bold uppercase tracking-widest border-none">{t('toDo')}</Badge>
            </div>
            <div className={cn("flex flex-wrap items-center gap-2 lg:gap-2 md:gap-3 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest", isRTL && "flex-row-reverse")}>
              <span className="flex items-center gap-1"><User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{task.assignedToName || t('unassigned')}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '--'}</span>
              <span className="flex items-center gap-1"><Wrench className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{t('priorityPriority', { priority: t(task.priority?.toLowerCase() || 'medium') })}</span>
              {task.isAdHoc && <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase">{t('adHoc')}</Badge>}
            </div>
          </div>
        </div>

        {/* TIMER CARD (Top Right / Bottom Mobile) */}
        <Card className="w-full lg:w-64 bg-muted/30 border-border/60 shadow-sm shrink-0">
          <CardContent className="p-3 flex items-center justify-between">
            <div className={cn("flex flex-col", isRTL && "text-right")}>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('activeTimer')}</span>
              <span className="text-xl sm:text-xl sm:text-2xl font-black font-mono leading-none">{fmt(elapsedSeconds)}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8 sm:h-8 sm:w-10 rounded-full border border-border bg-background shadow-sm", isInProgress && "text-blue-600 animate-pulse")}
              onClick={() => handleStatus(isInProgress ? 'TODO' : 'IN_PROGRESS')}
              disabled={isSaving}
            >
              {isInProgress ? <PauseCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className={cn("h-4 w-4 sm:h-5 sm:w-5", isRTL && "rotate-180")} />}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* KPI GRID: 5 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: t('progress'), value: `${Math.round(task.progress || 0)}%`, sub: '', icon: Activity, color: 'text-blue-500' },
          { label: t('estDuration'), value: task.estimatedDuration || '0', sub: t('hrs'), icon: Clock, color: 'text-emerald-500' },
          { label: t('checklist'), value: `${task.subTasks?.filter(s => s.isCompleted).length ?? 0} / ${task.subTasks?.length ?? 0}`, sub: '', icon: CheckSquare, color: 'text-slate-500' },
          { label: t('priority'), value: t(task.priority?.toLowerCase() || 'medium'), sub: '', icon: AlertTriangle, color: 'text-rose-500' },
          { label: t('type'), value: task.isAdHoc ? t('adHoc') : t('standard'), sub: '', icon: Briefcase, color: 'text-emerald-600' },
        ].map((kpi, i) => (
          <Card key={i} className={cn("bg-card border-border shadow-sm hover:shadow-md transition-shadow", i === 4 && "col-span-2 md:col-span-1")}>
            <CardContent className={cn("p-2 sm:p-3 flex items-center gap-2 sm:gap-3", isRTL && "flex-row-reverse")}>
              <div className={cn("rounded-full p-1.5 sm:p-2 bg-muted/50 shrink-0", kpi.color)}>
                <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className={cn("space-y-0.5 min-w-0", isRTL && "text-right")}>
                <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{kpi.label}</p>
                <p className="text-sm sm:text-lg sm:text-xl font-black text-foreground leading-none truncate">
                  {kpi.value} {kpi.sub && <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">{kpi.sub}</span>}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ACTIONS ROW */}
      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-3", isRTL && "sm:flex-row-reverse")}>
        <div className={cn("flex flex-wrap items-center gap-2 w-full sm:w-auto", isRTL && "sm:flex-row-reverse")}>
          {!isDone && (
            <>
              {!isInProgress ? (
                <Button 
                  onClick={() => handleStatus('IN_PROGRESS')} 
                  disabled={isSaving}
                  className="flex-1 sm:flex-none h-8 px-3 sm:px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-lg gap-1 sm:gap-2 shadow-sm transition-all"
                >
                  <Play className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current", isRTL && "rotate-180")} /> {t('startTimer')}
                </Button>
              ) : (
                <Button 
                  onClick={() => handleStatus('TODO')} 
                  disabled={isSaving}
                  className="flex-1 sm:flex-none h-8 px-3 sm:px-5 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] tracking-widest rounded-lg gap-1 sm:gap-2 shadow-sm"
                >
                  <PauseCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('stopTimer')}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => handleStatus('BLOCKED')} 
                disabled={isSaving}
                className="flex-1 sm:flex-none h-8 px-3 sm:px-5 border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/30 rounded-lg font-black uppercase text-[10px] tracking-widest gap-1 sm:gap-2"
              >
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('block')}
              </Button>

              {isManager && (
                <Button 
                  variant="outline" 
                  onClick={() => handleDirectReplan()} 
                  disabled={isSaving}
                  className="flex-1 sm:flex-none h-8 px-3 sm:px-5 border-primary/20 text-primary hover:bg-primary/5 rounded-lg font-black uppercase text-[10px] tracking-widest gap-1 sm:gap-2"
                  title={t('replanTaskDesc')}
                >
                  <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('replanTask')}
                </Button>
              )}

              {isTechnician && task.status === 'BLOCKED' && (
                <Button 
                  variant="outline" 
                  onClick={() => handleReplanRequest(blockedReason || "Technical constraint")} 
                  disabled={isSaving}
                  className="flex-1 sm:flex-none h-8 px-3 sm:px-5 border-amber-500 text-amber-600 hover:bg-amber-50 rounded-lg font-black uppercase text-[10px] tracking-widest gap-1 sm:gap-2"
                  title={t('requestReplanDesc')}
                >
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('replanRequest')}
                </Button>
              )}
            </>
          )}
        </div>
        {!isDone && (
          <Button 
            onClick={() => handleStatus('DONE')} 
            disabled={isSaving}
            className="w-full sm:w-auto h-8 px-3 sm:px-3 bg-success hover:bg-success/90 text-success-foreground font-black uppercase text-[10px] tracking-widest rounded-lg gap-1 sm:gap-2 shadow-sm"
          >
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('markComplete')}
          </Button>
        )}
      </div>

      {/* MIDDLE SECTION: INSTRUCTIONS & CHECKLIST (2/3) vs OBSERVATIONS (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2 p-3">
              <CardDescription className={cn("text-[10px] font-bold uppercase tracking-widest text-muted-foreground", isRTL && "text-right")}>{t('taskInstructions')}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className={cn("text-xs text-foreground leading-relaxed", isRTL && "text-right")}>{task.description || t('noInstructionsProvided')}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 p-3 bg-muted/30 border-b border-border/40">
              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Wrench className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs uppercase tracking-widest font-black text-foreground">{t('proceduralChecklist')}</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-bold text-[9px] uppercase">
                  {task.subTasks?.filter(s => s.isCompleted).length ?? 0}/{task.subTasks?.length ?? 0} {t('steps')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 text-center">
               <p className="text-xs text-muted-foreground italic">{t('noChecklistDefined')}</p>
            </CardContent>
          </Card>

          {/* EXECUTION PROOF */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3 p-3 border-b border-border/40">
              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Camera className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs uppercase tracking-widest font-black text-foreground">{t('executionProof')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                {(['BEFORE', 'AFTER'] as const).map(type => {
                  const photo = getPhotoForType(type)
                  return (
                    <div key={type} className="space-y-2">
                      <p className={cn("text-[9px] font-black uppercase tracking-widest text-muted-foreground", isRTL && "text-right")}>{type === 'BEFORE' ? t('preExecution') : t('postExecution')}</p>
                      <div 
                        className="aspect-[16/9] rounded-xl border border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center gap-2 transition-all hover:bg-muted/20 group cursor-pointer relative overflow-hidden"
                        onClick={() => {
                          if (photo) {
                            setPreviewImage({ 
                              url: `/tasks/${task.taskId}/photos/${photo.photoId}/download`, 
                              title: `${type === 'BEFORE' ? t('preExecution') : t('postExecution')}` 
                            })
                          }
                        }}
                      >
                        {photo ? (
                          <>
                            <AuthenticatedImage 
                              path={`/tasks/${task.taskId}/photos/${photo.photoId}/download`}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                className="h-8 w-8 rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePhotoDelete(photo.photoId)
                                }}
                                disabled={isUploading}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="h-8 w-10 rounded-full bg-background/80 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              {isUploading ? (
                                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Camera className="h-4 w-4 text-muted-foreground/50" />
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground">{isUploading ? t('uploading') : t('clickToUploadProof')}</p>
                            <input 
                              type="file" 
                              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                              onChange={e => handlePhotoUpload(e, type)} 
                              accept="image/*" 
                              disabled={isUploading || isDone}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-card border-border shadow-sm h-full">
            <CardHeader className="pb-3 p-3 border-b border-border/40">
              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs uppercase tracking-widest font-black text-foreground">{t('fieldObservations')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-4">
              <div className="space-y-1.5">
                <Label className={cn("text-[10px] font-black uppercase tracking-widest text-muted-foreground block", isRTL && "text-right")}>{t('blockingFactor')}</Label>
                <Input value={blockedReason} onChange={e => setBlockedReason(e.target.value)} placeholder={t('noObstaclesReported')} className={cn("bg-muted/20 border-border rounded-lg h-8 text-xs", isRTL && "text-right")} />
              </div>
              <div className="space-y-1.5 flex-1 flex flex-col">
                <Label className={cn("text-[10px] font-black uppercase tracking-widest text-muted-foreground block", isRTL && "text-right")}>{t('technicalNotes')}</Label>
                <textarea 
                  className={cn("w-full min-h-[160px] bg-muted/20 border border-border rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 flex-1", isRTL && "text-right")}
                  placeholder={t('describeFindings')}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={cn("text-[10px] font-black uppercase tracking-widest text-muted-foreground block", isRTL && "text-right")}>{t('durationOverride')}</Label>
                <div className="relative">
                  <Input value={actualDuration} onChange={e => setActualDuration(e.target.value)} placeholder={t('actualHrs')} className={cn("bg-muted/20 border-border rounded-lg h-8 text-xs font-bold", isRTL ? "pl-10 text-right" : "pr-10")} />
                  <span className={cn("absolute top-1/2 -translate-y-1/2 text-[10px] font-black text-primary", isRTL ? "left-3" : "right-3")}>{t('hrs')}</span>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full h-8 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-lg gap-2 shadow-sm">
                <Save className="h-3.5 w-3.5" /> {t('commitRecord')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>



      {/* BOTTOM SECTION: ACTIVITY LOG */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3 p-3 border-b border-border/40">
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <History className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs uppercase tracking-widest font-black text-foreground">{t('activityLog')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3">
           <TaskTimeline logs={task.auditLogs || []} />
        </CardContent>
      </Card>
      {/* Image Preview Lightbox */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/95 border-none">
          <DialogHeader className="absolute top-3 left-4 z-10">
            <DialogTitle className="text-white bg-black/50 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10 uppercase text-[10px] font-black tracking-widest">
              {previewImage?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
            {previewImage && (
              <AuthenticatedImage 
                path={previewImage.url} 
                className="max-w-full max-h-[85vh] object-contain shadow-2xl" 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
