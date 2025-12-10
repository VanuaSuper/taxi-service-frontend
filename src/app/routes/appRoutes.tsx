import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '../components/RootLayout'
import { HomePage } from '../../pages/auth/HomePage'

export const appRoutes = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />
      }
    ]
  }
])