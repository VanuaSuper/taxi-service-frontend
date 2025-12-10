import { Outlet } from 'react-router-dom'

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="py-4 text-center text-gray-600 text-sm">
        Taxi Service © {new Date().getFullYear()}
      </footer>
    </div>
  )
}