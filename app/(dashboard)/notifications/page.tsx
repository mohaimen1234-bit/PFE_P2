"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertCircle, 
  Clock, 
  Info, 
  Search,
  ExternalLink,
  CalendarDays,
  BellRing
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { notificationsApi } from "@/lib/api/notifications"
import { cn } from "@/lib/utils"
import Link from "next/link"

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

export default function NotificationsPage() {
  const { t, language } = useI18n()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'WARNING' | 'RECOMMENDATION'>('ALL')

  const loadData = async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const data = await notificationsApi.getAll(user.id)
      setNotifications(data.content || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  const filteredNotifications = useMemo(() => {
    return notifications.filter(note => {
      const matchesSearch = note.message.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = filter === 'ALL' || 
                           (filter === 'UNREAD' && !note.isRead) ||
                           note.type === filter
      return matchesSearch && matchesFilter
    })
  }, [notifications, search, filter])

  const markRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch (err) {}
  }

  const markAllRead = async () => {
    if (!user?.id) return
    try {
      await notificationsApi.markAllAsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (err) {}
  }

  const clearNotification = async (id: number) => {
    try {
      await notificationsApi.delete(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) {}
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <AlertCircle className="h-5 w-5 text-amber-500" />
      case 'RECOMMENDATION': return <Clock className="h-5 w-5 text-indigo-500" />
      default: return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getLink = (note: any) => {
    if (note.message.toLowerCase().includes('work order')) {
      return `/work-orders/${note.referenceId}`
    }
    if (note.message.toLowerCase().includes('inventory') || note.message.toLowerCase().includes('stock')) {
      return `/inventory`
    }
    return null
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden" 
      animate="show" 
      className="flex-1 space-y-6 max-w-5xl mx-auto pb-10"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border/50 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10">
              <BellRing className="h-6 w-6 text-primary" />
            </div>
            {t('notifications')}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-xl">
            {t('reviewYourHistoricAl')}
          </p>
        </div>
        <Button 
          variant="default" 
          onClick={markAllRead} 
          className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <CheckCheck className="h-4 w-4" />
          {t('markAllAsRead')}
        </Button>
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-center gap-4 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t('search')} 
            className="pl-11 h-12 rounded-xl bg-muted/50 border-transparent focus:bg-background transition-colors text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
           {['ALL', 'UNREAD', 'WARNING', 'RECOMMENDATION'].map((f) => (
             <Button
                key={f}
                variant={filter === f ? 'default' : 'secondary'}
                onClick={() => setFilter(f as any)}
                className={cn(
                  "rounded-full px-5 transition-all",
                  filter === f ? "shadow-md" : "hover:bg-muted"
                )}
             >
                {f === 'ALL' ? t('all') : f === 'UNREAD' ? 'Unread' : f}
             </Button>
           ))}
        </div>
      </motion.div>

      {/* Notifications List */}
      <motion.div variants={itemVariants}>
        <Card className="border border-border/50 shadow-sm rounded-3xl overflow-hidden bg-card/40 backdrop-blur-md">
          <CardContent className="p-0">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-32 gap-4">
                 <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/>
                 <p className="text-muted-foreground font-medium animate-pulse">{t('loading')}</p>
               </div>
            ) : filteredNotifications.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-32 text-center px-4">
                 <div className="w-20 h-20 mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                   <Bell className="h-10 w-10 text-muted-foreground opacity-30" />
                 </div>
                 <h3 className="text-xl font-semibold mb-2 text-foreground">{t('noDataForSelected') || 'No notifications found'}</h3>
                 <p className="text-muted-foreground max-w-sm">
                   You are all caught up! There are no new alerts or recommendations matching your criteria.
                 </p>
               </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/40">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map((note) => (
                    <motion.div
                      layout
                      key={note.id}
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "p-5 md:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 group relative transition-all duration-300",
                        !note.isRead ? "bg-primary/[0.03] hover:bg-primary/[0.05]" : "hover:bg-muted/40"
                      )}
                    >
                      <div className="flex gap-4 md:gap-5 flex-1 w-full">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/10 dark:border-white/5",
                          note.type === 'WARNING' ? "bg-gradient-to-br from-amber-100 to-amber-200/50 dark:from-amber-900/40 dark:to-amber-900/20" :
                          note.type === 'RECOMMENDATION' ? "bg-gradient-to-br from-indigo-100 to-indigo-200/50 dark:from-indigo-900/40 dark:to-indigo-900/20" : 
                          "bg-gradient-to-br from-blue-100 to-blue-200/50 dark:from-blue-900/40 dark:to-blue-900/20"
                        )}>
                          {getIcon(note.type)}
                        </div>
                        <div className="flex flex-col gap-2 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 md:gap-3">
                             {!note.isRead && (
                               <span className="flex h-2 w-2 rounded-full bg-primary" />
                             )}
                             <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-6 px-2.5 border-border/60 bg-background/50 backdrop-blur-sm">
                               {note.type}
                             </Badge>
                             <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                               <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                               {new Date(note.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US', {
                                 dateStyle: 'medium',
                                 timeStyle: 'short'
                               })}
                             </span>
                          </div>
                          <p className={cn(
                            "text-sm md:text-base leading-relaxed break-words",
                            !note.isRead ? "font-semibold text-foreground" : "text-foreground/80 font-medium"
                          )}>
                            {note.message}
                          </p>
                          {getLink(note) && (
                            <Link href={getLink(note)!} className="mt-1 inline-block">
                              <Button variant="link" size="sm" className="h-auto p-0 text-primary text-sm font-semibold gap-1.5 hover:text-primary/80 transition-colors">
                                <ExternalLink className="h-3.5 w-3.5" />
                                {t('viewDetails')}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-full sm:w-auto justify-end pt-2 sm:pt-0">
                         {!note.isRead && (
                            <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl bg-background/50 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 transition-colors" onClick={() => markRead(note.id)}>
                               <CheckCheck className="h-5 w-5" />
                            </Button>
                         )}
                         <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl bg-background/50 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors" onClick={() => clearNotification(note.id)}>
                            <Trash2 className="h-5 w-5" />
                         </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
