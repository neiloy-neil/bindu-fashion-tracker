'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Feature } from '@/lib/permission-types'

type PermissionMap = Record<Feature, boolean>

interface PermissionContextValue {
  permissions: PermissionMap | null
  hasPermission: (feature: Feature) => boolean
  loading: boolean
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: null,
  hasPermission: () => false,
  loading: true,
})

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionMap | null>(null)
  const [loading, setLoading] = useState(true)
  const { update, data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/me/permissions')
      .then(r => r.ok ? r.json() : null)
      .then(async (data) => {
        if (!data) return
        setPermissions(data)

        // Only sync JWT if permissions in session differ from DB
        const sessionPerms = (session?.user as any)?.permissions
        const changed = !sessionPerms || JSON.stringify(data) !== JSON.stringify(sessionPerms)
        if (changed) {
          await update()
          router.refresh()
        }
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function hasPermission(feature: Feature): boolean {
    if (!permissions) return false
    return permissions[feature] ?? false
  }

  return (
    <PermissionContext.Provider value={{ permissions, hasPermission, loading }}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermission(feature: Feature): boolean {
  return useContext(PermissionContext).hasPermission(feature)
}

export function usePermissions() {
  return useContext(PermissionContext)
}
