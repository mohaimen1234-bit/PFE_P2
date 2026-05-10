"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calendar, BarChart3, Kanban } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useI18n()

  const tabs = [
    { name: t('kanbanBoard'), href: "/planning/kanban", icon: Kanban },
    { name: t('calendarView'), href: "/planning/calendar", icon: Calendar },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('planningScheduling')}</h1>
          <p className="text-muted-foreground">{t('manageWorkOrderLifecycle')}</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-muted/30 w-fit rounded-xl border border-border/50">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all",
                isActive 
                  ? "bg-background text-foreground shadow-sm border border-border/50" 
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <tab.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
              {tab.name}
            </Link>
          )
        })}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </div>
    </div>
  )
}
