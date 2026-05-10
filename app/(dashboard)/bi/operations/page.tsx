"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"

export default function BiOperationsPage() {
  const { language, t } = useI18n()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('bIOperations')}</CardTitle>
          <CardDescription>
            {t('moduleNotAvailableNo')}
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  )
}
