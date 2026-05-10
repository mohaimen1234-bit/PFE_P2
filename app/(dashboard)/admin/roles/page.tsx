"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Plus, Edit, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useI18n } from "@/lib/i18n"
import { usePagination } from "@/lib/hooks/use-pagination"
import { useAuth } from "@/lib/auth-context"
import { rolesApi } from "@/lib/api/roles"
import { usersApi } from "@/lib/api/users"
import { auditLogsApi } from "@/lib/api/audit-logs"
import type { AuditLog, CreateRoleRequest, RoleResponse, UserResponse } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { useToast } from "@/components/ui/use-toast"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
}

export default function RolesPage() {
  const { t, language } = useI18n()
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { toast } = useToast()

  const [roles, setRoles] = useState<RoleResponse[]>([])
  const { paginatedItems: paginatedRoles, PaginationControls } = usePagination(roles, 10);
  const [users, setUsers] = useState<UserResponse[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [roleName, setRoleName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deletingRole, setDeletingRole] = useState<RoleResponse | null>(null)

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

  const refresh = async () => {
    const [rolesRes, usersRes, logsRes] = await Promise.all([
      rolesApi.getAll(),
      usersApi.getAll(),
      auditLogsApi.getRecent(30),
    ])
    setRoles(rolesRes)
    setUsers(usersRes)
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
    setIsFetching(true)
    setError(null)
    const load = async () => {
      try {
        const [rolesRes, usersRes, logsRes] = await Promise.all([
          rolesApi.getAll(),
          usersApi.getAll(),
          auditLogsApi.getRecent(30),
        ])
        if (cancelled) return
        setRoles(rolesRes)
        setUsers(usersRes)
        setAuditLogs(logsRes)
      } catch {
        if (cancelled) return
        setRoles([])
        setUsers([])
        setAuditLogs([])
        setError(t('failedToLoadRoles'))
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [language])

  const onCreateRole = async (e: FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    const name = roleName.trim()
    if (!name) {
      toast({
        title: t('roleNameIsRequired'),
        variant: "destructive",
      })
      return
    }
    setIsSaving(true)
    try {
      const payload: CreateRoleRequest = { roleName: name }
      await rolesApi.create(payload)
      toast({ title: t('roleCreated') })
      setCreateOpen(false)
      setRoleName("")
      await refresh()
    } catch (err) {
      toast({
        title: t('createFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const askDeleteRole = (r: RoleResponse) => {
    setDeletingRole(r)
    setConfirmDeleteOpen(true)
  }

  const onConfirmDeleteRole = async () => {
    if (!deletingRole) return
    try {
      await rolesApi.delete(deletingRole.roleId)
      toast({ title: t('roleDeleted') })
      setConfirmDeleteOpen(false)
      setDeletingRole(null)
      await refresh()
    } catch (err) {
      toast({
        title: t('deleteFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  const roleUserCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const u of users) {
      const roleName = u.roles && u.roles.length > 0 ? u.roles[0].roleName : ""
      const role = (roleName ?? "").toUpperCase()
      map.set(role, (map.get(role) ?? 0) + 1)
    }
    return map
  }, [users])

  const recentRoleLogs = useMemo(() => {
    const filtered = auditLogs.filter((l) => {
      const entity = (l.entityName ?? "").toLowerCase()
      const action = (l.actionType ?? "").toLowerCase()
      return entity.includes("role") || action.includes("role")
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

  return (
    <motion.div
      initial="initial"
      animate="animate"
      className="flex-1 space-y-6 overflow-auto"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('roleManagement')}</h1>
          <p className="text-muted-foreground">{t('configureSystemRoles')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t('createRole')}
        </Button>
      </motion.div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createRole')}</DialogTitle>
            <DialogDescription>{t('createsViaRoles')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">{t('roleName')}</Label>
              <Input id="role-name" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="ADMIN" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={isSaving}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteRole')}</AlertDialogTitle>
            <AlertDialogDescription>
              {`${t('deleteRoleConfirm')} ${deletingRole?.roleName ?? ""}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDeleteRole}>{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Roles Grid */}
      <motion.div
        className="grid grid-cols-1 gap-2 md:gap-3 md:grid-cols-2"
      >
        {isFetching ? (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="py-3 text-muted-foreground">
                {t('loading')}
              </CardContent>
            </Card>
          </motion.div>
        ) : error ? (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="py-3 text-destructive">{error}</CardContent>
            </Card>
          </motion.div>
        ) : roles.length === 0 ? (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardContent className="py-3 text-muted-foreground">
                {t('noRoles')}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          paginatedRoles.map((role) => (
            <motion.div key={role.roleId} variants={fadeInUp}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm sm:text-lg">
                      {t(role.roleName.toLowerCase() + '_role') || role.roleName}
                    </CardTitle>
                    <CardDescription>
                      {t('descriptionNotAvaila')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        toast({
                          title: t('notAvailable'),
                          description:
                            t('roleEditingIsNotSupp'),
                          variant: "destructive",
                        })
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => askDeleteRole(role)}
                      disabled={(roleUserCounts.get((role.roleName ?? "").toUpperCase()) ?? 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {t('usersCount', { count: roleUserCounts.get((role.roleName ?? "").toUpperCase()) ?? 0 })}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Permissions:</p>
                  <div className="text-xs text-muted-foreground">
                    {t('permissionsAreNotExp')}
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))
        )}
      </motion.div>
      <PaginationControls />

      {/* Audit Trail */}
      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{t('roleManagementAudit')}</CardTitle>
            <CardDescription>{t('roleManagementAuditDesc') || t('changesToRolesAnd')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRoleLogs.length === 0 ? (
                <div className="py-1 px-2 text-[11px] text-xs text-muted-foreground">
                  {t('noRecentActivity')}
                </div>
              ) : (
                recentRoleLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-1 px-2 text-[11px] bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-foreground">{log.actionType || "—"}</p>
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
