import { Suspense } from 'react'
import { PaymentsContent } from '@/components/admin/PaymentsContent'
import { Loader2 } from '@/components/icons'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Payment Transactions" description="View and manage all payment transactions" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <PaymentsContent />
      </Suspense>
    </div>
  )
}
