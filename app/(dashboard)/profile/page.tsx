"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import {
  Bell,
  Camera,
  Check,
  Clock,
  Globe,
  Key,
  Mail,
  Moon,
  Palette,
  Save,
  Shield,
  Smartphone,
  Sun,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"
import { useAuth, getRoleLabel } from "@/lib/auth-context"
import { usersApi } from "@/lib/api/users"
import { useToast } from "@/components/ui/use-toast"
import { ApiError } from "@/lib/api/client"

function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const payload = err.payload as unknown
    if (payload && typeof payload === "object") {
      const maybeError = (payload as Record<string, unknown>).error
      const maybeMessage = (payload as Record<string, unknown>).message
      if (typeof maybeError === "string" && maybeError.trim()) return maybeError
      if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage
    }
    return `Request failed (${err.status})`
  }
  if (err instanceof Error && err.message) return err.message
  return "Request failed"
}

function splitFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") }
}

export default function ProfilePage() {
  const { t, language, setLanguage } = useI18n()
  const { user, refresh } = useAuth()
  const { toast } = useToast()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const isDarkMode = resolvedTheme === "dark"

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!user) return

    const initial = splitFullName(user.name)
    setFirstName(initial.firstName)
    setLastName(initial.lastName)
    setEmail(user.email ?? "")
    setPhone("")

    const load = async () => {
      try {
        const details = await usersApi.getById(user.id)
        if (cancelled) return
        const parsed = splitFullName(details.fullName)
        setFirstName(parsed.firstName)
        setLastName(parsed.lastName)
        setEmail(details.email ?? "")
        setPhone(details.phoneNumber ?? "")
      } catch {
        // Keep fallback values from auth context
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const onSaveProfile = async () => {
    if (!user || isSavingProfile) return

    const fullName = `${firstName} ${lastName}`.trim()
    const normalizedEmail = email.trim()
    const normalizedPhone = phone.trim()

    if (!fullName) {
      toast({
        title: t('nameIsRequired'),
        variant: "destructive",
      })
      return
    }
    if (!normalizedEmail) {
      toast({
        title: t('emailIsRequired'),
        variant: "destructive",
      })
      return
    }

    setIsSavingProfile(true)
    try {
      await usersApi.update(user.id, {
        fullName,
        email: normalizedEmail,
        phoneNumber: normalizedPhone ? normalizedPhone : null,
      })

      toast({ title: t('profileUpdated') })
      await refresh()
    } catch (err) {
      toast({
        title: t('updateFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const onUpdatePassword = async () => {
    if (!user || isSavingPassword) return
    if (!newPassword.trim()) {
      toast({
        title: t('newPasswordIsRequire'),
        variant: "destructive",
      })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: t('passwordsDoNotMatch'),
        variant: "destructive",
      })
      return
    }

    setIsSavingPassword(true)
    try {
      await usersApi.update(user.id, { password: newPassword })
      toast({ title: t('passwordUpdated') })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      toast({
        title: t('updateFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-3 sm:p-6"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="relative flex flex-col items-center gap-3 sm:gap-2 md:gap-3 sm:flex-row">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <User className="h-8 w-12 text-primary-foreground" />
            </div>
            <button
              type="button"
              onClick={() =>
                toast({
                  title: t('notAvailable'),
                  description:
                    t('avatarManagementIsNo'),
                  variant: "destructive",
                })
              }
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-violet-600 shadow-lg transition-transform hover:scale-110"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-bold text-primary-foreground">{user?.name || "User"}</h1>
            <p className="text-primary-foreground/80">{user?.email || "user@hospital.com"}</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-primary-foreground" />
              <span className="text-xs font-medium text-primary-foreground">
                {user ? getRoleLabel(user.roleName, language) : "User"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Profile Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t('general')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">{t('security')}</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('personalInformation')}</CardTitle>
              <CardDescription>
                {t('manageYourProfileInf')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:gap-2 md:gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('firstName')}</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('lastName')}</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:gap-2 md:gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('optional')}
                      className="pl-10 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">{t('language')}</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "fr")}>
                    <SelectTrigger>
                      <Globe className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userId">{t('userID')}</Label>
                <Input 
                  id="userId" 
                  value={user ? String(user.id) : "—"} 
                  readOnly 
                  className="font-mono text-xs bg-muted/50" 
                />
              </div>
              <Button
                
                onClick={onSaveProfile}
                disabled={!user || isSavingProfile}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingProfile
                  ? t('saving')
                  : t('saveChanges')}
              </Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('appearance')}
              </CardTitle>
              <CardDescription>
                {t('customizeLookFeel')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {mounted ? (isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />) : <div className="h-5 w-5" />}
                  <div>
                    <p className="font-medium">{t('darkMode')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('useTheDarkTheme')}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!isDarkMode}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('password')}</CardTitle>
              <CardDescription>
                {t('updateYourPassword')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('newPassword')}</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button
                
                onClick={onUpdatePassword}
                disabled={!user || isSavingPassword}
              >
                <Key className="mr-2 h-4 w-4" />
                {isSavingPassword
                  ? t('updating')
                  : t('updatePassword')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
