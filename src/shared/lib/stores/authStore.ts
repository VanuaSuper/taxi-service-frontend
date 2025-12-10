import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'customer' | 'driver' | null

interface AuthState {
  token: string | null
  userRole: UserRole
  userId: string | null
  setAuth: (token: string, role: UserRole, userId: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userRole: null,
      userId: null,
      setAuth: (token, role, userId) => set({ token, userRole: role, userId }),
      clearAuth: () => set({ token: null, userRole: null, userId: null })
    }),
    {
      name: 'auth-storage',
    }
  )
)