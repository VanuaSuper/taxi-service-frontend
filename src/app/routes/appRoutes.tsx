import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '../components/RootLayout'
import { HomePage } from '../../pages/auth/HomePage'
import { AuthSelectionPage } from '../../pages/auth/AuthSelectionPage'
import { CustomerLoginPage } from '../../pages/auth/login/CustomerLoginPage'
import { DriverLoginPage } from '../../pages/auth/login/DriverLoginPage'
import { CustomerRegistrationPage } from '../../pages/auth/register/customer/CustomerRegistrationPage'
import { DriverRegistrationPage } from '../../pages/auth/register/driver/DriverRegistrationPage'

export const appRoutes = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'auth',
        element: <AuthSelectionPage />
      },
      {
        path: 'login',
        element: <CustomerLoginPage />
      },
      {
        path: 'driver/login',
        element: <DriverLoginPage />
      },
      {
        path: 'driver/register',
        element: <DriverRegistrationPage />
      },
      {
        path: 'register',
        element: <CustomerRegistrationPage />
      }
    ]
  }
])