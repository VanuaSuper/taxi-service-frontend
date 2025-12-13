import { useEffect } from 'react'
import type { PropsWithChildren, ReactElement } from 'react'
import { useAuthStore } from '../../shared/lib/stores/authStore'

export const StoreProvider = ({ children }: PropsWithChildren): ReactElement => {
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    checkAuth().catch(() => {})
  }, [checkAuth])

  return <>{children}</>
}
