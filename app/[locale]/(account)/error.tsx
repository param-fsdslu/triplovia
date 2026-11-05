'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AccountError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Account page failed:', error) }, [error])
  return <div role="alert" className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10">
    <h1 className="font-heading text-xl font-bold text-foreground">We couldn’t load this page</h1>
    <p className="mt-2 text-sm text-muted-foreground">Please try again. If this continues, contact support with the error shown in your browser console.</p>
    <div className="mt-5 flex flex-wrap justify-center gap-3">
      <Button onClick={reset}>Try again</Button>
      <Button variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
    </div>
  </div>
}
