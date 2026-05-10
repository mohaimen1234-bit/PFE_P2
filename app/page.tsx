"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock,
  Cpu,
  Database,
  FileText,
  Gauge,
  Heart,
  LineChart,
  Package,
  Settings,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
  Zap,
  Globe,
  Monitor,
  Lock,
  Layers,
  QrCode,
  LayoutDashboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n, LanguageSwitcher } from "@/lib/i18n"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { Logo } from "@/components/ui/logo"
import { AnimatedSection, AnimatedCard, StaggerContainer, fadeInUpItem, BlurFade, FadeInView, ScaleOnHover } from "@/components/ui/motion-fade"

export default function LandingPage() {
  const { t, language, isRTL } = useI18n()

  const coreModules = [
    {
      icon: Database,
      title: t("equipmentRegistry"),
      description: t("equipmentRegistryDesc"),
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      icon: AlertTriangle,
      title: t("incidentWorkflow"),
      description: t("incidentWorkflowDesc"),
      color: "bg-amber-500/10 text-amber-600",
    },
    {
      icon: Wrench,
      title: t("workOrderManagement"),
      description: t("workOrderManagementDesc"),
      color: "bg-indigo-500/10 text-indigo-600",
    },
    {
      icon: Calendar,
      title: t("planningCalendar"),
      description: t("planningCalendarDesc"),
      color: "bg-emerald-500/10 text-emerald-600",
    },
    {
      icon: Package,
      title: t("sparePartsStock"),
      description: t("sparePartsStockDesc"),
      color: "bg-rose-500/10 text-rose-600",
    },
    {
      icon: QrCode,
      title: t("qrCodes") || "QR Codes",
      description: t("qrCodesDesc") || "Quickly identify equipment and access history by scanning secure QR codes.",
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      icon: BarChart3,
      title: t("biDashboards"),
      description: t("biDashboardsDesc"),
      color: "bg-cyan-500/10 text-cyan-600",
    },
    {
      icon: Brain,
      title: t("aiFailureAnalysis") || "AI Failure Analysis",
      description: t("aiFailureAnalysisDesc") || "Detect patterns in equipment failures and receive intelligent recommendations.",
      color: "bg-primary/10 text-primary",
    },
  ]

  const kpis = [
    {
      label: t("mtbf"),
      fullLabel: t("mtbfFull"),
      value: "720",
      unit: t("hours"),
      trend: "+12%",
      icon: Clock,
    },
    {
      label: t("mttr"),
      fullLabel: t("mttrFull"),
      value: "4.5",
      unit: t("hours"),
      trend: "-18%",
      icon: Wrench,
    },
    {
      label: t("availabilityRate"),
      fullLabel: t("availabilityRate"),
      value: "98.5",
      unit: "%",
      trend: "+2.3%",
      icon: Target,
    },
    {
      label: t("correctivePreventiveRatio"),
      fullLabel: t("correctivePreventiveRatio"),
      value: "35/65",
      unit: "%",
      trend: "-5%",
      icon: Activity,
    },
    {
      label: t("maintenanceCostEquipment"),
      fullLabel: t("maintenanceCostEquipment"),
      value: "$2,450",
      unit: "/year",
      trend: "-8%",
      icon: TrendingUp,
    },
    {
      label: t("slaCompliance") || "SLA Compliance",
      fullLabel: t("slaCompliance") || "SLA Compliance",
      value: "99.2",
      unit: "%",
      trend: "+1.5%",
      icon: Shield,
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10" dir={isRTL ? "rtl" : "ltr"}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />

          <div className="hidden items-center gap-8 lg:flex">
            {[
              { href: "#platform", label: t("platform") || "Platform" },
              { href: "#modules", label: t("modules") || "Modules" },
              { href: "#ai", label: t("ai") || "AI" },
              { href: "#victoria", label: "Victoria" },
              { href: "#kpis", label: t("kpis") || "KPIs" },
              { href: "#security", label: t("security") || "Security" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" className="text-sm font-medium">
                {t("signIn")}
              </Button>
            </Link>

          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-48 sm:pb-32">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-[20%] -left-[5%] h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left lg:col-span-6">
              <BlurFade delay={0.1}>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("aiPoweredMaintenance")}</span>
                </div>
              </BlurFade>

              <BlurFade delay={0.2}>
                <h1 className="text-balance-tight text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  {t("heroTitle")}
                </h1>
              </BlurFade>

              <BlurFade delay={0.3}>
                <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl lg:max-w-xl">
                  {t("heroSubtitle")}
                </p>
              </BlurFade>

              <BlurFade delay={0.4}>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">

                  <Link href="/dashboard" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="h-12 w-full px-8 rounded-full">
                      {t("exploreDashboard")}
                    </Button>
                  </Link>
                </div>
              </BlurFade>

              {/* Trusted Metrics */}
              <BlurFade delay={0.5}>
                <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:max-w-lg border-t border-border/50 pt-8">
                  {[
                    { value: "500+", label: t("equipmentManaged") || "Equipment" },
                    { value: "99.9%", label: t("uptime") || "Uptime" },
                    { value: "40%", label: t("downtimeReduction") || "Less Downtime" },
                    { value: "3", label: t("languagesSupported") || "Languages" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center lg:text-left">
                      <div className="text-xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </BlurFade>
            </div>

            {/* Right Mockup */}
            <div className="mt-16 lg:mt-0 lg:col-span-6 relative">
              <BlurFade delay={0.6}>
                <div className="relative mx-auto max-w-[600px] aspect-[16/10] z-10">
                  {/* Main Dashboard Window (Clipped) */}
                  <div className="h-full w-full rounded-2xl border border-border bg-card shadow-2xl overflow-hidden relative">
                    {/* Fake UI header */}
                    <div className="h-8 border-b border-border/50 bg-muted/30 flex items-center px-4 gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-border" />
                      <div className="w-2 h-2 rounded-full bg-border" />
                      <div className="w-2 h-2 rounded-full bg-border" />
                    </div>
                    {/* Fake Dashboard Content */}
                    <div className="p-4 space-y-4">
                      <div className="flex gap-4">
                        <div className="h-24 flex-1 rounded-xl bg-muted/40" />
                        <div className="h-24 flex-1 rounded-xl bg-muted/40" />
                        <div className="h-24 flex-1 rounded-xl bg-muted/40" />
                      </div>
                      <div className="h-40 rounded-xl bg-muted/20 flex items-center justify-center">
                        <div className="w-3/4 h-2/3 flex items-end gap-2 px-4">
                          {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                            <div key={i} className="flex-1 bg-primary/20 rounded-t-md" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Elements (Not Clipped) */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="absolute top-10 -right-6 sm:-right-12 bg-card border border-border p-3 rounded-xl shadow-xl flex items-center gap-3 w-44 z-20"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Brain className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase leading-none">{t("aiPrediction")}</div>
                      <div className="text-xs font-semibold mt-0.5">{t("highRiskFailure")}</div>
                    </div>
                  </motion.div>

                  <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-10 -left-6 sm:-left-12 bg-card border border-border p-3 rounded-xl shadow-xl flex items-center gap-3 w-48 z-20"
                  >
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase leading-none">{t("taskComplete")}</div>
                      <div className="text-xs font-semibold mt-0.5">{t("ventilatorCalibration")}</div>
                    </div>
                  </motion.div>

                  <motion.div 
                    animate={{ x: [0, -5, 0], y: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.5 }}
                    className="absolute -top-6 left-1/4 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-30"
                  >
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-tight whitespace-nowrap">{t("workOrderGenerated")}</span>
                  </motion.div>
                </div>
              </BlurFade>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Overview */}
      <section id="platform" className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("oneCmmsWorkspace")}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t("oneCmmsWorkspaceDesc")}
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection lines (desktop only) */}
            <div className="hidden md:block absolute top-1/2 left-[30%] right-[30%] h-px bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 -z-10" />
            
            {[
              { 
                icon: Monitor, 
                title: t("equipmentRegistry"), 
                desc: t("equipmentRegistryDesc")
              },
              { 
                icon: Layers, 
                title: t("workOrderAutomation"), 
                desc: t("workOrderAutomationDesc")
              },
              { 
                icon: LineChart, 
                title: t("aiPrioritization"), 
                desc: t("aiPrioritizationDesc")
              },
            ].map((item, i) => (
              <AnimatedCard key={item.title} delay={i * 0.1}>
                <div className="flex flex-col items-center text-center p-8 bg-card rounded-3xl border border-border h-full shadow-sm">
                  <div className="mb-6 h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                    <item.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Core Modules Section */}
      <section id="modules" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("coreModules") || "Core Modules"}</h2>
              <p className="mt-4 text-muted-foreground text-lg">
                {t("coreModulesDesc")}
              </p>
            </div>
            <Link href="/login">
              <Button variant="link" className="group p-0 h-auto font-bold">
                {t("viewAllModules")} <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreModules.map((module) => (
              <motion.div key={module.title} variants={fadeInUpItem}>
                <Card className="group h-full border-border/60 hover:border-primary/50 hover:shadow-xl transition-all duration-300 rounded-2xl">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 ${module.color} transition-transform group-hover:scale-110`}>
                      <module.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold mb-3">{module.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {module.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* AI Workflow Section */}
      <section id="ai" className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <BlurFade>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 text-primary-foreground text-xs font-bold uppercase tracking-widest mb-8">
                  <Zap className="h-4 w-4" /> {t("aiWorkflow")}
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl lg:leading-tight">
                  {t("intelligentMaintenance")}
                </h2>
                <p className="mt-6 text-primary-foreground/80 text-lg leading-relaxed">
                  {t("intelligentMaintenanceDesc")}
                </p>
                
                <div className="mt-10 space-y-6">
                  {[
                    { title: t("predictHighRisk"), desc: t("predictHighRiskDesc") },
                    { title: t("prioritizeInterventions"), desc: t("prioritizeInterventionsDesc") },
                    { title: t("reduceDowntime"), desc: t("reduceDowntimeDesc") },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0 mt-1">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold">{item.title}</h4>
                        <p className="text-sm text-primary-foreground/70 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </BlurFade>
            </div>
            
            <div className="mt-16 lg:mt-0">
              <BlurFade delay={0.2}>
                <div className="bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-xl">{t("aiRiskAnalysis")}</h3>
                    <div className="h-8 w-8 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                      <Brain className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {[
                      { name: t("mriScanner"), risk: 85, color: "bg-rose-400" },
                      { name: t("ventilatorV12"), risk: 42, color: "bg-amber-400" },
                      { name: t("infusionPump"), risk: 12, color: "bg-emerald-400" },
                    ].map((item) => (
                      <div key={item.name} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.name}</span>
                          <span className="font-bold">{item.risk}% {t("risk")}</span>
                        </div>
                        <div className="h-2 w-full bg-primary-foreground/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: `${item.risk}%` }}
                            className={`h-full ${item.color}`} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-10 p-4 bg-primary-foreground/10 rounded-2xl border border-primary-foreground/5 text-sm text-primary-foreground/90">
                    {t("aiSuggestion")}
                  </div>
                </div>
              </BlurFade>
            </div>
          </div>
        </div>
      </section>

      {/* Victoria RAG AI Section */}
      <section id="victoria" className="py-24 bg-muted/50 border-y border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="relative order-2 lg:order-1 mt-16 lg:mt-0">
              <BlurFade delay={0.2}>
                <div className="relative mx-auto max-w-[500px] aspect-square">
                  <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse-slow" />
                  <div className="relative h-full w-full bg-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">Victoria AI</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">RAG Assistant</div>
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div className="bg-muted/50 p-3 rounded-2xl rounded-tl-none mr-12 text-xs">
                        {t("victoriaHello")}
                      </div>
                      <div className="bg-primary/10 p-3 rounded-2xl rounded-tr-none ml-12 text-xs text-right">
                        {t("askVictoria")}
                      </div>
                      <div className="bg-muted/50 p-4 rounded-2xl rounded-tl-none mr-8 text-xs space-y-2">
                        <p className="font-bold text-primary">{t("mriScannerSummary")}:</p>
                        <p>• {t("interventionsLast6Months")}</p>
                        <p>• {t("mainIssueCooling")}</p>
                        <p>• {t("totalDowntime")}</p>
                        <p>• {t("efficiencyImproving")}</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-border flex items-center gap-2">
                      <div className="h-8 flex-1 bg-muted/30 rounded-full" />
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </BlurFade>
            </div>

            <div className="order-1 lg:order-2">
              <BlurFade>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-8">
                  <Monitor className="h-4 w-4" /> {t("ragKnowledgeBase")}
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl lg:leading-tight">
                  {t("victoriaRagAi")}
                </h2>
                <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
                  {t("victoriaRagAiDesc")}
                </p>
                
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { title: t("instantSummarization"), desc: t("instantSummarizationDesc") },
                    { title: t("smartCostPrediction"), desc: t("smartCostPredictionDesc") },
                    { title: t("operationalIntelligence"), desc: t("operationalIntelligenceDesc") },
                    { title: t("dataDrivenInsights"), desc: t("dataDrivenInsightsDesc") },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0 mt-1 shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12">
                  <Link href="/chatbot">
                    <Button size="lg" className="rounded-full px-8">
                      {t("aIAssistant")}
                    </Button>
                  </Link>
                </div>
              </BlurFade>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Section */}
      <section id="kpis" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("kpiPreview")}</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              {t("trackMetrics")}
            </p>
          </div>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {kpis.map((kpi) => (
              <motion.div key={kpi.label} variants={fadeInUpItem}>
                <Card className="h-full border-border/50 shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden group">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <kpi.icon className="h-6 w-6" />
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                        kpi.trend.startsWith("+") ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                      }`}>
                        {kpi.trend}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{kpi.fullLabel}</p>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold">{kpi.value}</span>
                        <span className="text-sm font-medium text-muted-foreground">{kpi.unit}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Security and Compliance */}
      <section id="security" className="py-24 bg-muted/20 border-y border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <BlurFade>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { title: t("hospitalGradeAccessControl"), desc: t("hospitalGradeAccessControlDesc"), icon: Lock },
                    { title: t("auditLogs"), desc: t("auditLogsDesc"), icon: FileText },
                    { title: t("roleBasedPermissions"), desc: t("roleBasedPermissionsDesc"), icon: Shield },
                    { title: t("secureDocumentManagement"), desc: t("secureDocumentManagementDesc"), icon: Database },
                  ].map((item) => (
                    <div key={item.title} className="p-6 bg-card border border-border rounded-2xl">
                      <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary mb-4">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm mb-2">{item.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </BlurFade>
            </div>
            
            <div className="order-1 lg:order-2 mb-16 lg:mb-0">
              <BlurFade>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">{t("securityAndCompliance")}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  {t("securityAndComplianceDesc")}
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> SOC2 Certified
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> HIPAA Compliant
                  </div>
                </div>
              </BlurFade>
            </div>
          </div>
        </div>
      </section>

      {/* Multilingual / Theme Section */}
      <section className="py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-24 items-center">
            <div>
              <BlurFade>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">{t("adaptiveInterface")}</h2>
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                      <Globe className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{t("multilingualSupport")}</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {t("multilingualSupportDesc")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                      <Monitor className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{t("themeSupport")}</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {t("themeSupportDesc")}
                      </p>
                    </div>
                  </div>
                </div>
              </BlurFade>
            </div>
            
            <div className="mt-16 lg:mt-0 relative">
              <BlurFade delay={0.2}>
                <div className="relative aspect-square max-w-[400px] mx-auto">
                  {/* Visual representation of theme/lang toggle */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-3xl opacity-50" />
                  <div className="relative h-full w-full bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="h-12 border-b border-border bg-muted/30 flex items-center justify-between px-6">
                      <span className="font-bold text-sm">{t("appearance")}</span>
                      <ThemeToggle />
                    </div>
                    <div className="flex-1 p-8 flex flex-col justify-center items-center gap-8">
                       <div className="flex gap-2">
                         <div className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-bold uppercase">EN</div>
                         <div className="px-4 py-2 bg-muted rounded-full text-xs font-bold uppercase">FR</div>
                         <div className="px-4 py-2 bg-muted rounded-full text-xs font-bold uppercase">AR</div>
                       </div>
                       <div className="w-full space-y-4">
                         <div className="h-4 w-3/4 bg-muted rounded-full mx-auto" />
                         <div className="h-4 w-1/2 bg-muted rounded-full mx-auto" />
                       </div>
                       <div className="mt-4 flex gap-4 w-full">
                         <div className="h-24 flex-1 bg-card border border-border rounded-2xl shadow-sm" />
                         <div className="h-24 flex-1 bg-card border border-border rounded-2xl shadow-sm" />
                       </div>
                    </div>
                  </div>
                </div>
              </BlurFade>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 sm:py-32 bg-primary text-primary-foreground text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <BlurFade>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              {t("readyToModernize")}
            </h2>
            <p className="mt-6 text-xl text-primary-foreground/80 leading-relaxed">
              {t("joinHospitals")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">

              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="h-14 w-full px-10 border-primary-foreground/20 text-primary-foreground bg-transparent hover:bg-primary-foreground/10 font-bold rounded-full">
                  {t("exploreDashboard")}
                </Button>
              </Link>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
            <div className="col-span-2">
              <Logo className="mb-6" />
              <p className="mt-6 text-sm text-muted-foreground leading-relaxed max-w-xs">
                {t("leadingCmms")}
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">{t("product")}</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="#platform" className="hover:text-primary transition-colors">{t("platform")}</Link></li>
                <li><Link href="#modules" className="hover:text-primary transition-colors">{t("modules")}</Link></li>
                <li><Link href="#ai" className="hover:text-primary transition-colors">{t("ai")}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">{t("modules")}</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="/equipment" className="hover:text-primary transition-colors">{t("equipment")}</Link></li>
                <li><Link href="/claims" className="hover:text-primary transition-colors">{t("claims")}</Link></li>
                <li><Link href="/work-orders" className="hover:text-primary transition-colors">{t("workOrders")}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">{t("support")}</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">{t("contact")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("security")}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t("termsOfService")}</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} CareSys. {t("allRightsReserved")}.
            </p>
            <div className="flex items-center gap-6 grayscale opacity-60">
               <div className="flex items-center gap-2">
                 <Shield className="h-4 w-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">SOC2 Certified</span>
               </div>
               <div className="flex items-center gap-2">
                 <CheckCircle2 className="h-4 w-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">HIPAA Compliant</span>
               </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
