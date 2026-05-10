"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Mic, MicOff, RotateCcw, Copy, Check, ChevronRight, Wrench, Activity, Zap, AlertTriangle, Clock, MessageSquare, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

const VICTORIA_NAME = "Victoria"

const UI = {
  en: {
    greeting: (n: string) => `Welcome back, ${n}`,
    sub: "How can I assist your maintenance operations today?",
    placeholder: "Ask Victoria anything…",
    newChat: "New Chat",
    history: "Recent",
    topics: "Quick Actions",
    thinking: "Victoria is thinking…",
    copy: "Copy", copied: "Copied!",
    powered: "Powered by Victoria AI · CareSys",
    q1: "Critical alerts",
    q1d: "Analyze health",
    q2: "Overdue tasks",
    q2d: "Review backlog",
    q3: "Low stock",
    q3d: "Inventory check",
    q4: "Today's plan",
    q4d: "Planned work",
    q5: "Predict failures",
    q6: "KPI report",
    demoReply: (q: string) => `I've analyzed your request: "${q}"\n\nBased on the CareSys database, I can provide insights on work orders, equipment health, inventory levels, and predictive maintenance. Connect the backend API to receive real-time data and intelligent recommendations tailored to your hospital's maintenance operations.`,
    histItems: ["Critical alerts", "Work order analysis", "Inventory report"],
  },
  fr: {
    greeting: (n: string) => `Bon retour, ${n}`,
    sub: "Comment puis-je vous aider dans vos opérations de maintenance ?",
    placeholder: "Demandez à Victoria n'importe quoi…",
    newChat: "Nouvelle conversation",
    history: "Récent",
    topics: "Actions rapides",
    thinking: "Victoria réfléchit…",
    copy: "Copier", copied: "Copié !",
    powered: "Propulsé par Victoria AI · CareSys",
    q1: "Alertes critiques",
    q1d: "Analyser santé",
    q2: "Tâches retard",
    q2d: "Réviser backlog",
    q3: "Stock bas",
    q3d: "Vérifier inventaire",
    q4: "Plan du jour",
    q4d: "Travail planifié",
    q5: "Prédire défaillances",
    q6: "Rapport KPI",
    demoReply: (q: string) => `J'ai analysé votre demande : "${q}"\n\nEn me basant sur la base de données CareSys, je peux fournir des informations sur les ordres de travail, la santé des équipements et la maintenance prédictive. Connectez l'API backend pour recevoir des données en temps réel.`,
    histItems: ["Alertes critiques", "Analyse ordres", "Rapport inventaire"],
  },
  ar: {
    greeting: (n: string) => `مرحباً بعودتك، ${n}`,
    sub: "كيف يمكنني مساعدتك في عمليات الصيانة اليوم؟",
    placeholder: "اسأل فيكتوريا أي شيء…",
    newChat: "محادثة جديدة",
    history: "الأخيرة",
    topics: "إجراءات سريعة",
    thinking: "فيكتوريا تفكر…",
    copy: "نسخ", copied: "تم النسخ!",
    powered: "مدعوم بـ Victoria AI · CareSys",
    q1: "تنبيهات حرجة",
    q1d: "تحليل الصحة",
    q2: "مهام متأخرة",
    q2d: "مراجعة المتراكم",
    q3: "مخزون منخفض",
    q3d: "فحص المخزون",
    q4: "خطة اليوم",
    q4d: "العمل المخطط",
    q5: "توقع الأعطال",
    q6: "تقرير الأداء",
    demoReply: (q: string) => `لقد قمت بتحليل طلبك: "${q}"\n\nبناءً على قاعدة بيانات CareSys، يمكنني تقديم رؤى حول أوامر العمل وصحة المعدات ومستويات المخزون والصيانة التنبؤية. قم بتوصيل واجهة برمجة التطبيقات للحصول على بيانات في الوقت الفعلي.`,
    histItems: ["تنبيهات حرجة", "تحليل الأوامر", "تقرير المخزون"],
  },
}

type Lang = "en" | "fr" | "ar"
interface Msg { id: string; role: "user" | "assistant"; content: string; ts: Date; typing?: boolean }

