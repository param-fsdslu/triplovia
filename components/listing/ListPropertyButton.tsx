'use client'

import { useState, type ReactNode } from 'react'
import { ListPropertyDialog } from '@/components/listing/ListPropertyDialog'

/** Text button that opens the list-your-property enquiry dialog (usable from server components) */
export function ListPropertyButton({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <ListPropertyDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
