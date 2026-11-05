'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ShieldCheck, ShieldOff } from '@/components/icons'
import { updateHotelAdminPermission } from '@/lib/actions/admin/permissions'
import {
  HOTEL_ADMIN_PERMISSION_LABELS,
  HOTEL_ADMIN_PERMISSION_DESCRIPTIONS,
  ALL_PERMISSION_KEYS,
  type HotelAdminPermission,
  type HotelAdminPermissionKey,
} from '@/lib/utils/hotelAdminPermissions'

interface HotelAdminPermissionsManagerProps {
  initialPermissions: HotelAdminPermission[]
}

export function HotelAdminPermissionsManager({
  initialPermissions,
}: HotelAdminPermissionsManagerProps) {
  // Build a map from the initial list; fill defaults for missing rows
  const buildMap = (list: HotelAdminPermission[]) => {
    const m = new Map<HotelAdminPermissionKey, HotelAdminPermission>()
    for (const p of list) m.set(p.permission_key, p)
    for (const key of ALL_PERMISSION_KEYS) {
      if (!m.has(key)) {
        m.set(key, {
          permission_key: key,
          enabled: true,
          requires_approval: false,
          updated_at: new Date().toISOString(),
        })
      }
    }
    return m
  }

  const [permissions, setPermissions] = useState(() => buildMap(initialPermissions))
  const [isPending, startTransition] = useTransition()
  const [loadingKey, setLoadingKey] = useState<HotelAdminPermissionKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<HotelAdminPermissionKey | null>(null)

  const handleToggle = (key: HotelAdminPermissionKey, field: 'enabled' | 'requires_approval', value: boolean) => {
    setError(null)
    setLastSaved(null)
    setLoadingKey(key)

    // Optimistic update
    setPermissions((prev) => {
      const next = new Map(prev)
      const existing = next.get(key)!
      next.set(key, { ...existing, [field]: value })
      return next
    })

    startTransition(async () => {
      const result = await updateHotelAdminPermission(key, { [field]: value })

      if (!result.success) {
        // Revert
        setPermissions((prev) => {
          const next = new Map(prev)
          const existing = next.get(key)!
          next.set(key, { ...existing, [field]: !value })
          return next
        })
        setError(result.error || 'Failed to update permission')
      } else {
        setLastSaved(key)
      }

      setLoadingKey(null)
    })
  }

  const enabledCount = ALL_PERMISSION_KEYS.filter((k) => permissions.get(k)?.enabled).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {enabledCount} of {ALL_PERMISSION_KEYS.length} permissions enabled for hotel admins
        </p>
        {isPending && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="divide-y rounded-lg border">
        {ALL_PERMISSION_KEYS.map((key) => {
          const perm = permissions.get(key)!
          const isLoading = loadingKey === key
          const justSaved = lastSaved === key

          return (
            <div key={key} className="flex items-start gap-4 p-4">
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                {perm.enabled ? (
                  <ShieldCheck className="h-5 w-5 text-primary" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* Label + description */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm font-medium cursor-pointer">
                    {HOTEL_ADMIN_PERMISSION_LABELS[key]}
                  </Label>
                  {justSaved && (
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                      Saved
                    </Badge>
                  )}
                  {!perm.enabled && (
                    <Badge variant="secondary" className="text-[10px]">
                      Restricted
                    </Badge>
                  )}
                  {perm.enabled && perm.requires_approval && (
                    <Badge variant="outline" className="text-[10px]">
                      Needs approval
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {HOTEL_ADMIN_PERMISSION_DESCRIPTIONS[key]}
                </p>

                {/* Requires-approval sub-toggle (only relevant when enabled) */}
                {perm.enabled && (
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      id={`${key}-approval`}
                      checked={perm.requires_approval}
                      onCheckedChange={(v: boolean) => handleToggle(key, 'requires_approval', v)}
                      disabled={isLoading || isPending}
                      className="scale-75 origin-left"
                    />
                    <label
                      htmlFor={`${key}-approval`}
                      className="text-xs text-muted-foreground cursor-pointer"
                    >
                      Require super admin approval before changes go live
                    </label>
                  </div>
                )}
              </div>

              {/* Main enabled toggle */}
              <div className="shrink-0 flex items-center gap-2">
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                <Switch
                  id={key}
                  checked={perm.enabled}
                  onCheckedChange={(v: boolean) => handleToggle(key, 'enabled', v)}
                  disabled={isLoading || isPending}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Changes take effect immediately. Super admins are never restricted by these settings.
      </p>
    </div>
  )
}
