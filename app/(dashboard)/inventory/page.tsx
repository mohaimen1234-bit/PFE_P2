"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  Trash2,
  Filter,
  Layers,
  MapPin,
  Truck,
  History,
  CheckCircle,
  XCircle,
  TrendingDown,
  DollarSign,
  CalendarDays,
  FileText,
  Upload
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AnimatedSection } from "@/components/ui/motion-fade"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ResponsiveDataTable,
  Column
} from "@/components/ui/responsive-data-table"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { inventoryApi } from "@/lib/api/inventory"
import type { SparePartResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { RouteGuard } from "@/components/auth/route-guard"
import { ROLES } from "@/lib/permissions"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function InventoryPage() {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER, ROLES.TECHNICIAN]}>
      <InventoryPageContent />
    </RouteGuard>
  )
}

function InventoryPageContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { t, isRTL } = useI18n()
  const [parts, setParts] = useState<SparePartResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  useEffect(() => {
    setCurrentPage(1)
  }, [search, categoryFilter])

  const [valuation, setValuation] = useState(0)
  const [pendingRestocks, setPendingRestocks] = useState<any[]>([])
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false)
  const [selectedPartForRestock, setSelectedPartForRestock] = useState<number | null>(null)
  const [restockQty, setRestockQty] = useState(10)

  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<any | null>(null)
  const [approvalQty, setApprovalQty] = useState<number>(0)

  const [isDirectAddDialogOpen, setIsDirectAddDialogOpen] = useState(false)
  const [selectedPartForDirectAdd, setSelectedPartForDirectAdd] = useState<number | null>(null)
  const [directAddQty, setDirectAddQty] = useState(10)

  const [newPart, setNewPart] = useState({
    name: "",
    sku: "",
    category: "",
    quantityInStock: 0,
    minStockLevel: 5,
    unitCost: 0,
    location: "",
    supplier: ""
  })

  const loadData = async () => {
    if (!isAuthenticated || !user) return
    setIsLoading(true)
    try {
      const isManager = user.hasRole(ROLES.ADMIN) || user.hasRole(ROLES.MAINTENANCE_MANAGER)
      
      const promises: [Promise<any>, Promise<any>, Promise<any>] = [
        inventoryApi.list(),
        isManager ? inventoryApi.getValuation() : Promise.resolve(0),
        isManager ? inventoryApi.getPendingRestocks() : Promise.resolve([])
      ]

      const [partsData, valuationData, pendingData] = await Promise.all(promises)
      
      setParts(partsData)
      setValuation(valuationData)
      setPendingRestocks(pendingData)
    } catch (error) {
      console.error("Failed to load inventory data", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, isAuthLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await inventoryApi.create(newPart)
      setIsDialogOpen(false)
      setNewPart({
        name: "",
        sku: "",
        category: "",
        quantityInStock: 0,
        minStockLevel: 5,
        unitCost: 0,
        location: "",
        supplier: ""
      })
      loadData()
    } catch (error) {
      console.error("Failed to add spare part", error)
    }
  }

  const handleCreateRestock = async () => {
    if (!selectedPartForRestock || !user?.id) return
    try {
      await inventoryApi.requestRestock(selectedPartForRestock, restockQty, user.id)
      setIsRestockDialogOpen(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleRejectRestock = async (requestId: number) => {
    try {
      await inventoryApi.deleteRestockRequest(requestId)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleApproveRestock = async () => {
    if (!selectedRequestForApproval) return
    try {
      await inventoryApi.approveRestock(selectedRequestForApproval.requestId, approvalQty)
      setIsApprovalDialogOpen(false)
      setSelectedRequestForApproval(null)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDirectAddStock = async () => {
    if (!selectedPartForDirectAdd) return
    try {
      await inventoryApi.adjustStock(selectedPartForDirectAdd, directAddQty, "ADD")
      setIsDirectAddDialogOpen(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const filteredParts = useMemo(() => {
    return parts.filter(part => {
      const matchesSearch = (part.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
                           (part.sku?.toLowerCase() || "").includes(search.toLowerCase())
      const matchesCategory = categoryFilter === "all" || part.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [parts, search, categoryFilter])

  const paginatedParts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredParts.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredParts, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredParts.length / itemsPerPage)

  const categories = useMemo(() => {
    const cats = new Set(parts.map(p => p.category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [parts])

  const getStockBadge = (part: SparePartResponse) => {
    const isLow = part.quantityInStock <= part.minStockLevel
    if (part.quantityInStock === 0) {
      return <Badge variant="destructive">{t('outOfStock')}</Badge>
    }
    if (isLow) {
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">{t('lowStock')}</Badge>
    }
    return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{t('inStock')}</Badge>
  }

  const columns: Column<SparePartResponse>[] = [
    { 
      header: t('partName'), 
      accessor: (part) => (
        <div className={cn(isRTL ? "text-right" : "text-left")}>
          <div className="font-medium text-sm">{part.name}</div>
          <div className="text-xs text-muted-foreground">{part.category}</div>
        </div>
      ),
      rtlOrder: 1
    },
    { 
      header: t('skuReference'), 
      accessor: (part) => <span className="font-mono text-xs">{part.sku}</span>,
      rtlOrder: 2
    },
    { 
      header: t('status'), 
      accessor: (part) => (
        <div className={cn(isRTL ? "text-right" : "text-left")}>
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm sm:text-lg">{part.quantityInStock}</span>
            {getStockBadge(part)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
            {t('min')}: {part.minStockLevel} {t('units')}
          </div>
        </div>
      ),
      rtlOrder: 3
    },
    { 
      header: t('location'), 
      accessor: (part) => (
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <MapPin className="h-3.5 w-3.5" />
          <span>{part.location || t('na')}</span>
        </div>
      ),
      rtlOrder: 4
    },
    { 
      header: t('unitCost'), 
      accessor: (part) => <span className="font-bold text-primary">${part.unitCost?.toFixed(2) || '0.00'}</span>,
      rtlOrder: 5
    },
    { 
      header: t('actions'), 
      accessor: (part) => (
        <div className={cn("flex gap-2", isRTL ? "justify-start" : "justify-end")}>
           <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-1 px-2 border border-transparent hover:border-amber-500/20 hover:text-amber-500 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              if (user?.hasRole(ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER)) {
                setSelectedPartForDirectAdd(part.partId)
                setDirectAddQty(10)
                setIsDirectAddDialogOpen(true)
              } else {
                setSelectedPartForRestock(part.partId)
                setRestockQty(10)
                setIsRestockDialogOpen(true)
              }
            }}
           >
            <History className="h-4 w-4" />
            {user?.hasRole(ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER) ? t('addDirectly') : t('restock')}
           </Button>
           <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
             <Edit2 className="h-4 w-4" />
           </Button>
        </div>
      ),
      className: isRTL ? "text-left" : "text-right",
      rtlOrder: 99
    }
  ]

  const renderMobileCard = (part: SparePartResponse) => (
    <div className={cn("space-y-3", isRTL ? "text-right" : "text-left")}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xs text-foreground">{part.name}</h3>
          <p className="text-[10px] text-muted-foreground">{part.category} • {part.sku}</p>
        </div>
        {getStockBadge(part)}
      </div>
      <div className="flex items-center justify-between py-2 border-y border-border/50">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{t('status')}</p>
          <p className="font-bold text-xs">{part.quantityInStock}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{t('location')}</p>
          <p className="font-medium text-xs">{part.location || t('na')}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">{t('unitCost')}</p>
          <p className="font-bold text-xs text-primary">${part.unitCost?.toFixed(2)}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          className="flex-1 h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20 border-none"
          onClick={() => {
            if (user?.hasRole(ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER)) {
              setSelectedPartForDirectAdd(part.partId)
              setIsDirectAddDialogOpen(true)
            } else {
              setSelectedPartForRestock(part.partId)
              setIsRestockDialogOpen(true)
            }
          }}
        >
          {user?.hasRole(ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER) ? t('addDirectly') : t('restock')}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex-1 space-y-4 p-3 md:p-3 sm:p-6 pt-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* KPIs */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card variant="glass" hover="lift" className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">{t('totalItems')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{parts.length}</div>
            <p className="text-xs text-muted-foreground">{t('activeInventory')}</p>
          </CardContent>
        </Card>
        <Card variant="glass" hover="lift" className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">{t('lowStock')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-500">
              {parts.filter(p => p.quantityInStock <= p.minStockLevel && p.quantityInStock > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">{t('requiresRestock')}</p>
          </CardContent>
        </Card>
        <Card variant="glass" hover="lift" className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">{t('outOfStock')}</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-500">
              {parts.filter(p => p.quantityInStock === 0).length}
            </div>
            <p className="text-xs text-muted-foreground">{t('immediateAction')}</p>
          </CardContent>
        </Card>
        <Card variant="glass" hover="lift" className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">{t('totalValuation')}</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-500">{valuation.toLocaleString()} DT</div>
            <p className="text-xs text-muted-foreground">{t('stockIntegrity')}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Restocks (Managers Only) */}
      {user?.hasRole(ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER) && pendingRestocks.length > 0 && (
        <motion.div variants={fadeInUp} initial="initial" animate="animate">
          <Card className="border-none bg-amber-50/50 dark:bg-amber-900/10 ring-1 ring-amber-500/20">
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {t('pendingReview')} ({pendingRestocks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-3">
               <div className="space-y-2">
                  {pendingRestocks.map((req) => (
                    <div key={req.requestId} className="flex items-center justify-between bg-background/80 p-3 rounded-lg border border-amber-500/10 text-xs shadow-sm">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Package className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <span className="font-bold">{req.partName}</span>
                            <span className="mx-2 text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{t('requested')}: <span className="font-bold text-foreground">{req.requestedQuantity}</span></span>
                            <span className="mx-2 text-muted-foreground">•</span>
                            <span className="text-[11px] text-muted-foreground italic">{t('by')} {req.requestedByUserName}</span>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            onClick={() => handleRejectRestock(req.requestId)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> {t('decline')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs border-amber-500/20 text-amber-700 dark:text-amber-500 hover:bg-amber-500/10"
                            onClick={() => {
                              setSelectedRequestForApproval(req)
                              setApprovalQty(req.requestedQuantity)
                              setIsApprovalDialogOpen(true)
                            }}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> {t('approve')}
                          </Button>
                       </div>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Content */}
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 md:gap-3">
          <div>
            <CardTitle>{t('inventory')}</CardTitle>
            <CardDescription>{t('manageHospitalSpareParts')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
             <div className="relative">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                <Input 
                  placeholder={t('searchByNameOrSKU')} 
                  className={cn("w-[250px] h-8 text-[13px] bg-muted/20 border-transparent hover:bg-muted/30 focus:border-primary/30 focus:bg-background transition-colors", isRTL ? "pr-9" : "pl-9")} 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-muted/20 border-transparent hover:bg-muted/30 text-[13px]">
                    <Filter className="h-3 w-3" />
                    {categoryFilter === 'all' ? t('allCategories') : categoryFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
                  <DropdownMenuItem onClick={() => setCategoryFilter("all")} className={categoryFilter === "all" ? "bg-muted font-bold" : ""}>
                    {t('allCategories')}
                  </DropdownMenuItem>
                  {categories.map(cat => (
                    <DropdownMenuItem 
                      key={cat} 
                      onClick={() => setCategoryFilter(cat)}
                      className={categoryFilter === cat ? "bg-muted font-bold" : ""}
                    >
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
             </DropdownMenu>
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                   <Button className="gap-2"><Plus className="h-4 w-4" /> {t('add')}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border shadow-2xl text-foreground">
                  <DialogHeader>
                    <DialogTitle>{t('registerSparePart')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {t('enrollNewItem')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 py-3" dir={isRTL ? "rtl" : "ltr"}>
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      <div className="grid gap-2">
                        <label className="text-xs font-medium">{t('partName')}</label>
                        <Input 
                          required 
                          placeholder="e.g. MRI Cooling Fan" 
                          value={newPart.name}
                          onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs font-medium">{t('skuReference')}</label>
                        <Input 
                          required 
                          placeholder="REF-123456" 
                          value={newPart.sku}
                          onChange={(e) => setNewPart({...newPart, sku: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      <div className="grid gap-2">
                        <label className="text-xs font-medium">{t('category')}</label>
                        <Input 
                          placeholder="e.g. Mechanical" 
                          value={newPart.category}
                          onChange={(e) => setNewPart({...newPart, category: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs font-medium">{t('unitCost')}</label>
                        <Input 
                          type="number"
                          step="0.01"
                          value={newPart.unitCost}
                          onChange={(e) => setNewPart({...newPart, unitCost: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                       <div className="grid gap-2">
                          <label className="text-xs font-medium">{t('initialStock')}</label>
                          <Input 
                            type="number" 
                            value={newPart.quantityInStock}
                            onChange={(e) => setNewPart({...newPart, quantityInStock: parseInt(e.target.value)})}
                          />
                       </div>
                       <div className="grid gap-2">
                          <label className="text-xs font-medium">{t('alertLevel')}</label>
                          <Input 
                            type="number" 
                            value={newPart.minStockLevel}
                            onChange={(e) => setNewPart({...newPart, minStockLevel: parseInt(e.target.value)})}
                          />
                       </div>
                    </div>
                    <div className="grid gap-2">
                       <label className="text-xs font-medium">{t('storageLocation')}</label>
                       <Input 
                        placeholder="Warehouse A, Shelf 4" 
                        value={newPart.location}
                        onChange={(e) => setNewPart({...newPart, location: e.target.value})}
                      />
                    </div>
                    <DialogFooter>
                       <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                       <Button type="submit">{t('save')}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
             </Dialog>
          </div>
        </CardHeader>
        <CardContent>
           <ResponsiveDataTable 
            columns={columns}
            data={paginatedParts}
            isLoading={isLoading}
            renderCard={renderMobileCard}
            isRtl={isRTL}
           />
           {/* Pagination */}
           <div className="flex items-center justify-between px-2 py-3 border-t border-border/50">
              <div className="text-xs text-muted-foreground">
                {t('showing')} {(currentPage-1)*itemsPerPage + 1} {t('to')} {Math.min(currentPage*itemsPerPage, filteredParts.length)} {t('of')} {filteredParts.length} {t('results')}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  {t('previous')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  {t('next')}
                </Button>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Restock Request Dialog */}
      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>{t('restock')}</DialogTitle>
               <DialogDescription>{t('restockDesc')}</DialogDescription>
            </DialogHeader>
            <div className="py-3 space-y-4">
               <div className="space-y-2">
                  <label className="text-xs font-medium">{t('quantity')}</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={restockQty} 
                    onChange={(e) => setRestockQty(parseInt(e.target.value))} 
                  />
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsRestockDialogOpen(false)}>{t('cancel')}</Button>
               <Button onClick={handleCreateRestock}>{t('submit')}</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Direct Add Dialog */}
      <Dialog open={isDirectAddDialogOpen} onOpenChange={setIsDirectAddDialogOpen}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>{t('quickStockAddition')}</DialogTitle>
               <DialogDescription>{t('directAddDesc')}</DialogDescription>
            </DialogHeader>
            <div className="py-3 space-y-4">
               <div className="space-y-2">
                  <label className="text-xs font-medium">{t('arrivalQuantity')}</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={directAddQty} 
                    onChange={(e) => setDirectAddQty(parseInt(e.target.value))} 
                  />
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsDirectAddDialogOpen(false)}>{t('cancel')}</Button>
               <Button onClick={handleDirectAddStock}>{t('confirmAndAdd')}</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>{t('approve')} {t('restock')}</DialogTitle>
               <DialogDescription>{t('confirmReceipt')}</DialogDescription>
            </DialogHeader>
            <div className="py-3 space-y-4">
               <div className="space-y-2">
                  <label className="text-xs font-medium">{t('quantity')}</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={approvalQty} 
                    onChange={(e) => setApprovalQty(parseInt(e.target.value))} 
                  />
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>{t('cancel')}</Button>
               <Button onClick={handleApproveRestock}>{t('approve')}</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  )
}
