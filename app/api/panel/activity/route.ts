import { NextResponse } from 'next/server'
import { checkIsSuperAdmin } from '@/lib/utils/admin'
import { listActivity } from '@/lib/services/activity-log.service'
import { serverLog } from '@/lib/utils/server-log'

/**
 * The admin activity log for the panel's top-bar bell (super admins only, by request).
 * `?limit=40` (max 100), `?before=<created_at>` for older entries. A plain GET rather than a
 * server action so polling doesn't trigger the panel's loading box (AdminToaster).
 */
export async function GET(request: Request) {
  if (!(await checkIsSuperAdmin())) {
    return NextResponse.json({ success: false, error: 'Not allowed' }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '') || 40
    const before = searchParams.get('before') || undefined
    const entries = await listActivity({ limit, before })
    return NextResponse.json({ success: true, data: entries }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    serverLog.error('Activity log read failed:', error)
    return NextResponse.json({ success: false, error: 'Could not load activity' }, { status: 500 })
  }
}
