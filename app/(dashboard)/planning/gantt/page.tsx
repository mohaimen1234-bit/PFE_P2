"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  addMonths,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  differenceInMinutes,
  addMinutes
} from "date-fns"
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Wrench,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import { useI18n } from "@/lib/i18n"
import { workOrdersApi } from "@/lib/api/work-orders"
import type { WorkOrderResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { getStatusColorVar, getStatusTextColorVar } from "@/lib/colors-util"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

export default function PlanningGanttPage() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth()
  const { language, t } = useI18n()
  const [workOrders, setWorkOrders] = useState<WorkOrderResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly")
  const [currentDate, setCurrentDate] = useState(new Date())

  const loadData = async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      // Use calendar endpoint or fallback to get all
      const wos = await workOrdersApi.getCalendar().catch(async () => {
        return await workOrdersApi.list()
      })
      
      // Filter out WOs without scheduled dates
      const scheduledWos = wos.filter((wo: WorkOrderResponse) => wo.plannedStart)
      setWorkOrders(scheduledWos)
    } catch (error) {
      console.error("Failed to load plans", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, isAuthLoading])

  const { timelineRange, days } = useMemo(() => {
    let start, end
    if (viewMode === "weekly") {
      start = startOfWeek(currentDate)
      end = endOfWeek(currentDate)
    } else {
      start = startOfMonth(currentDate)
      end = endOfMonth(currentDate)
    }
    
    return {
      timelineRange: { start, end },
      days: eachDayOfInterval({ start, end })
    }
  }, [currentDate, viewMode])

  const nextRange = () => {
    setCurrentDate(viewMode === "weekly" ? addDays(currentDate, 7) : addMonths(currentDate, 1))
  }

  const prevRange = () => {
    setCurrentDate(viewMode === "weekly" ? addDays(currentDate, -7) : addMonths(currentDate, -1))
  }

  // Calculate bar position and width
  const getBarLayout = (startStr: string, endStr: string | null | undefined, estimatedDuration: number | null | undefined) => {
    const start = new Date(startStr)
    const totalDays = days.length

    // fallback logic: if end is missing, compute from estimatedDuration (in mins), else assume 1 day
    let end = endStr ? new Date(endStr) : undefined
    if (!end && estimatedDuration) {
      end = addMinutes(start, estimatedDuration || 60)
    }
    if (!end) {
      end = addDays(start, 1)
    }
    
    if (end < timelineRange.start || start > timelineRange.end) return null
    if (start > end) return null

    // Clamp values
    const effectiveStart = start < timelineRange.start ? timelineRange.start : start
    const effectiveEnd = end > timelineRange.end ? addDays(timelineRange.end, 1) : end

    const diffStartStr = differenceInDays(effectiveStart, timelineRange.start)
    const diffStartMins = differenceInMinutes(effectiveStart, timelineRange.start)
    
    const diffEndMins = differenceInMinutes(effectiveEnd, effectiveStart)

    const totalPeriodMins = totalDays * 24 * 60

    const left = (diffStartMins / totalPeriodMins) * 100
    let width = (diffEndMins / totalPeriodMins) * 100
    
    // Ensure minimal viable width logic (1% or at least visible)
    if (width < 3) width = 3

    return { left, width }
  }

  const getStatusStyle = (status: string) => {
    const bgColor = getStatusColorVar(status, 'GANTT')
    const textColor = getStatusTextColorVar(status, 'GANTT')
    return {
      backgroundColor: bgColor,
      color: textColor,
      boxShadow: `0 4px 14px 0 rgba(var(--color-status-${status.toLowerCase().replace(/_/g, '-')}-rgb, 0,0,0), 0.39)`
    }
  }

  if (isAuthLoading || (isLoading && isAuthenticated)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border">
          <CardContent className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t('ganttView')}</h1>
          <p className="text-muted-foreground mt-1">{t('visualizeTimelineAn')}</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card/50 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center bg-muted/50 rounded-lg p-1">
             <Button 
               variant={viewMode === "weekly" ? "default" : "ghost"} 
               size="sm" 
               className="h-8 rounded-md px-3"
               onClick={() => setViewMode("weekly")}
             >
               {t('weekly')}
             </Button>
             <Button 
               variant={viewMode === "monthly" ? "default" : "ghost"} 
               size="sm" 
               className="h-8 rounded-md px-3"
               onClick={() => setViewMode("monthly")}
             >
               {t('monthly')}
             </Button>
          </div>
          
          <div className="h-4 w-px bg-border mx-1" />
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevRange}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium min-w-[120px] text-center">
              {viewMode === "weekly" 
                ? `${format(timelineRange.start, 'MMM d')} - ${format(timelineRange.end, 'MMM d')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextRange}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-xl ring-1 ring-border overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'].map(status => (
                  <div key={status} className="flex items-center gap-2 text-xs text-muted-foreground">
                     <div 
                       className="w-3 h-3 rounded-full" 
                       style={{ 
                         backgroundColor: getStatusColorVar(status), 
                         boxShadow: `0 0 8px rgba(var(--color-status-${status.toLowerCase().replace(/_/g, '-')}-rgb, 0,0,0), 0.5)` 
                       }} 
                     />
                     <span>{t(status.toLowerCase())}</span>
                  </div>
                ))}
              </div>
              <Badge variant="outline" className="font-mono text-[10px] hidden sm:block">
                {workOrders.length} {t('scheduledWos')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px] relative">
              {/* Timeline Header */}
              <div className="flex border-b border-border sticky top-0 bg-card/80 backdrop-blur-md z-10">
                <div className="w-64 border-r border-border p-3 bg-muted/10 shrink-0 font-bold text-xs uppercase tracking-wider">
                  {t('workOrderDetails')}
                </div>
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                  {days.map((day, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "py-3 text-[10px] text-center border-r border-border last:border-r-0 font-medium",
                        (isSameDay(day, new Date())) ? "text-primary font-bold bg-primary/5" : "text-muted-foreground"
                      )}
                    >
                      <div className="mb-0.5">{format(day, 'EEE')}</div>
                      <div>{format(day, 'd')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plans Rows */}
              <div className="divide-y divide-border">
                {workOrders.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground italic">
                    {t('noWorkOrdersSchedul')}
                  </div>
                ) : workOrders.map((wo) => {
                  const layout = getBarLayout(wo.plannedStart!, wo.plannedEnd, wo.estimatedDuration)
                  
                  return (
                    <div key={wo.woId} className="flex group hover:bg-muted/5 transition-colors relative">
                      <div className="w-64 border-r border-border p-3 shrink-0 flex flex-col justify-center gap-1">
                        <span className="text-xs font-semibold truncate group-hover:text-primary transition-colors cursor-pointer" onClick={() => window.location.href = `/work-orders/${wo.woId}`}>
                          {wo.title}
                        </span>
                        <div className="flex items-center justify-between mt-1">
                           <Badge variant="secondary" className="text-[9px] uppercase px-1.5 py-0">
                             {wo.status}
                           </Badge>
                           <span className="text-[10px] text-muted-foreground italic">
                             ID: {wo.woCode}
                           </span>
                        </div>
                      </div>
                      
                      <div className="flex-1 relative h-20">
                        {/* Day vertical grid lines */}
                        <div className="absolute inset-0 grid h-full" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                          {days.map((_, i) => (
                            <div key={i} className="border-r border-border/50 h-full last:border-r-0" />
                          ))}
                        </div>

                        {/* Current Day Indicator Line */}
                        {days.some(d => isSameDay(d, new Date())) && (
                          <div 
                            className="absolute top-0 bottom-0 w-px bg-primary z-10 shadow-[0_0_8px_rgba(var(--primary),0.8)]"
                            style={{ left: `${(differenceInMinutes(new Date(), timelineRange.start) / (days.length * 24 * 60)) * 100}%` }}
                          />
                        )}

                        {/* Task Bar */}
                        <AnimatePresence mode="wait">
                          {layout !== null && (
                            <motion.div
                              key={`${wo.woId}-${viewMode}`}
                              initial={{ scaleX: 0, opacity: 0 }}
                              animate={{ scaleX: 1, opacity: 1 }}
                              className="absolute top-1/2 -translate-y-1/2 h-8 z-20"
                              style={{ 
                                left: `${layout.left}%`, 
                                width: `calc(${layout.width}%)`
                              }}
                            >
                              <div className={`h-full w-full rounded-md flex items-center justify-center group/bar cursor-pointer relative`}
                                   style={getStatusStyle(wo.status)}
                                   onClick={() => window.location.href = `/work-orders/${wo.woId}`}
                              >
                                 <Wrench className="h-3.5 w-3.5 opacity-80" style={{ color: 'currentColor' }} />
                                 
                                 {/* Tooltip */}
                                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none z-30">
                                    <div className="bg-popover border border-border rounded-lg p-2 shadow-xl whitespace-nowrap">
                                      <p className="text-xs font-bold text-popover-foreground">{wo.title}</p>
                                      <p className="text-[10px] text-muted-foreground mt-1 text-center">
                                         Start: {format(new Date(wo.plannedStart!), 'PPp')}
                                      </p>
                                      {wo.estimatedDuration && <p className="text-[10px] text-muted-foreground text-center">Duration: {wo.estimatedDuration} min</p>}
                                    </div>
                                    <div className="w-2 h-2 bg-popover border-b border-r border-border rotate-45 mx-auto -mt-1" />
                                 </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
