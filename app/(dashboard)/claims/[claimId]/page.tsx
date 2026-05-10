"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, Pencil, Wrench, CheckCircle, UserPlus, XCircle, Activity, Check, Edit2, X, Zap, Download, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { claimsApi } from "@/lib/api/claims"
import { usersApi } from "@/lib/api/users"
import { workOrdersApi } from "@/lib/api/work-orders"
import type { ClaimPhotoResponse, ClaimResponse, UserResponse, WorkOrderResponse } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { aiApi } from "@/lib/api/ai"
import type { PrioritySuggestionResponse, ClaimPriority } from "@/lib/api/types"
import { toast } from "sonner"
import { WorkOrderLifecycleFlow } from "@/components/work-orders/WorkOrderLifecycleFlow"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "critical":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
    case "high":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    default:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
  }
}

function getStatusColor(status: string) {
  switch (normalizeStatusLabel(status)) {
    case "open":
    case "new":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "qualified":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
    case "assigned":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
    case "in progress":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
    case "converted to work order":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
    case "resolved":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "closed":
      return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
    case "rejected":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function normalizeLabel(value: string) {
  return value.replaceAll("_", " ").trim()
}

function normalizeStatusLabel(value: string) {
  const normalized = normalizeLabel(value).toLowerCase()
  if (normalized === "qualified") return "open"
  return normalized
}

function toDisplayStatusLabel(value: string) {
  const normalized = normalizeStatusLabel(value)
  return normalized.replace(/\b\w/g, (m) => m.toUpperCase())
}

export default function ClaimDetailsPage() {
  const { t, language, isRTL } = useI18n()
  const { user } = useAuth()
  const params = useParams<{ claimId: string }>()
  const claimId = Number(params?.claimId)

  const [claim, setClaim] = useState<ClaimResponse | null>(null)
  const [photos, setPhotos] = useState<ClaimPhotoResponse[]>([])
  const [technicians, setTechnicians] = useState<UserResponse[]>([])
  const [linkedWo, setLinkedWo] = useState<WorkOrderResponse | null>(null)
  const photoUrlRef = useRef<Record<number, string>>({})
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [photosError, setPhotosError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPhotosLoading, setIsPhotosLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  
  const [isConverting, setIsConverting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [qualifyNotes, setQualifyNotes] = useState("")
  const [qualifyDueDate, setQualifyDueDate] = useState("")
  const [qualifySeverity, setQualifySeverity] = useState("")

  const [suggestion, setSuggestion] = useState<PrioritySuggestionResponse | null>(null)
  const [isCalculatingAI, setIsCalculatingAI] = useState(false)
  
  const [isOverrideOpen, setIsOverrideOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [isQualifyOpen, setIsQualifyOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)
  
  const [overridePriority, setOverridePriority] = useState<ClaimPriority>("MEDIUM")
  const [overrideDueDate, setOverrideDueDate] = useState("")
  const [actionReason, setActionReason] = useState("")


  useEffect(() => {
    if (!Number.isFinite(claimId)) {
      setError(t('invalidClaimID'))
      setIsLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      setIsPhotosLoading(true)
      setError(null)
      setPhotosError(null)
      try {
        const claimRes = await claimsApi.getById(claimId)
        if (!cancelled) {
          setClaim(claimRes)
          if (claimRes.reportedSeverity) {
            setQualifySeverity(claimRes.reportedSeverity)
          }
        }
        
        if (claimRes.linkedWoId) {
          try {
            const woRes = await workOrdersApi.getById(claimRes.linkedWoId)
            if (!cancelled) setLinkedWo(woRes)
          } catch (e) {
            console.error("Failed to fetch linked WO", e)
          }
        }

        const techs = await usersApi.getAll()
        if (!cancelled) setTechnicians(techs.filter(t => t.roleName === 'TECHNICIAN' || t.roleId === 3))
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError) {
          setError(`Request failed (${err.status})`)
        } else {
          setError(t('failedToLoad'))
        }
      }

      try {
        const photosRes = await claimsApi.listPhotos(claimId)
        if (!cancelled) setPhotos(photosRes)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError) {
          setPhotosError(`Request failed (${err.status})`)
        } else {
          setPhotosError(t('failedToLoad'))
        }
        setPhotos([])
      } finally {
        if (!cancelled) setIsLoading(false)
        if (!cancelled) setIsPhotosLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [claimId, language])

  const priorityLabel = useMemo(() => {
    if (!claim) return ""
    return claim.priorityLabel ?? normalizeLabel(String(claim.priority ?? ""))
  }, [claim])

  const statusLabel = useMemo(() => {
    if (!claim) return ""
    const raw = claim.statusLabel ?? normalizeLabel(String(claim.status ?? ""))
    return toDisplayStatusLabel(raw)
  }, [claim])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (photos.length === 0) {
        Object.values(photoUrlRef.current).forEach((url) => URL.revokeObjectURL(url))
        photoUrlRef.current = {}
        setPhotoUrls({})
        return
      }

      const nextUrls: Record<number, string> = {}
      for (const photo of photos) {
        try {
          const blob = await claimsApi.getPhotoBlob(claimId, photo.photoId)
          if (cancelled) return
          nextUrls[photo.photoId] = URL.createObjectURL(blob)
        } catch {
          // Skip
        }
      }

      if (cancelled) return
      Object.values(photoUrlRef.current).forEach((url) => URL.revokeObjectURL(url))
      photoUrlRef.current = nextUrls
      setPhotoUrls(nextUrls)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [claimId, photos])

  useEffect(() => {
    return () => {
      Object.values(photoUrlRef.current).forEach((url) => URL.revokeObjectURL(url))
      photoUrlRef.current = {}
    }
  }, [])

  const handleDeletePhoto = async (photoId: number) => {
    if (!claim) return
    setIsDeleting(photoId)
    try {
      await claimsApi.deletePhoto(claim.claimId, photoId)
      setPhotos((prev) => prev.filter((p) => p.photoId !== photoId))
      const current = photoUrlRef.current
      if (current[photoId]) {
        URL.revokeObjectURL(current[photoId])
        const { [photoId]: _removed, ...rest } = current
        photoUrlRef.current = rest
        setPhotoUrls(rest)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Request failed (${err.status})`)
        return
      }
      setError(t('failedToDelete'))
    } finally {
      setIsDeleting(null)
    }
  }

  const handleConvert = async () => {
    if (!claim) return
    setIsConverting(true)
    try {
      await claimsApi.convertToWorkOrder(claim.claimId)
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
      toast.success(t('convertedSuccessfully'))
    } catch (err) {
      setError(t('conversionFailed'))
    } finally {
      setIsConverting(false)
    }
  }

  const handleQualify = async () => {
    if (!claim) return
    setActionLoading("qualify")
    try {
      const payload: any = { 
        qualificationNotes: qualifyNotes,
        validatedSeverity: qualifySeverity || undefined
      }
      if (qualifyDueDate) {
        payload.dueDate = new Date(qualifyDueDate).toISOString()
      }
      await claimsApi.qualify(claim.claimId, payload)
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
      setQualifyDueDate("")
      setQualifyNotes("")
      setQualifySeverity("")
      setIsQualifyOpen(false)
      toast.success(t('qualifiedSuccessfully'))
      loadSuggestion()
    } catch (err) {
      setError(t('qualificationFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const loadSuggestion = async () => {
    try {
      const res = await aiApi.getSuggestionByClaimId(claimId)
      setSuggestion(res)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setSuggestion(null)
      } else {
        console.error("Failed to load AI suggestion", e)
        setSuggestion(null)
      }
    }
  }

  useEffect(() => {
    if (claimId && user && (user.roleName === 'ADMIN' || user.roleName === 'MAINTENANCE_MANAGER')) {
      loadSuggestion()
    }
  }, [claimId, user])

  const handleCalculateAI = async () => {
    setIsCalculatingAI(true)
    try {
      const res = await aiApi.calculateClaimPriority(claimId)
      setSuggestion(res)
      toast.success(t('priorityAnalyzedSuccessfully'))
    } catch (e) {
      toast.error(t('failedToAnalyzePriority'))
    } finally {
      setIsCalculatingAI(false)
    }
  }

  const handleAcceptAI = async () => {
    if (!suggestion) return
    try {
      const res = await aiApi.acceptPrioritySuggestion(suggestion.id)
      setSuggestion(res)
      toast.success(t('suggestionAccepted'))
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
    } catch (e) {
      toast.error(t('failedToAccept'))
    }
  }

  const handleOverrideAI = async () => {
    if (!suggestion || !actionReason) return
    try {
      const payload: any = { finalPriority: overridePriority, reason: actionReason }
      if (overrideDueDate) {
        payload.finalDueDate = new Date(overrideDueDate).toISOString()
      }
      const res = await aiApi.overridePrioritySuggestion(suggestion.id, payload)
      setSuggestion(res)
      setIsOverrideOpen(false)
      setActionReason("")
      setOverrideDueDate("")
      toast.success(t('priorityOverridden'))
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
    } catch (e) {
      toast.error(t('failedToOverride'))
    }
  }

  const handleRejectAI = async () => {
    if (!suggestion || !actionReason) return
    try {
      const res = await aiApi.rejectPrioritySuggestion(suggestion.id, { reason: actionReason })
      setSuggestion(res)
      setIsRejectOpen(false)
      setActionReason("")
      toast.success(t('suggestionRejected'))
    } catch (e) {
      toast.error(t('failedToReject'))
    }
  }

  const handleClose = async () => {
    if (!claim) return
    setActionLoading("close")
    try {
      await claimsApi.updateStatus(claim.claimId, { status: "CLOSED", note: "Manually closed via ui." })
      const claimRes = await claimsApi.getById(claimId)
      setClaim(claimRes)
      setIsCloseOpen(false)
      toast.success(t('closedSuccessfully'))
    } catch (err) {
      setError(t('closureFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/claims">
            <Button variant="ghost" size="icon" type="button">
              <ArrowLeft className={cn("h-5 w-5", isRTL ? "rotate-180" : "")} />
            </Button>
          </Link>
          <div className={isRTL ? "text-right" : ""}>
            <h1 className="text-xl font-bold text-foreground sm:text-xl sm:text-2xl">
              {t('claimDetails')}
            </h1>
            <p className="text-muted-foreground font-mono">
              {claim?.claimCode ?? ""}
            </p>
          </div>
        </div>
        {claim && (
          <div className={cn("flex flex-wrap items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
            
            {claim.linkedWoId && (
              <Link href={`/work-orders/${claim.linkedWoId}`}>
                <Button variant="outline" className="gap-2 border-primary/50 text-primary">
                   <Wrench className="h-4 w-4" />
                   {t('viewLinkedWO')}
                </Button>
              </Link>
            )}

            {(user?.roleName === 'ADMIN' || user?.roleName === 'MAINTENANCE_MANAGER') && (
              <>
                {claim.status === 'NEW' && (
                  <Dialog open={isQualifyOpen} onOpenChange={setIsQualifyOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2 text-indigo-600 border-indigo-200">
                         <CheckCircle className="h-4 w-4" />
                         {t('qualify')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir={isRTL ? "rtl" : "ltr"}>
                      <DialogHeader className={isRTL ? "text-right" : ""}>
                        <DialogTitle>{t('qualifyClaim')}</DialogTitle>
                        <DialogDescription>{t('validateAndSetDueDate')}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className={cn("text-xs font-medium block", isRTL ? "text-right" : "")}>{t('validatedSeverity')} *</label>
                          <select 
                            className={cn("flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs", isRTL ? "text-right" : "")}
                            value={qualifySeverity} 
                            onChange={(e) => setQualifySeverity(e.target.value)}
                            required
                          >
                            <option value="">{t('selectSeverity')}</option>
                            <option value="SAFETY_RISK">{t('safetyRisk')}</option>
                            <option value="SERVICE_BLOCKING">{t('serviceBlocking')}</option>
                            <option value="DEGRADED_PERFORMANCE">{t('degradedPerformance')}</option>
                            <option value="MINOR_DEFECT">{t('minorDefect')}</option>
                            <option value="COSMETIC_OR_INFO">{t('cosmeticOrInfo')}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className={cn("text-xs font-medium block", isRTL ? "text-right" : "")}>{t('dueDate')} ({t('optional')})</label>
                          <Input 
                            type="datetime-local" 
                            value={qualifyDueDate} 
                            onChange={(e) => setQualifyDueDate(e.target.value)} 
                            className={isRTL ? "text-right" : ""}
                          />
                        </div>
                        <Textarea 
                          placeholder={t('qualificationNotesPlaceholder')} 
                          value={qualifyNotes} 
                          onChange={e => setQualifyNotes(e.target.value)} 
                          className={isRTL ? "text-right" : ""}
                        />
                      </div>
                      <DialogFooter className={cn(isRTL ? "flex-row-reverse" : "")}>
                         <Button onClick={handleQualify} disabled={actionLoading === "qualify" || !qualifySeverity}>
                           {actionLoading === "qualify" ? t('processing') : t('confirmQualification')}
                         </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                
                {['QUALIFIED', 'ASSIGNED'].includes(claim.status ?? "") && !claim.linkedWoId && (
                  <Button 
                    variant="outline" 
                    className="gap-2 border-primary/50 text-primary hover:bg-primary/10" 
                    onClick={handleConvert}
                    disabled={isConverting}
                  >
                    <Wrench className={cn("h-4 w-4", isConverting ? 'animate-spin' : '')} />
                    {t('convertToWO')}
                  </Button>
                )}

                {!['CLOSED', 'REJECTED', 'RESOLVED'].includes(claim.status ?? "") && (
                  <Dialog open={isCloseOpen} onOpenChange={setIsCloseOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2 text-rose-600 border-rose-200">
                         <XCircle className="h-4 w-4" />
                         {t('close')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir={isRTL ? "rtl" : "ltr"}>
                      <DialogHeader className={isRTL ? "text-right" : ""}>
                        <DialogTitle>{t('forceCloseClaim')}</DialogTitle>
                        <DialogDescription>{t('areYouSureForceClose')}</DialogDescription>
                      </DialogHeader>
                      <DialogFooter className={cn(isRTL ? "flex-row-reverse" : "")}>
                         <Button variant="destructive" onClick={handleClose} disabled={actionLoading === "close"}>
                           {actionLoading === "close" ? t('closing') : t('closeClaim')}
                         </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
            
            <Link href={`/claims/${claim.claimId}/edit`}>
              <Button className="gap-2" type="button">
                <Pencil className="h-4 w-4" />
                {t('edit')}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse text-right" : "")}>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t('summary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">{t('loading')}</p>
          ) : claim ? (
            <div className="grid gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-xs text-muted-foreground">{t('title')}</p>
                <p className="font-medium text-foreground">{claim.title}</p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-xs text-muted-foreground">{t('equipment')}</p>
                <p className="font-medium text-foreground">{claim.equipmentName ?? `#${claim.equipmentId}`}</p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-xs text-muted-foreground">{t('priority')}</p>
                <Badge variant="outline" className={getPriorityColor(priorityLabel)}>
                  {priorityLabel}
               </Badge>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-xs text-muted-foreground">{t('status')}</p>
                <Badge variant="outline" className={getStatusColor(statusLabel)}>
                  {statusLabel}
                </Badge>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-xs text-muted-foreground">{t('department')}</p>
                <p className="font-medium text-foreground">{claim.departmentName ?? "-"}</p>
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-xs text-muted-foreground">{t('assignedTech')}</p>
                <p className="font-medium text-foreground">{claim.assignedToName ?? "-"}</p>
              </div>
              {claim.dueDate && (
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-xs text-muted-foreground">{t('dueDate')}</p>
                  <p className="font-medium text-foreground">{new Date(claim.dueDate).toLocaleDateString()}</p>
                </div>
              )}
              {claim.reportedSeverity && (
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-xs text-muted-foreground">{t('reportedSeverity')}</p>
                  <p className="font-medium text-foreground">{t(claim.reportedSeverity.toLowerCase()) || claim.reportedSeverity}</p>
                </div>
              )}
              {claim.validatedSeverity && (
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-xs text-muted-foreground">{t('validatedSeverity')}</p>
                  <p className="font-medium text-indigo-600">{t(claim.validatedSeverity.toLowerCase()) || claim.validatedSeverity}</p>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {user && (user.roleName === 'ADMIN' || user.roleName === 'MAINTENANCE_MANAGER') && (
        <Card className="border-indigo-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-indigo-600 w-full" />
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
            <div className={cn("flex items-center justify-between", isRTL ? "flex-row-reverse" : "")}>
              <CardTitle className={cn("flex items-center gap-2 text-indigo-900", isRTL ? "flex-row-reverse" : "")}>
                <Zap className="h-5 w-5 text-indigo-500" />
                {t('automaticPrioritization')}
              </CardTitle>
              {suggestion ? (
                <div className="flex gap-2">
                  {suggestion.decisionStatus === "PENDING" && (
                    <>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs" onClick={handleAcceptAI}>
                        <Check className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} /> {t('accept')}
                      </Button>
                      <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 h-8 text-xs hover:bg-amber-100" onClick={() => setIsOverrideOpen(true)}>
                        <Edit2 className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} /> {t('override')}
                      </Button>
                      <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 bg-rose-50 h-8 text-xs hover:bg-rose-100" onClick={() => setIsRejectOpen(true)}>
                        <X className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} /> {t('reject')}
                      </Button>
                    </>
                  )}
                  {suggestion.decisionStatus !== "PENDING" && (
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      {t(suggestion.decisionStatus.toLowerCase()) || suggestion.decisionStatus}
                    </Badge>
                  )}
                </div>
              ) : (
                <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100" onClick={handleCalculateAI} disabled={isCalculatingAI}>
                  {isCalculatingAI ? <Activity className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                  {isCalculatingAI ? t('analyzing') : t('calculateAIPriority')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {suggestion ? (
              <div className="grid gap-3 sm:gap-2 md:gap-3 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <div className={isRTL ? "text-right" : ""}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t('suggestedPriority')}</p>
                      <Badge className={getPriorityColor(suggestion.suggestedPriority)} variant="outline">
                        {suggestion.suggestedPriority}
                      </Badge>
                    </div>
                    <div className={isRTL ? "text-right" : ""}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t('aiScore')}</p>
                      <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                        <span className="text-lg sm:text-xl font-bold">{suggestion.score}</span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                      </div>
                    </div>
                    <div className={isRTL ? "text-right" : ""}>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t('slaStatus')}</p>
                      <Badge variant="secondary" className={
                        suggestion.slaStatus === 'BREACHED' ? 'bg-rose-100 text-rose-700' : 
                        suggestion.slaStatus === 'AT_RISK' ? 'bg-amber-100 text-amber-700' : 
                        suggestion.slaStatus === 'SAFE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }>
                        {t(suggestion.slaStatus.toLowerCase()) || suggestion.slaStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                    {suggestion.suggestedDueDate && (
                      <div className={isRTL ? "text-right" : ""}>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t('suggestedDueDate')}</p>
                        <span className="text-xs font-medium">{new Date(suggestion.suggestedDueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="col-span-2 mt-2">
                      <p className={cn("text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2", isRTL ? "text-right" : "")}>{t('scoreBreakdown')}</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className={cn("flex justify-between items-center border-b border-border/40 pb-1", isRTL ? "flex-row-reverse" : "")}>
                          <span>{t('criticality')} (30%)</span>
                          <span className="font-medium">{suggestion.criticalityScore}</span>
                        </div>
                        <div className={cn("flex justify-between items-center border-b border-border/40 pb-1", isRTL ? "flex-row-reverse" : "")}>
                          <span>{t('serviceImpact')} (25%)</span>
                          <span className="font-medium">{suggestion.serviceImpactScore}</span>
                        </div>
                        <div className={cn("flex justify-between items-center border-b border-border/40 pb-1", isRTL ? "flex-row-reverse" : "")}>
                          <span>{t('severity')} (20%)</span>
                          <span className="font-medium">{suggestion.severityScore}</span>
                        </div>
                        <div className={cn("flex justify-between items-center border-b border-border/40 pb-1", isRTL ? "flex-row-reverse" : "")}>
                          <span>{t('failureHistory')} (15%)</span>
                          <span className="font-medium">{suggestion.failureHistoryScore}</span>
                        </div>
                        <div className={cn("flex justify-between items-center border-b border-border/40 pb-1", isRTL ? "flex-row-reverse" : "")}>
                          <span>{t('ageSla')} (10%)</span>
                          <span className="font-medium">{suggestion.slaScore}</span>
                        </div>
                        <div className={cn("flex justify-between items-center pt-1 font-bold text-indigo-600", isRTL ? "flex-row-reverse" : "")}>
                          <span>{t('finalTotal')}</span>
                          <span>{suggestion.score}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={cn("space-y-4", isRTL ? "border-r border-border/50 pr-6" : "border-l border-border/50 pl-6")}>
                  <div className={isRTL ? "text-right" : ""}>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t('reasoning')}</p>
                    <p className="text-xs bg-muted/30 p-3 rounded-lg border border-border/40 text-foreground/80">
                      {suggestion.reason}
                    </p>
                  </div>
                  <div className={isRTL ? "text-right" : ""}>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t('recommendation')}</p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                      {suggestion.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <div className="bg-indigo-50 w-12 h-8 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-indigo-400" />
                </div>
                <p className="text-xs text-muted-foreground">{t('noAISuggestionYet')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : ""}>
            <DialogTitle>{t('overrideAISuggestion')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className={cn("text-xs font-medium block", isRTL ? "text-right" : "")}>{t('newPriority')}</label>
              <select className={cn("flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs", isRTL ? "text-right" : "")} value={overridePriority} onChange={(e) => setOverridePriority(e.target.value as ClaimPriority)}>
                <option value="CRITICAL">{t('critical')}</option>
                <option value="HIGH">{t('high')}</option>
                <option value="MEDIUM">{t('medium')}</option>
                <option value="LOW">{t('low')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className={cn("text-xs font-medium block", isRTL ? "text-right" : "")}>{t('newDueDate')} ({t('optional')})</label>
              <Input type="datetime-local" value={overrideDueDate} onChange={(e) => setOverrideDueDate(e.target.value)} className={isRTL ? "text-right" : ""} />
            </div>
            <div className="space-y-2">
              <label className={cn("text-xs font-medium block", isRTL ? "text-right" : "")}>{t('overrideReason')} <span className="text-rose-500">*</span></label>
              <Textarea placeholder={t('justificationRequired')} value={actionReason} onChange={(e) => setActionReason(e.target.value)} className={isRTL ? "text-right" : ""} />
            </div>
          </div>
          <DialogFooter className={cn(isRTL ? "flex-row-reverse" : "")}>
            <Button variant="outline" onClick={() => setIsOverrideOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleOverrideAI} disabled={!actionReason}>{t('confirmOverride')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className={isRTL ? "text-right" : ""}>
            <DialogTitle>{t('rejectAISuggestion')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <p className={cn("text-xs text-muted-foreground", isRTL ? "text-right" : "")}>{t('rejectSuggestionDesc')}</p>
            <div className="space-y-2">
              <label className={cn("text-xs font-medium block", isRTL ? "text-right" : "")}>{t('rejectReason')} <span className="text-rose-500">*</span></label>
              <Textarea placeholder={t('justificationRequired')} value={actionReason} onChange={(e) => setActionReason(e.target.value)} className={isRTL ? "text-right" : ""} />
            </div>
          </div>
          <DialogFooter className={cn(isRTL ? "flex-row-reverse" : "")}>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={handleRejectAI} disabled={!actionReason}>{t('reject')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
