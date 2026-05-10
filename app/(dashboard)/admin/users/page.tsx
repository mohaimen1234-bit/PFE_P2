"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Users, Plus, Edit, Trash2, Search, Download, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AnimatedSection } from "@/components/ui/motion-fade"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"
import { usePagination } from "@/lib/hooks/use-pagination"
import { useAuth, getRoleLabel } from "@/lib/auth-context"
import { usersApi } from "@/lib/api/users"
import { rolesApi } from "@/lib/api/roles"
import { departmentsApi } from "@/lib/api/departments"
import { auditLogsApi } from "@/lib/api/audit-logs"
import type { AuditLog, CreateUserRequest, DepartmentResponse, RoleResponse, UpdateUserRequest, UserResponse } from "@/lib/api/types"
import { downloadCsv } from "@/lib/export"
import { ApiError } from "@/lib/api/client"
import { useToast } from "@/components/ui/use-toast"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

const NONE_SELECT_VALUE = "__none__"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
}

export default function UsersPage() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN]}>
      <UsersPageContent />
    </RouteGuard>
  )
}

function UsersPageContent() {
  const { t, language } = useI18n()
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { toast } = useToast()

  const [query, setQuery] = useState("")
  const [items, setItems] = useState<UserResponse[]>([])
  
  const { paginatedItems, PaginationControls } = usePagination(items, 10);
  
  const [roles, setRoles] = useState<RoleResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [roleFilterId, setRoleFilterId] = useState<string>("all")
  const [departmentFilterId, setDepartmentFilterId] = useState<string>("all")

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create")
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserResponse | null>(null)

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    roleId: "",
    departmentId: NONE_SELECT_VALUE,
    isActive: true,
  })

  const getApiErrorMessage = (err: unknown): string => {
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

  const loadUsers = async () => {
    const roleId = roleFilterId !== "all" ? Number(roleFilterId) : undefined
    const departmentId = departmentFilterId !== "all" ? Number(departmentFilterId) : undefined
    const q = query.trim()

    if (q || roleId || departmentId) {
      return usersApi.search({
        q: q || undefined,
        roleId,
        departmentId,
      })
    }
    return usersApi.getAll()
  }

  const refreshUsers = async () => {
    const [usersRes, logsRes] = await Promise.all([
      loadUsers(),
      auditLogsApi.getRecent(30),
    ])
    setItems(usersRes)
    setAuditLogs(logsRes)
  }

  useEffect(() => {
    if (isLoading) return
    if (user && (user.roleName ?? "").toUpperCase() !== "ADMIN") {
      router.replace("/dashboard")
    }
  }, [isLoading, router, user])

  useEffect(() => {
    let cancelled = false

    const loadRef = async () => {
      try {
        const [rolesRes, depsRes] = await Promise.all([
          rolesApi.getAll(),
          departmentsApi.getAll(),
        ])
        if (cancelled) return
        setRoles(rolesRes)
        setDepartments(depsRes)
      } catch {
        if (cancelled) return
        setRoles([])
        setDepartments([])
      }
    }

    loadRef()
    return () => {
      cancelled = true
    }
  }, [language])

  useEffect(() => {
    let cancelled = false
    setIsFetching(true)
    setError(null)

    const handle = window.setTimeout(async () => {
      try {
        const [usersRes, logsRes] = await Promise.all([loadUsers(), auditLogsApi.getRecent(30)])
        if (cancelled) return
        setItems(usersRes)
        setAuditLogs(logsRes)
      } catch {
        if (cancelled) return
        setItems([])
        setAuditLogs([])
        setError(t('failedToLoadUsers'))
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [departmentFilterId, language, query, roleFilterId])

  const openCreate = () => {
    setEditorMode("create")
    setEditingUserId(null)
    setForm({
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      roleId: roles.length > 0 ? String(roles[0].roleId) : "",
      departmentId: NONE_SELECT_VALUE,
      isActive: true,
    })
    setEditorOpen(true)
  }

  const openEdit = (u: UserResponse) => {
    setEditorMode("edit")
    setEditingUserId(u.userId)
    const primaryRole = u.roles && u.roles.length > 0 ? u.roles[0] : null
    setForm({
      fullName: u.fullName ?? "",
      email: u.email ?? "",
      phoneNumber: u.phoneNumber ?? "",
      password: "",
      roleId: primaryRole ? String(primaryRole.roleId) : (roles.length > 0 ? String(roles[0].roleId) : ""),
      departmentId: u.departmentId != null ? String(u.departmentId) : NONE_SELECT_VALUE,
      isActive: u.isActive,
    })
    setEditorOpen(true)
  }

  const onSaveUser = async (e: FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    const fullName = form.fullName.trim()
    const email = form.email.trim()
    const password = form.password

    const roleId = Number(form.roleId)
    if (!fullName || !email || !Number.isFinite(roleId) || roleId <= 0) {
      toast({
        title: t('missingRequiredField'),
        description: t('fullNameEmailAndRole'),
        variant: "destructive",
      })
      return
    }

    const departmentId =
      form.departmentId !== NONE_SELECT_VALUE ? Number(form.departmentId) : null

    setIsSaving(true)
    try {
      if (editorMode === "create") {
        if (!password || password.length < 8) {
          toast({
            title: t('invalidPassword'),
            description: t('passwordMustBeAtLeas'),
            variant: "destructive",
          })
          setIsSaving(false)
          return
        }

        const payload: CreateUserRequest = {
          fullName,
          email,
          phoneNumber: form.phoneNumber.trim() || null,
          password,
          roleIds: [roleId],
          departmentId,
          isActive: form.isActive,
        }

        await usersApi.create(payload)
        toast({ title: t('userCreated') })
      } else {
        if (!editingUserId) throw new Error("Missing user id")

        const payload: UpdateUserRequest = {
          fullName: fullName || undefined,
          email: email || undefined,
          phoneNumber: form.phoneNumber.trim() || null,
          roleIds: [roleId],
          departmentId,
        }
        if (password && password.trim().length >= 8) {
          payload.password = password
        } else if (password && password.trim().length > 0) {
          toast({
            title: t('invalidPassword'),
            description: t('passwordMustBeAtLeas'),
            variant: "destructive",
          })
          setIsSaving(false)
          return
        }

        await usersApi.update(editingUserId, payload)
        toast({ title: t('userUpdated') })
      }

      setEditorOpen(false)
      await refreshUsers()
    } catch (err) {
      toast({
        title: t('saveFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const onToggleActive = async (u: UserResponse, nextActive: boolean) => {
    if (user && u.userId === user.id) {
      toast({
        title: t('actionNotAllowed'),
        description: t('youCannotDeactivateYourOwn'),
        variant: "destructive",
      })
      return
    }

    try {
      await usersApi.updateStatus(u.userId, nextActive)
      toast({ title: nextActive ? (t('userActivated')) : (t('userDeactivated')) })
      await refreshUsers()
    } catch (err) {
      toast({
        title: t('updateFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  const askDelete = (u: UserResponse) => {
    if (user && u.userId === user.id) {
      toast({
        title: t('actionNotAllowed'),
        description: t('youCannotDeleteYourOwn'),
        variant: "destructive",
      })
      return
    }
    setDeletingUser(u)
    setConfirmDeleteOpen(true)
  }

  const onConfirmDelete = async () => {
    if (!deletingUser) return
    try {
      await usersApi.delete(deletingUser.userId)
      toast({ title: t('userDeleted') })
      setConfirmDeleteOpen(false)
      setDeletingUser(null)
      await refreshUsers()
    } catch (err) {
      toast({
        title: t('deleteFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  const recentUserLogs = useMemo(() => {
    const filtered = auditLogs.filter((l) => {
      const entity = (l.entityName ?? "").toLowerCase()
      const action = (l.actionType ?? "").toLowerCase()
      return entity.includes("user") || action.includes("user")
    })
    return filtered.slice(0, 3)
  }, [auditLogs])

  const timeAgo = (iso: string) => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return "—"
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return t('justNow')
    if (diffMin < 60) return t('minAgoVal', { val: diffMin })
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return t('hAgoVal', { val: diffHr })
    const diffDay = Math.floor(diffHr / 24)
    return t('dAgoVal', { val: diffDay })
  }

  const onExport = () => {
    downloadCsv(
      "users.csv",
      ["id", "name", "email", "role", "department", "active"],
      paginatedItems.map((u) => [
        u.userId,
        u.fullName,
        u.email,
        u.roles && u.roles.length > 0 ? u.roles[0].roleName : "",
        u.departmentName,
        u.isActive,
      ])
    )
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      className="flex-1 space-y-6 overflow-auto"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('userManagement')}</h1>
          <p className="text-muted-foreground">{t('manageSystemUsersAnd')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 me-2" />
          {t('addUser')}
        </Button>
      </motion.div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editorMode === "create"
                ? (t('addUser'))
                : (t('editUser'))}
            </DialogTitle>
            <DialogDescription>
              {t('savesViaTheUsersAPI')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSaveUser} className="space-y-4">
            <div className="grid gap-2 md:gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u-fullName">{t('fullName')}</Label>
                <Input id="u-fullName" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="u-email">{t('email')}</Label>
                <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="u-phone">{t('phone')}</Label>
                <Input id="u-phone" value={form.phoneNumber} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="u-password">{t('password')}</Label>
                <Input id="u-password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder={editorMode === "edit" ? (t('leaveEmptyToKeep')) : ""} />
              </div>

              <div className="space-y-2">
                <Label>{t('role')}</Label>
                <Select value={form.roleId} onValueChange={(v) => setForm((p) => ({ ...p, roleId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.roleId} value={String(r.roleId)}>
                        {r.roleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('department')}</Label>
                <Select value={form.departmentId} onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('none')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SELECT_VALUE}>{t('none')}</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.departmentId} value={String(d.departmentId)}>
                        {d.departmentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editorMode === "create" && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:col-span-2">
                  <div>
                    <div className="text-xs font-medium text-foreground">{t('active')}</div>
                    <div className="text-xs text-muted-foreground">{t('accountEnabledOnCrea')}</div>
                  </div>
                  <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))} />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={isSaving}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('filters')}</DialogTitle>
            <DialogDescription>{t('searchViaUsersSearch')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('role')}</Label>
              <Select value={roleFilterId} onValueChange={setRoleFilterId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.roleId} value={String(r.roleId)}>
                      {r.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('department')}</Label>
              <Select value={departmentFilterId} onValueChange={setDepartmentFilterId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.departmentId} value={String(d.departmentId)}>
                      {d.departmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRoleFilterId("all")
                setDepartmentFilterId("all")
              }}
            >
              {t('reset')}
            </Button>
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              {t('apply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {`${t('deleteUserConfirm')} ${deletingUser?.fullName ?? ""}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete}>{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters & Search */}
      <motion.div variants={fadeInUp} className="flex flex-wrap gap-2 min-w-0">
        <div className="flex-1">
          <Input
            placeholder={t('searchUsers')}
            className="h-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => setFiltersOpen(true)}>
          <Filter className="h-4 w-4 me-2" />
          {t('filter')}
        </Button>
        <Button variant="outline" onClick={onExport} disabled={items.length === 0}>
          <Download className="h-4 w-4 me-2" />
          {t('export')}
        </Button>
      </motion.div>

      {/* Users Table */}
      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('name')}</th>
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('email')}</th>
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('role')}</th>
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('department')}</th>
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('status')}</th>
                    <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('lastLogin')}</th>
                    <th className="text-end py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isFetching ? (
                    <tr>
                      <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={7}>
                        {t('loading')}
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td className="py-1.5 px-2 text-[11px] text-destructive" colSpan={7}>
                        {error}
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={7}>
                        {t('noUsers')}
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((u) => (
                      <tr key={u.userId} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="py-1.5 px-2 text-[11px] text-foreground font-medium">{u.fullName}</td>
                        <td className="py-1.5 px-2 text-[11px] text-muted-foreground">{u.email}</td>
                        <td className="py-1.5 px-2 text-[11px] text-muted-foreground">
                          {getRoleLabel(u.roles && u.roles.length > 0 ? u.roles[0].roleName : null, language)}
                        </td>
                        <td className="py-1.5 px-2 text-[11px] text-muted-foreground">{u.departmentName || "—"}</td>
                        <td className="py-1.5 px-2 text-[11px]">
                          <Badge
                            variant="outline"
                            className={
                              u.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-muted text-muted-foreground border-border"
                            }
                          >
                            {u.isActive ? (t('active')) : (t('inactive'))}
                          </Badge>
                        </td>
                        <td className="py-1.5 px-2 text-[11px] text-muted-foreground text-xs">
                          {u.lastLogin ? timeAgo(u.lastLogin) : "—"}
                        </td>
                        <td className="py-1.5 px-2 text-[11px] text-end">
                          <div className="flex gap-2 justify-end">
                            <div className="flex items-center gap-2 pe-2">
                              <Switch
                                checked={u.isActive}
                                disabled={!!user && u.userId === user.id}
                                onCheckedChange={(checked) => void onToggleActive(u, checked)}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openEdit(u)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              disabled={(!!user && u.userId === user.id) || (u.roles && u.roles.length > 0 && u.roles[0].roleName.toUpperCase() === "ADMIN")}
                              onClick={() => askDelete(u)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls />
          </CardContent>
        </Card>
      </motion.div>

      {/* Audit Trail */}
      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{t('recentUserActivities')}</CardTitle>
            <CardDescription>{t('userManagementAuditTrail')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUserLogs.length === 0 ? (
                <div className="py-1 px-2 text-[11px] text-xs text-muted-foreground">
                  {t('noRecentActivity')}
                </div>
              ) : (
                recentUserLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-1 px-2 text-[11px] bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-foreground">{log.actionType || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('by')} {log.userId ? `${t('user')} #${log.userId}` : t('system')}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{timeAgo(log.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
