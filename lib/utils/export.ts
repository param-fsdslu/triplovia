/**
 * Client-side CSV and PDF export utilities for admin tables.
 *
 * CSV: builds a comma-separated string, triggers a download via Blob URL.
 * PDF: renders an HTML table in a hidden iframe and invokes the browser print dialog.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExportColumn {
  /** Header label shown in the exported file */
  header: string
  /** Dot-path accessor or a function that extracts the cell value from a row */
  accessor: string | ((row: any) => string | number)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolvePath(obj: any, path: string): string {
  const val = path.split('.').reduce((o, k) => o?.[k], obj)
  return val == null ? '' : String(val)
}

function getCellValue(row: any, col: ExportColumn): string {
  if (typeof col.accessor === 'function') return String(col.accessor(row))
  return resolvePath(row, col.accessor)
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ── CSV Export ───────────────────────────────────────────────────────────────

export function exportToCSV(
  rows: any[],
  columns: ExportColumn[],
  filename: string
) {
  const header = columns.map((c) => escapeCSV(c.header)).join(',')
  const body = rows
    .map((row) =>
      columns.map((col) => escapeCSV(getCellValue(row, col))).join(',')
    )
    .join('\n')

  const csv = `${header}\n${body}`
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF Export (print-based) ─────────────────────────────────────────────────

export function exportToPDF(
  rows: any[],
  columns: ExportColumn[],
  title: string
) {
  const headerCells = columns
    .map(
      (c) =>
        `<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #107F78;font-size:12px;color:#107F78;white-space:nowrap">${c.header}</th>`
    )
    .join('')

  const bodyRows = rows
    .map(
      (row, i) =>
        `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">` +
        columns
          .map(
            (col) =>
              `<td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:11px">${getCellValue(row, col)}</td>`
          )
          .join('') +
        '</tr>'
    )
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    @page { size: landscape; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
    <h1 style="font-size:18px;font-weight:700;color:#107F78;margin:0">${title}</h1>
    <span style="font-size:11px;color:#666">Exported ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} &middot; ${rows.length} records</span>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;width:0;height:0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(html)
  doc.close()

  // Wait for content to render, then trigger print
  iframe.onload = () => {
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }
  // Fallback for browsers that fire onload before write
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe)
    }, 1000)
  }, 500)
}
