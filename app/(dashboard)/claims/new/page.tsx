"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { AlertTriangle, ArrowLeft, Camera, Send, Upload } from "lucide-react"

import { useAuth } from "@/lib/auth-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"
import { claimsApi } from "@/lib/api/claims"
import { departmentsApi } from "@/lib/api/departments"
import { equipmentApi } from "@/lib/api/equipment"
import type {
  DepartmentResponse,
  EquipmentResponse,
} from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { useToast } from "@/components/ui/use-toast"
import { EquipmentSelector } from "@/components/equipment-selector"

export default function NewClaimPage() {
  const { t, language } = useI18n()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [equipment, setEquipment] = useState<EquipmentResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [isLoadingRefs, setIsLoadingRefs] = useState(true)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("")
  const [reportedSeverity, setReportedSeverity] = useState("DEGRADED_PERFORMANCE")
  const [equipmentId, setEquipmentId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [photos, setPhotos] = useState<File[]>([])

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoadingRefs(true)
    setError(null)

    const load = async () => {
      try {
        const [eqRes, deptRes] = await Promise.all([
          equipmentApi.getAll(),
          departmentsApi.getAll(),
        ])
        if (cancelled) return
        setEquipment(eqRes)
        setDepartments(deptRes)
        
        // Initial department for Technicians
        if (user?.roleName === "TECHNICIAN" && user.departmentId) {
          setDepartmentId(String(user.departmentId))
        }
      } catch {
        if (!cancelled) setError(t('failedToLoad'))
      } finally {
        if (!cancelled) setIsLoadingRefs(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [language])

  const equipmentOptions = useMemo(() => {
    if (user?.roleName === "TECHNICIAN" && user.departmentId) {
      return equipment.filter(e => e.departmentId === user.departmentId)
    }
    return equipment ?? []
  }, [equipment, user])

  const departmentOptions = useMemo(() => departments ?? [], [departments])

  const onEquipmentChange = (val: string) => {
    setEquipmentId(val)
    const eq = equipment.find(e => String(e.equipmentId) === val)
    if (eq?.departmentId) {
      setDepartmentId(String(eq.departmentId))
    }
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return
    setPhotos(Array.from(fileList))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !equipmentId || !departmentId) {
      setError(t('pleaseFillInRequired'))
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const created = await claimsApi.create({
        title: title.trim(),
        description: description.trim(),
        priority: priority || undefined,
        reportedSeverity,
        equipmentId: Number(equipmentId),
        departmentId: Number(departmentId),
      })

      if (photos.length > 0) {
        const results = await Promise.allSettled(
          photos.map((file) => claimsApi.uploadPhoto(created.claimId, file)),
        )
        const failed = results.filter((r) => r.status === "rejected")
        if (failed.length > 0) {
          toast({
            title: t('photosPartiallyUploa'),
            description: t('somePhotosFailedToUpload'),
          })
        }
      }

      toast({
        title: t('claimCreated'),
        description: created.claimCode,
      })
      router.push("/claims")
    } catch (err) {
      if (err instanceof ApiError) {
        const payload = err.payload as unknown
        if (payload && typeof payload === "object") {
          const maybeMessage = (payload as Record<string, unknown>).message
          if (typeof maybeMessage === "string" && maybeMessage.trim()) {
            setError(maybeMessage)
            return
          }
        }
        setError(`Request failed (${err.status})`)
        return
      }
      setError(t('failedToCreate'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2 md:gap-3">
        <Link href="/claims">
          <Button variant="ghost" size="icon" type="button">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-xl sm:text-2xl">
            {t("newClaimTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t('reportAnIncidentDesc')}
          </p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {t('claimDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && <p className="text-xs text-destructive">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-medium">
                  {t('title')} *
                </label>
                <Input
                  placeholder={
                    t('brieflyDescribeTheIs')
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <EquipmentSelector
                  equipmentList={equipmentOptions}
                  value={equipmentId}
                  onChange={onEquipmentChange}
                  disabled={isLoadingRefs}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">{t("department")} *</label>
                <Select 
                  value={departmentId} 
                  onValueChange={setDepartmentId} 
                  required 
                  disabled={isLoadingRefs || (user?.roleName === "TECHNICIAN") || (!!equipmentId && !!equipment.find(e => String(e.equipmentId) === equipmentId)?.departmentId)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        t('selectDepartment')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((dept) => (
                      <SelectItem key={dept.departmentId} value={String(dept.departmentId)}>
                        {dept.departmentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium">
                  {t('reportedSeverity')} *
                </label>
                <Select value={reportedSeverity} onValueChange={setReportedSeverity} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectSeverity')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAFETY_RISK">
                      {t('safetyRisk')}
                    </SelectItem>
                    <SelectItem value="SERVICE_BLOCKING">
                      {t('serviceBlocking')}
                    </SelectItem>
                    <SelectItem value="DEGRADED_PERFORMANCE">
                      {t('degradedPerformance')}
                    </SelectItem>
                    <SelectItem value="MINOR_DEFECT">
                      {t('minorDefect')}
                    </SelectItem>
                    <SelectItem value="COSMETIC_OR_INFO">
                      {t('cosmeticOrInfo')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">{t("priority")} ({t('optional')})</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectPriority')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                        {t("critical")}
                      </div>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        {t("high")}
                      </div>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        {t("medium")}
                      </div>
                    </SelectItem>
                    <SelectItem value="LOW">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        {t("low")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">{t("description")} *</label>
                <Textarea
                  placeholder={
                    t('describeTheIssueInDe')
                  }
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">
                  {t('photosOptional')}
                </label>
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-3 sm:p-6 transition-colors hover:border-primary/50">
                  <div className="text-center">
                    <div className="mx-auto flex h-8 w-12 items-center justify-center rounded-full bg-muted">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t('dragPhotosOrClickToU')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      {t('upload')}
                    </Button>
                    {photos.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t('photosSelected', { count: photos.length })}
                      </p>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Link href="/claims" className="flex-1">
                  <Button variant="outline" className="w-full" type="button">
                    {t("cancel")}
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 gap-2 "
                >
                  <Send className="h-4 w-4" />
                  {isSaving
                    ? t('submitting')
                    : t('submit')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