const ACTIONS = [
  { key: "q1" as const, dk: "q1d" as const, icon: AlertTriangle, bg: "bg-rose-500/10 dark:bg-rose-500/15", border: "border-rose-200 dark:border-rose-800", text: "text-rose-600 dark:text-rose-400" },
  { key: "q2" as const, dk: "q2d" as const, icon: Wrench,        bg: "bg-violet-500/10 dark:bg-violet-500/15", border: "border-violet-200 dark:border-violet-800", text: "text-violet-600 dark:text-violet-400" },
  { key: "q3" as const, dk: "q3d" as const, icon: Zap,           bg: "bg-amber-500/10 dark:bg-amber-500/15", border: "border-amber-200 dark:border-amber-800", text: "text-amber-600 dark:text-amber-400" },
  { key: "q4" as const, dk: "q4d" as const, icon: Activity,      bg: "bg-emerald-500/10 dark:bg-emerald-500/15", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-600 dark:text-emerald-400" },
]

function VictoriaOrb({ small = false }: { small?: boolean }) {
  return (
    <div className={cn("relative mx-auto flex items-center justify-center transition-all duration-700", small ? "w-10 h-10" : "w-32 h-32")}>
      {/* Siri-style background glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500/30 via-fuchsia-500/30 to-cyan-400/30 blur-2xl"
        animate={{
          scale: [1, 1.4, 1],
          rotate: [0, 180, 0],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Floating morphing orb core */}
      <motion.div
        className="relative w-full h-full flex items-center justify-center"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Layered gradients for depth - Color shifting core */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-500 to-purple-600 shadow-[0_0_30px_rgba(139,92,246,0.5)]"
          animate={{
            borderRadius: ["42% 58% 70% 30% / 45% 45% 55% 55%", "58% 42% 35% 65% / 55% 55% 45% 45%", "42% 58% 70% 30% / 45% 45% 55% 55%"],
            rotate: [0, 360],
            backgroundColor: ["#4f46e5", "#9333ea", "#06b6d4", "#4f46e5"]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Surface reflection */}
        <motion.div
          className="absolute inset-[10%] bg-gradient-to-tl from-white/20 to-transparent blur-sm"
          animate={{
            borderRadius: ["50% 50% 70% 30%", "30% 70% 50% 50%", "50% 50% 70% 30%"],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Dynamic Inner Glow */}
        <motion.div
          className="absolute inset-[20%] bg-cyan-300 blur-md opacity-20"
          animate={{
            scale: [0.7, 1.3, 0.7],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* V Monogram */}
        <div className="relative z-10 flex items-center justify-center">
          <span className={cn("font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] select-none tracking-tighter", small ? "text-sm" : "text-3xl")}>
            V
          </span>
        </div>
      </motion.div>

      {/* Orbiting particles (subtle) */}
      {!small && [0, 120, 240].map((angle, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/30 blur-[1px]"
          animate={{
            rotate: [angle, angle + 360],
            scale: [0.5, 1.2, 0.5],
            opacity: [0.1, 0.4, 0.1]
          }}
          transition={{ duration: 10 + i, repeat: Infinity, ease: "linear" }}
          style={{ width: '130%', height: '130%', originX: '50%', originY: '50%' }}
        />
      ))}
    </div>
  )
}



function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4 px-1">
      {[0,1,2].map(i => (
        <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400"
          animate={{ y: [0, -4, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  )
}

function Bubble({ msg, isRTL, lang, ui }: { msg: Msg; isRTL: boolean; lang: Lang; ui: typeof UI["en"] }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === "user"
  const copy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={cn("flex gap-2 group mb-1", isUser ? (isRTL ? "flex-row" : "flex-row-reverse") : "flex-row")}>
      {!isUser && (
        <div className="shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20 mt-0.5">
          <span className="text-[9px] font-black text-white">V</span>
        </div>
      )}
      {isUser && (
        <div className="shrink-0 w-6 h-6 rounded-lg bg-gray-900 dark:bg-gray-100 flex items-center justify-center mt-0.5">
          <span className="text-[9px] font-bold text-white dark:text-gray-900">U</span>
        </div>
      )}
      <div className={cn("flex flex-col gap-0 max-w-[90%]", isUser ? (isRTL ? "items-start" : "items-end") : "items-start")}>
        {!isUser && <span className="text-[8px] font-black text-violet-500 dark:text-violet-400 px-1 uppercase tracking-widest leading-none mb-0.5">{VICTORIA_NAME}</span>}
        <div className={cn("px-2.5 py-1.5 rounded-xl text-[12px] leading-snug whitespace-pre-wrap shadow-sm",
          isUser
            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-tr-sm"
            : "bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 text-gray-800 dark:text-gray-100 rounded-tl-sm backdrop-blur-sm"
        )} dir={isRTL ? "rtl" : "ltr"}>
          {msg.typing ? <TypingDots /> : msg.content}
        </div>
        {!msg.typing && !isUser && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1 mt-0.5">
            <button onClick={copy} className="flex items-center gap-1 text-[8px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              {copied ? <Check className="w-2 h-2" /> : <Copy className="w-2 h-2" />}
              {copied ? ui.copied : ui.copy}
            </button>
          </div>
        )}
        <span className="text-[7px] text-gray-400 dark:text-gray-600 px-1 font-black uppercase tracking-tighter mt-0.5">
          {msg.ts.toLocaleTimeString(lang === "ar" ? "ar-EG" : lang === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  )
}


export default function ChatbotPage() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER, ROLES.FINANCE_MANAGER]}>
      <ChatbotPageContent />
    </RouteGuard>
  )
}

function ChatbotPageContent() {
  const { language, isRTL } = useI18n()
  const { user } = useAuth()
  const lang = (language as Lang) in UI ? (language as Lang) : "en"
  const ui = UI[lang]
  const name = user?.name?.split(" ")[0] ?? "User"

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [mic, setMic] = useState(false)
  const [welcome, setWelcome] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs])
  useEffect(() => {
    const el = taRef.current; if (!el) return
    el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }, [input])

  const send = useCallback(async (text: string) => {
    const t = text.trim(); if (!t || loading) return
    setWelcome(false); setInput("")
    const uid = Date.now() + "-u"
    const tid = Date.now() + "-t"
    setMsgs(p => [...p,
      { id: uid, role: "user", content: t, ts: new Date() },
      { id: tid, role: "assistant", content: "", ts: new Date(), typing: true }
    ])
    setLoading(true)
    await new Promise(r => setTimeout(r, 1400))
    setMsgs(p => [...p.filter(m => m.id !== tid),
      { id: Date.now() + "-a", role: "assistant", content: ui.demoReply(t), ts: new Date() }
    ])
    setLoading(false)
  }, [loading, ui])

  const reset = () => { setMsgs([]); setWelcome(true); setInput("") }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-[#020617] overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── Sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: isRTL ? 260 : -260 }}
            animate={{ x: 0 }}
            exit={{ x: isRTL ? 260 : -260 }}
            className={cn(
              "fixed inset-y-0 z-50 lg:relative lg:z-0 flex flex-col w-64 shrink-0 bg-white/70 dark:bg-[#020617]/70 backdrop-blur-3xl border-gray-200 dark:border-white/5 shadow-2xl lg:shadow-none",
              isRTL ? "right-0 border-l" : "left-0 border-r"
            )}
          >
            <div className="flex flex-col h-full p-4">
              {/* Sidebar Header & New Chat */}
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <span className="text-[11px] font-black text-white">V</span>
                    </div>
                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">{VICTORIA_NAME}</span>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    <ChevronRight className={cn("w-4 h-4", isRTL ? "rotate-0" : "rotate-180")} />
                  </button>
                </div>

                <button onClick={reset} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-900/10 dark:shadow-white/5">
                  <Plus className="w-3.5 h-3.5" />
                  {ui.newChat}
                </button>
              </div>

              {/* History List */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2 custom-scrollbar">
                <div>
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-2 mb-3">{ui.history}</p>
                  <div className="space-y-1">
                    {ui.histItems.map((item, i) => (
                      <button key={i} className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group relative overflow-hidden",
                        i === 0 ? "bg-violet-500/10 dark:bg-violet-500/5 text-violet-600 dark:text-violet-400" : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400"
                      )}>
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="text-[11px] font-bold truncate tracking-tight">{item}</span>
                        {i === 0 && <div className="absolute inset-y-0 left-0 w-1 bg-violet-500 rounded-full" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="pt-4 mt-auto border-t border-gray-100 dark:border-white/5">
                <div className="group flex items-center gap-3 p-2.5 rounded-2xl bg-gray-100/50 dark:bg-white/5 border border-transparent hover:border-violet-500/30 transition-all cursor-pointer">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5 flex items-center justify-center shrink-0 shadow-inner">
                    <span className="text-[12px] font-black text-gray-700 dark:text-white">{name[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">{name}</p>
                    <p className="text-[9px] text-violet-500 font-black uppercase tracking-[0.1em]">Verified Pro</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 relative bg-white dark:bg-[#020617]">
        {/* Background Decorative Elements - Stealthier for Dark Mode */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] bg-violet-500/5 dark:bg-violet-600/3 blur-[140px] rounded-full" />
          <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] bg-indigo-500/5 dark:bg-indigo-600/3 blur-[140px] rounded-full" />
        </div>

        {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-md z-40" onClick={() => setSidebarOpen(false)} />}

        {/* Floating Controls (since header is removed) */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 rounded-xl text-gray-500 hover:text-violet-500 transition-all shadow-sm">
            <MessageSquare className="w-4 h-4" />
          </button>
          {!welcome && (
            <button onClick={reset}
              className="p-2 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 rounded-xl text-gray-400 hover:text-violet-500 transition-all shadow-sm">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Main Content */}
        <main className={cn("flex-1 px-4 sm:px-8 py-4 scrollbar-hide relative", welcome ? "overflow-hidden" : "overflow-y-auto")}>
          <AnimatePresence mode="wait">
            {welcome ? (
              <motion.div 
                key="welcome"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col items-center justify-center gap-4 h-full max-h-[85vh] py-2"
              >
                {/* Hero Section */}
                <div className="text-center space-y-2 relative scale-90">
                  <div className="relative inline-block scale-90">
                    <VictoriaOrb />
                    <motion.div 
                      className="absolute -inset-4 bg-violet-500/10 blur-3xl rounded-full"
                      animate={{ opacity: [0.2, 0.4, 0.2] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-tight">
                      {ui.greeting(name)}
                    </h2>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium max-w-[240px] mx-auto leading-tight tracking-tight opacity-70">
                      {ui.sub}
                    </p>
                  </div>
                </div>

                {/* Quick Actions Grid - More Compact */}
                <div className="w-full max-w-lg grid grid-cols-2 gap-2 px-4 scale-95 origin-center">
                  {ACTIONS.map(({ key, dk, icon: Icon, bg, border, text }, idx) => (
                    <motion.button 
                      key={key} 
                      onClick={() => send(ui[key])}
                      className={cn(
                        "group relative flex items-center gap-2.5 p-2.5 rounded-xl border transition-all hover:scale-[1.02] hover:bg-white dark:hover:bg-white/[0.05] text-left overflow-hidden bg-gray-50/50 dark:bg-white/[0.01]",
                        border
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ring-1 shadow-md group-hover:scale-110 transition-transform", border, bg)}>
                        <Icon className={cn("w-4 h-4", text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[10px] font-black uppercase tracking-tight leading-none", text)}>{ui[key]}</p>
                        <p className="text-[8px] text-gray-400 dark:text-gray-500 font-medium uppercase mt-0.5 tracking-tighter opacity-60 truncate">{ui[dk]}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="max-w-3xl mx-auto w-full space-y-4 pt-12 pb-24">
                <AnimatePresence initial={false}>
                  {msgs.map(msg => <Bubble key={msg.id} msg={msg} isRTL={isRTL} lang={lang} ui={ui} />)}
                </AnimatePresence>
                <div ref={bottomRef} className="h-4" />
              </div>
            )}
          </AnimatePresence>
        </main>

        {/* Input Bar Overlay - Deepened for Dark Mode */}
        <div className="shrink-0 px-4 py-4 bg-gradient-to-t from-white dark:from-[#020617] via-white/90 dark:via-[#020617]/90 to-transparent z-40">
          <form onSubmit={e => { e.preventDefault(); send(input) }} className="max-w-2xl mx-auto">
            {/* Context Pills */}
            <AnimatePresence>
              {welcome && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }}
                  className="flex flex-wrap gap-2 justify-center mb-5">
                  {([ui.q5, ui.q6] as string[]).map((q) => (
                    <button key={q} onClick={() => send(q)}
                      className="px-4 py-1.5 rounded-full text-[10px] font-black bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:border-violet-500 hover:text-violet-500 transition-all shadow-sm uppercase tracking-widest backdrop-blur-md">
                      {q}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Smart Input Box */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
              <div className="relative flex items-end gap-2 p-2 bg-white dark:bg-[#0d0d15] border border-gray-200 dark:border-white/5 rounded-2xl shadow-2xl">
                <button type="button" onClick={() => setMic(v => !v)}
                  className={cn("shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    mic ? "bg-rose-500 text-white shadow-lg"
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5")}>
                  {mic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <textarea 
                  ref={taRef} 
                  value={input} 
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }}
                  placeholder={ui.placeholder} 
                  rows={1} 
                  dir={isRTL ? "rtl" : "ltr"}
                  className={cn(
                    "flex-1 resize-none bg-transparent px-2 py-2.5 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none leading-relaxed min-h-[40px]", 
                    isRTL ? "text-right" : "text-left"
                  )}
                  style={{ maxHeight: 150 }} 
                />

                <button type="submit" disabled={!input.trim() || loading}
                  className={cn("shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95",
                    input.trim() && !loading
                      ? "bg-violet-600 text-white shadow-xl hover:bg-violet-500"
                      : "bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-gray-700 cursor-not-allowed")}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 opacity-50">
               <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gray-200 dark:to-white/5" />
               <p className="text-[7px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-[0.5em] whitespace-nowrap">{ui.powered}</p>
               <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gray-200 dark:to-white/5" />
            </div>
          </form>
        </div>
      </div>


    </div>
  )
}
