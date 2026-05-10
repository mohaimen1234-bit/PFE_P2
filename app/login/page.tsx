"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
  Package,
  Wrench,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useI18n, LanguageSwitcher } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { Logo } from "@/components/ui/logo"

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function LoginPage() {
  const { t, language } = useI18n()
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      router.replace("/dashboard")
    } catch {
      setError(t('loginFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const features = [
    { icon: Package, text: t('equipmentManagement') },
    { icon: Calendar, text: t('maintenancePlanning') },
    { icon: Brain, text: t('predictiveAI') },
    { icon: BarChart3, text: t('bIDashboards') },
  ]

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Side - Marketing/Illustration */}
      <div className="relative hidden w-full overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent lg:flex lg:w-1/2">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse-soft" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse-soft" style={{ animationDelay: "2s" }} />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5" />
        </div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.08]" />

        <div className="relative flex h-full flex-col justify-between p-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Logo link={false} className="dark:invert invert-0" />
          </motion.div>

          {/* Center Content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-8"
          >
            <motion.div variants={fadeUp} custom={0.2}>
              <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-primary-foreground xl:text-5xl">
                {t('nextGenerationHospital')}
              </h1>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-primary-foreground/80">
                {t('loginSubtitleFull')}
              </p>
            </motion.div>

            {/* Feature Pills */}
            <motion.div
              variants={fadeUp}
              custom={0.3}
              className="flex flex-wrap gap-3"
            >
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:bg-white/20 hover:scale-105"
                >
                  <feature.icon className="h-4 w-4 text-primary-foreground" />
                  <span className="text-sm font-medium text-primary-foreground">{feature.text}</span>
                </div>
              ))}
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              variants={fadeUp}
              custom={0.4}
              className="relative mt-8"
            >
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: CheckCircle2, value: "98.5%", label: t('availability'), color: "text-emerald-300", delay: "0s" },
                  { icon: Activity, value: "156", label: t('equipment'), color: "text-blue-300", delay: "0.5s" },
                  { icon: Wrench, value: "24", label: t('activeWOs'), color: "text-orange-300", delay: "1s" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    className="group rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:bg-white/20 hover:scale-[1.02] animate-float"
                    style={{ animationDelay: stat.delay }}
                  >
                    <div className="flex h-full flex-col justify-between">
                      <stat.icon className={`h-8 w-8 ${stat.color} transition-transform duration-300 group-hover:scale-110`} />
                      <div className="mt-3">
                        <div className="text-2xl font-bold tracking-tight text-primary-foreground">{stat.value}</div>
                        <div className="text-xs text-primary-foreground/70 text-balance-tight">{stat.label}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Security Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <Lock className="h-5 w-5 text-primary-foreground/70" />
            <span className="text-sm text-primary-foreground/70">{t("secureLogin")}</span>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full flex-col lg:w-1/2">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6 lg:p-8">
          <Logo className="lg:hidden" />
          <div className="hidden text-sm text-muted-foreground lg:block">
            {/* Space reserved */}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="transition-all duration-200">
                {t("signIn")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-center lg:text-left"
            >
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("welcomeBack")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t("loginToAccount")}
              </p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  {t("email")}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('emailPlaceholder') || "admin@hospital.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10 transition-all duration-200 border-border/60 hover:border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t("password")}
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('passwordPlaceholder') || "8+ characters"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 pr-10 transition-all duration-200 border-border/60 hover:border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 shadow-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-start">
                <div className="flex items-center gap-2 group">
                  <Checkbox id="remember" className="transition-all duration-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <label htmlFor="remember" className="text-sm text-muted-foreground transition-colors duration-200 group-hover:text-foreground cursor-pointer">
                    {t("rememberMe")}
                  </label>
                </div>
              </div>

              {/* Login Button */}
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      {t('signingIn')}
                    </span>
                  ) : t("login")}
                </Button>
              </motion.div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2"
                >
                  {error}
                </motion.p>
              )}


            </motion.form>


          </div>
        </div>
      </div>
    </div>
  )
}
