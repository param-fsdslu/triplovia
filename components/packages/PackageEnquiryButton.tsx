'use client'

import { useState, type ReactNode } from 'react'
import { PackageEnquiryDialog } from '@/components/packages/PackageEnquiryDialog'

/** Text button that opens the WhatsApp enquiry form for one package (usable from server components) */
export function PackageEnquiryButton({
  packageName,
  className,
  children,
}: {
  packageName: string
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <PackageEnquiryDialog packageName={packageName} open={open} onOpenChange={setOpen} />
    </>
  )
}
