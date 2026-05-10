"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Save, RefreshCw, Undo, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useColors, ColorSettings } from "@/lib/colors-context"
import { requestJson } from "@/lib/api/client"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// Contrast calculation utilities
function getLuminance(r: number, g: number, b: number) {
  const a = [r, g, b].map(function (v) {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

function hexToRgb(hex: string) {
  let r = 0, g = 0, b = 0
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16)
    g = parseInt(hex.substring(3, 5), 16)
    b = parseInt(hex.substring(5, 7), 16)
  }
  return { r, g, b }
}

function getContrastRatio(color1: string, color2: string) {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

function suggestTextColor(hexColor: string) {
  const rgb = hexToRgb(hexColor)
  const lum = getLuminance(rgb.r, rgb.g, rgb.b)
  return lum > 0.179 ? "#000000" : "#ffffff"
}

export default function ColorRulesPage() {
  const { t, isRTL } = useI18n()
  const { isAuthenticated } = useAuth()
  const { colors: contextColors, refreshColors } = useColors()
  
  const [localColors, setLocalColors] = useState<ColorSettings[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (contextColors.length > 0 && !hasChanges) {
      setLocalColors(JSON.parse(JSON.stringify(contextColors)))
    }
  }, [contextColors, hasChanges])

  const categories = useMemo(() => {
    const cats = new Set(localColors.map(c => c.category))
    return Array.from(cats)
  }, [localColors])

  const handleColorChange = (id: number, field: 'colorHex' | 'textColorHex' | 'active', value: any) => {
    setLocalColors(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, [field]: value }
        if (field === 'colorHex') {
          // Auto-suggest text color if it's currently hard to read or if they want auto
          const ratio = getContrastRatio(updated.colorHex, updated.textColorHex)
          if (ratio < 4.5) {
             updated.textColorHex = suggestTextColor(updated.colorHex)
          }
        }
        return updated
      }
      return c
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates = localColors.map(c => ({
        id: c.id,
        colorHex: c.colorHex,
        textColorHex: c.textColorHex,
        active: c.active
      }))
      
      await requestJson('/settings/colors', {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      })
      
      toast.success(t('colorSettingsSaved') || "Color settings saved successfully")
      setHasChanges(false)
      await refreshColors()
    } catch (err) {
      toast.error(t('failedToSaveColors') || "Failed to save color settings")
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetRow = async (id: number) => {
    try {
      await requestJson(`/settings/colors/${id}/reset`, {
        method: "POST"
      })
      toast.success(t('resetToDefaultSuccess') || "Reset to default successfully")
      await refreshColors()
      setHasChanges(false) // Will reload from context
    } catch (err) {
      toast.error(t('failedToResetColor') || "Failed to reset color")
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10" dir={isRTL ? "rtl" : "ltr"}>
      <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-3", isRTL && "sm:flex-row-reverse")}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t('colorRules')}</h1>
          <p className="text-muted-foreground mt-1">{t('colorRulesDescription') || "Manage global system colors for statuses, notifications, and indicators."}</p>
        </div>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          {hasChanges && (
            <span className="text-xs font-medium text-amber-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> {t('unsavedChanges')}
            </span>
          )}
          <Button variant="outline" onClick={() => {
            setLocalColors(JSON.parse(JSON.stringify(contextColors)))
            setHasChanges(false)
          }} disabled={!hasChanges}>
            {t('discard')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? <RefreshCw className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} /> : <Save className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />}
            {t('saveAndPublish')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className={isRTL ? "text-right" : ""}>
          <CardTitle>{t('systemColors')}</CardTitle>
          <CardDescription>
            {t('systemColorsDescription') || "These colors map to CSS variables and apply globally to Gantt charts, KPIs, badges, and calendar events."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={categories[0] || "STATUS"} dir={isRTL ? "rtl" : "ltr"}>
            <TabsList className={cn("mb-6 w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50", isRTL && "flex-row-reverse")}>
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="capitalize px-3 py-2">
                  {t(cat as any) || cat.replace(/_/g, ' ')}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {categories.map(category => (
              <TabsContent key={category} value={category} className="space-y-4">
                <div className="rounded-md border overflow-x-auto">
                  <table className={cn("w-full text-xs min-w-[800px]", isRTL ? "text-right" : "text-left")}>
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-3 py-3 border-b">{t('item')}</th>
                        <th className="px-3 py-3 border-b">{t('scope')}</th>
                        <th className="px-3 py-3 border-b">{t('backgroundColor')}</th>
                        <th className="px-3 py-3 border-b">{t('textColor')}</th>
                        <th className="px-3 py-3 border-b text-center">{t('contrast')}</th>
                        <th className="px-3 py-3 border-b text-center">{t('preview')}</th>
                        <th className="px-3 py-3 border-b text-center">{t('active')}</th>
                        <th className={cn("px-3 py-3 border-b", isRTL ? "text-left" : "text-right")}>{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {localColors.filter(c => c.category === category).map(setting => {
                        const contrastRatio = getContrastRatio(setting.colorHex, setting.textColorHex)
                        const isContrastGood = contrastRatio >= 4.5
                        
                        return (
                          <tr key={setting.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-3 font-medium">
                              {t(setting.itemKey as any) || setting.itemKey.replace(/_/g, ' ')}
                            </td>
                            <td className="px-3 py-3 text-muted-foreground text-xs">
                              <Badge variant="outline" className="text-[10px]">{t(setting.scope as any) || setting.scope}</Badge>
                            </td>
                            <td className="px-3 py-3">
                              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                                <Input 
                                  type="color" 
                                  value={setting.colorHex} 
                                  onChange={(e) => handleColorChange(setting.id, 'colorHex', e.target.value)}
                                  className="w-8 h-8 p-0 border-0 cursor-pointer rounded overflow-hidden"
                                />
                                <Input 
                                  type="text" 
                                  value={setting.colorHex} 
                                  onChange={(e) => handleColorChange(setting.id, 'colorHex', e.target.value)}
                                  className="w-24 h-8 font-mono text-xs"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                                <Input 
                                  type="color" 
                                  value={setting.textColorHex} 
                                  onChange={(e) => handleColorChange(setting.id, 'textColorHex', e.target.value)}
                                  className="w-8 h-8 p-0 border-0 cursor-pointer rounded overflow-hidden"
                                />
                                <Input 
                                  type="text" 
                                  value={setting.textColorHex} 
                                  onChange={(e) => handleColorChange(setting.id, 'textColorHex', e.target.value)}
                                  className="w-24 h-8 font-mono text-xs"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${isContrastGood ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {contrastRatio.toFixed(1)}:1
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div 
                                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap"
                                style={{ backgroundColor: setting.colorHex, color: setting.textColorHex }}
                              >
                                {t(setting.itemKey as any) || setting.itemKey.replace(/_/g, ' ')}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Switch 
                                checked={setting.active} 
                                onCheckedChange={(val) => handleColorChange(setting.id, 'active', val)}
                              />
                            </td>
                            <td className={cn("px-3 py-3", isRTL ? "text-left" : "text-right")}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleResetRow(setting.id)}
                                disabled={setting.isSystemDefault && !hasChanges}
                                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Undo className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} /> {t('reset')}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
