import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import { USER_ROLES } from '../../shared/lib/constants/authConstants'
import { CustomerOrderMap } from '../../features/order-creation/CustomerOrderMap'

export function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated, userRole, isLoading, logout } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate('/auth')
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xl text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {userRole === USER_ROLES.CUSTOMER ? (
        <CustomerOrderMap />
      ) : (
        <div className="container py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4 text-gray-900">Главная</h1>
            <p className="text-gray-600 mb-8">
              {userRole === USER_ROLES.DRIVER ? 'Роль: водитель' : 'Неизвестная роль'}
            </p>

            <button onClick={logout} className="btn btn-outline px-6 py-3">
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  )
}