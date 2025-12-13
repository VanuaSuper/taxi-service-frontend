export type UserRole = 'customer' | 'driver'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  phone: string
}

export interface AuthResponse {
  user: AuthUser
}

export interface CustomerRegistrationData {
  email: string
  password: string
  name: string
  phone: string
}

export interface LoginPayload {
  email: string
  password: string
  role: UserRole
}
