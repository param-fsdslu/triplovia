'use client'

import { Button } from '@/components/ui/button'
import { Download, FileText } from '@/components/icons'
import { exportToCSV, exportToPDF, type ExportColumn } from '@/lib/utils/export'

interface ExportButtonsProps {
  rows: any[]
  columns: ExportColumn[]
  filenamePrefix: string
  title: string
}

export function ExportButtons({ rows, columns, filenamePrefix, title }: ExportButtonsProps) {
  const timestamp = new Date().toISOString().slice(0, 10)
  const filename = `${filenamePrefix}-${timestamp}`

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToCSV(rows, columns, filename)}
        disabled={rows.length === 0}
      >
        <Download className="h-4 w-4 mr-1" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToPDF(rows, columns, title)}
        disabled={rows.length === 0}
      >
        <FileText className="h-4 w-4 mr-1" />
        PDF
      </Button>
    </div>
  )
}
