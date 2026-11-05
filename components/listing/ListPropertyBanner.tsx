'use client'

import { useState } from 'react'
import { Building2 } from '@/components/icons'
import { ListPropertyDialog } from './ListPropertyDialog'

export function ListPropertyBanner() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <p className="text-sm text-muted-foreground text-center">
        <Building2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
        Own a hotel?{' '}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-primary font-medium hover:underline"
        >
          List your property with us
        </button>
      </p>
      <ListPropertyDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
