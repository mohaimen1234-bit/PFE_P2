"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Database, Plus, Edit, Trash2, Search, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"
import { usePagination } from "@/lib/hooks/use-pagination"
import { useAuth } from "@/lib/auth-context"
import { departmentsApi } from "@/lib/api/departments"
import { referenceDataApi } from "@/lib/api/reference-data"
import { equipmentApi } from "@/lib/api/equipment"
import { taskTemplatesApi } from "@/lib/api/task-templates"
import type { DepartmentResponse, EquipmentCategory, EquipmentModel, EquipmentResponse, TaskTemplateResponse } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { useToast } from "@/components/ui/use-toast"

type AddKind = "department" | "category" | "model" | "template"

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

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
}

export default function ReferenceDataPage() {
  const { t, language } = useI18n()
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { toast } = useToast()

  const [tab, setTab] = useState("departments")

  const [addOpen, setAddOpen] = useState(false)
  const [addKind, setAddKind] = useState<AddKind>("department")
  const [addName, setAddName] = useState("")
  const [tplCode, setTplCode] = useState("")
  const [tplDesc, setTplDesc] = useState("")
  const [tplItems, setTplItems] = useState<{ label: string; description: string; sortOrder: number; isRequired: boolean }[]>([])
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [models, setModels] = useState<EquipmentModel[]>([])
  const [equipment, setEquipment] = useState<EquipmentResponse[]>([])
  const [templates, setTemplates] = useState<TaskTemplateResponse[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = async (opts?: { keepLoadingState?: boolean }) => {
    const keepLoadingState = opts?.keepLoadingState ?? false
    if (!keepLoadingState) {
      setIsFetching(true)
      setError(null)
    }
    try {
      const [depsRes, catsRes, modelsRes, eqRes, templatesRes] = await Promise.all([
        departmentsApi.getAll(),
        referenceDataApi.getCategories(),
        referenceDataApi.getModels(),
        equipmentApi.getAll(),
        taskTemplatesApi.getAll(),
      ])
      setDepartments(depsRes)
      setCategories(catsRes)
      setModels(modelsRes)
      setEquipment(eqRes)
      setTemplates(templatesRes)
    } catch {
      setDepartments([])
      setCategories([])
      setModels([])
      setEquipment([])
      setError(t('failedToLoadReferenc'))
    } finally {
      if (!keepLoadingState) setIsFetching(false)
    }
  }

  const { paginatedItems: paginatedDepartments, PaginationControls: DeptPagination } = usePagination(departments, 10)
  const { paginatedItems: paginatedCategories, PaginationControls: CatPagination } = usePagination(categories, 10)
  const { paginatedItems: paginatedModels, PaginationControls: ModelPagination } = usePagination(models, 10)
  const { paginatedItems: paginatedTemplates, PaginationControls: TemplatePagination } = usePagination(templates, 10)

  useEffect(() => {
    if (isLoading) return
    if (user && !["ADMIN", "MAINTENANCE_MANAGER"].includes((user.roleName ?? "").toUpperCase())) {
      router.replace("/dashboard")
    }
  }, [isLoading, router, user])

  useEffect(() => {
    let cancelled = false
    setIsFetching(true)
    setError(null)
    const load = async () => {
      try {
        await loadAll({ keepLoadingState: true })
        if (cancelled) return
      } catch {
        if (cancelled) return
        setDepartments([])
        setCategories([])
        setModels([])
        setEquipment([])
        setError(t('failedToLoadReferenc'))
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [language])

  const openAdd = () => {
    if (tab === "categories") setAddKind("category")
    else if (tab === "models") setAddKind("model")
    else if (tab === "templates") {
      setAddKind("template")
      setEditingTemplateId(null)
      setTplCode(`TPL-${new Date().getTime().toString().slice(-6)}`)
      setTplDesc("")
      setTplItems([{ label: "", description: "", sortOrder: 1, isRequired: true }])
    }
    else setAddKind("department")
    setAddName("")
    setEditingTemplateId(null)
    setAddOpen(true)
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    const name = addName.trim()
    if (!name) {
      toast({
        title: t('nameIsRequired'),
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      if (addKind === "department") {
        await departmentsApi.create({ departmentName: name })
        toast({ title: t('departmentCreated') })
      } else if (addKind === "category") {
        await referenceDataApi.createCategory(name)
        toast({ title: t('categoryCreated') })
      } else if (addKind === "model") {
        await referenceDataApi.createModel(name)
        toast({ title: t('modelCreated') })
      } else if (addKind === "template") {
        const payload = {
          name,
          code: tplCode,
          description: tplDesc,
          defaultPriority: "MEDIUM",
          requiresValidation: false,
          requiresDocument: false,
          isActive: true,
          items: tplItems.filter(it => it.label.trim() !== "").map((it, idx) => ({ ...it, sortOrder: idx + 1 }))
        }

        if (editingTemplateId) {
          await taskTemplatesApi.update(editingTemplateId, payload)
          toast({ title: t('taskTemplateUpdated') })
        } else {
          await taskTemplatesApi.create(payload)
          toast({ title: t('taskTemplateCreated') })
        }
      }
      setAddOpen(false)
      await loadAll()
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

  const onDeleteDepartment = async (id: number) => {
    try {
      await departmentsApi.delete(id)
      toast({ title: t('departmentDeleted') })
      await loadAll()
    } catch (err) {
      toast({
        title: t('deleteFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  const onDeleteClassification = async (key: string) => {
    try {
      if (key.startsWith("cat-")) {
        const id = Number(key.replace("cat-", ""))
        await referenceDataApi.deleteCategory(id)
        toast({ title: t('categoryDeleted') })
      } else if (key.startsWith("model-")) {
        const id = Number(key.replace("model-", ""))
        await referenceDataApi.deleteModel(id)
        toast({ title: t('modelDeleted') })
      }
      await loadAll()
    } catch (err) {
      toast({
        title: t('deleteFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  const onEditTemplate = (tpl: TaskTemplateResponse) => {
    setTab("templates")
    setAddKind("template")
    setEditingTemplateId(tpl.id)
    setAddName(tpl.name)
    setTplCode(tpl.code)
    setTplDesc(tpl.description || "")
    setTplItems(tpl.items.map(it => ({
      label: it.label,
      description: it.description || "",
      sortOrder: it.sortOrder,
      isRequired: it.isRequired
    })))
    setAddOpen(true)
  }

  const onDeleteTemplate = async (id: number) => {
    try {
      await taskTemplatesApi.delete(id)
      toast({ title: t('taskTemplateDeleted') })
      await loadAll()
    } catch (err) {
      toast({
        title: t('deleteFailed'),
        description: getApiErrorMessage(err),
        variant: "destructive",
      })
    }
  }

  const categoryCounts = useMemo(() => {
    const map = new Map<number, number>()
    for (const e of equipment) {
      if (e.categoryId == null) continue
      map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + 1)
    }
    return map
  }, [equipment])

  const modelCounts = useMemo(() => {
    const map = new Map<number, number>()
    for (const e of equipment) {
      if (e.modelId == null) continue
      map.set(e.modelId, (map.get(e.modelId) ?? 0) + 1)
    }
    return map
  }, [equipment])

  const classificationRows = useMemo(() => {
    const rows: { key: string; name: string; category: string; count: number }[] = []
    for (const c of categories) {
      rows.push({
        key: `cat-${c.categoryId}`,
        name: c.name,
        category: t('category'),
        count: categoryCounts.get(c.categoryId) ?? 0,
      })
    }
    for (const m of models) {
      rows.push({
        key: `model-${m.modelId}`,
        name: m.name,
        category: t('model'),
        count: modelCounts.get(m.modelId) ?? 0,
      })
    }
    return rows
  }, [categories, categoryCounts, language, modelCounts, models])

  return (
    <motion.div
      initial="initial"
      animate="animate"
      className="flex-1 space-y-6 overflow-auto"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('referenceDataManage')}</h1>
          <p className="text-muted-foreground">{t('manageDepartmentsCat')}</p>
        </div>
        {tab !== "templates" && (
          <Button onClick={openAdd} disabled={isFetching}>
            <Plus className="h-4 w-4 me-2" />
            {t('addItem')}
          </Button>
        )}
      </motion.div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className={cn(
          "transition-all duration-300",
          addKind === "template" ? "sm:max-w-2xl md:max-w-3xl" : "sm:max-w-[425px]"
        )}>
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl">
              {editingTemplateId 
                ? (t('editTemplate'))
                : addKind === "department"
                  ? (t('addDepartment'))
                  : addKind === "category"
                    ? (t('addCategory'))
                    : addKind === "model"
                      ? (t('addModel'))
                      : (t('addTaskTemplate'))
              }
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingTemplateId
                ? (t('updateTemplateDetail'))
                : (t('createsItemsUsingThe'))
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onCreate} className="space-y-3 overflow-y-auto max-h-[70vh] pe-1 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-1">
              <div className="space-y-1.5">
                <Label htmlFor="add-name" className="text-xs font-medium">{t('name')}</Label>
                <Input
                  id="add-name"
                  value={addName}
                  className="h-9 text-xs"
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder={t('name')}
                />
              </div>

              {addKind === "template" && (
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-code" className="text-xs font-medium">{t('templateCode')}</Label>
                  <Input
                    id="tpl-code"
                    value={tplCode}
                    className="h-9 text-xs font-mono"
                    onChange={(e) => setTplCode(e.target.value)}
                    placeholder="TPL-001"
                  />
                </div>
              )}
            </div>

            {addKind === "template" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-desc" className="text-xs font-medium">{t('description')}</Label>
                  <Input
                    id="tpl-desc"
                    value={tplDesc}
                    className="h-9 text-xs"
                    onChange={(e) => setTplDesc(e.target.value)}
                    placeholder={t('templateDescription')}
                  />
                </div>
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-xs">{t('templateSteps')}</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => setTplItems([...tplItems, { label: "", description: "", sortOrder: tplItems.length + 1, isRequired: true }])}
                    >
                      <Plus className="h-3.5 w-3.5 me-1" />
                      {t('addStep')}
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pe-2 custom-scrollbar">
                    {tplItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-start p-3 bg-muted/20 rounded-lg border border-border/40 relative group transition-all hover:bg-muted/30">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary border border-primary/20 mt-1">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ms-0.5">
                                {t('stepTitle')}
                              </Label>
                              <Input
                                placeholder={t('eGCheckOilLevel')}
                                value={item.label}
                                className="h-8 bg-background/50 border-border/50 text-xs"
                                onChange={(e) => {
                                  const newItems = [...tplItems]
                                  newItems[idx].label = e.target.value
                                  setTplItems(newItems)
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ms-0.5">
                                {t('descriptionOptional')}
                              </Label>
                              <Input
                                placeholder={t('details')}
                                className="text-xs h-8 bg-background/50 border-border/50"
                                value={item.description}
                                onChange={(e) => {
                                  const newItems = [...tplItems]
                                  newItems[idx].description = e.target.value
                                  setTplItems(newItems)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => setTplItems(tplItems.filter((_, i) => i !== idx))}
                          disabled={tplItems.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={isSaving}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (t('saving')) : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <motion.div variants={fadeInUp}>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="departments">{t('departments')}</TabsTrigger>
            <TabsTrigger value="categories">{t('categories')}</TabsTrigger>
            <TabsTrigger value="models">{t('models')}</TabsTrigger>
            <TabsTrigger value="templates">{t('taskTemplates')}</TabsTrigger>
          </TabsList>

          {/* Departments Tab */}
          <TabsContent value="departments">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('department')}</th>
                        <th className="text-end py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isFetching ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={2}>
                            {t('loading')}
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-destructive" colSpan={2}>
                            {error}
                          </td>
                        </tr>
                      ) : departments.length === 0 ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={2}>
                            {t('noDepartments')}
                          </td>
                        </tr>
                      ) : (
                        paginatedDepartments.map((dept) => (
                          <tr key={dept.departmentId} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="py-1.5 px-2 text-[11px] text-foreground font-medium">{dept.departmentName}</td>
                            <td className="py-1.5 px-2 text-[11px] text-end">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive"
                                  onClick={() => onDeleteDepartment(dept.departmentId)}
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
                <DeptPagination />
              </CardContent>
            </Card>
          </TabsContent>


          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>{t('categories')}</CardTitle>
                <CardDescription>
                  {t('equipmentCategories')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('name')}</th>
                        <th className="text-end py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('equipmentCount')}</th>
                        <th className="text-end py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isFetching ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={3}>
                            {t('loading')}
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-destructive" colSpan={3}>
                            {error}
                          </td>
                        </tr>
                      ) : categories.length === 0 ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={3}>
                            {t('noCategories')}
                          </td>
                        </tr>
                      ) : (
                        paginatedCategories.map((cat) => (
                          <tr key={cat.categoryId} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="py-1.5 px-2 text-[11px] text-foreground font-medium">{cat.name}</td>
                            <td className="py-1.5 px-2 text-[11px] text-end text-muted-foreground">{categoryCounts.get(cat.categoryId) ?? 0}</td>
                            <td className="py-1.5 px-2 text-[11px] text-end">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive"
                                  onClick={() => onDeleteClassification(`cat-${cat.categoryId}`)}
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
                <CatPagination />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>{t('models')}</CardTitle>
                <CardDescription>
                  {t('equipmentModels')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('name')}</th>
                        <th className="text-end py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('equipmentCount')}</th>
                        <th className="text-end py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isFetching ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={3}>
                            {t('loading')}
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-destructive" colSpan={3}>
                            {error}
                          </td>
                        </tr>
                      ) : models.length === 0 ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={3}>
                            {t('noModels')}
                          </td>
                        </tr>
                      ) : (
                        paginatedModels.map((m) => (
                          <tr key={m.modelId} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="py-1.5 px-2 text-[11px] text-foreground font-medium">{m.name}</td>
                            <td className="py-1.5 px-2 text-[11px] text-end text-muted-foreground">{modelCounts.get(m.modelId) ?? 0}</td>
                            <td className="py-1.5 px-2 text-[11px] text-end">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive"
                                  onClick={() => onDeleteClassification(`model-${m.modelId}`)}
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
                <ModelPagination />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task Templates Tab */}
          <TabsContent value="templates">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('taskTemplates')}</CardTitle>
                    <CardDescription>
                      {t('reusableTaskListsFor')}
                    </CardDescription>
                  </div>
                  <Button onClick={openAdd} size="sm" className="bg-primary shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4 me-2" />
                    {t('newTemplate')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('name')}</th>
                        <th className="text-start py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('code')}</th>
                        <th className="text-end py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('steps')}</th>
                        <th className="text-end py-1.5 px-2 text-[11px] font-semibold text-foreground">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isFetching ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={4}>
                            {t('loading')}
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-destructive" colSpan={4}>
                            {error}
                          </td>
                        </tr>
                      ) : templates.length === 0 ? (
                        <tr>
                          <td className="py-1.5 px-2 text-[11px] text-muted-foreground" colSpan={4}>
                            {t('noTemplates')}
                          </td>
                        </tr>
                      ) : (
                        paginatedTemplates.map((tpl) => (
                          <tr key={tpl.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="py-1.5 px-2 text-[11px]">
                              <div className="font-medium text-foreground">{tpl.name}</div>
                              {tpl.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1">{tpl.description}</div>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-[11px] text-muted-foreground font-mono text-xs">{tpl.code}</td>
                            <td className="py-1.5 px-2 text-[11px] text-end text-muted-foreground">{tpl.items?.length ?? 0}</td>
                            <td className="py-1.5 px-2 text-[11px] text-end">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                                  onClick={() => onEditTemplate(tpl)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                  onClick={() => onDeleteTemplate(tpl.id)}
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
                <TemplatePagination />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
