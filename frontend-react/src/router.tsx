import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { AdminLayout } from './components/layout/AdminLayout'
import { LoadingSpinner } from './components/ui/LoadingSpinner'

const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Knowledge = lazy(() => import('./pages/Knowledge').then((m) => ({ default: m.Knowledge })))
const Flows = lazy(() => import('./pages/Flows').then((m) => ({ default: m.Flows })))
const Users = lazy(() => import('./pages/Users').then((m) => ({ default: m.Users })))
const Towers = lazy(() => import('./pages/Towers').then((m) => ({ default: m.Towers })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })))
const Companies = lazy(() => import('./pages/admin/Companies').then((m) => ({ default: m.Companies })))
const CompanyDetail = lazy(() => import('./pages/admin/CompanyDetail').then((m) => ({ default: m.CompanyDetail })))
const Leads = lazy(() => import('./pages/admin/Leads').then((m) => ({ default: m.Leads })))

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <LoadingSpinner />
    </div>
  )
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<Login />),
  },
  {
    path: '/landing',
    element: withSuspense(<Landing />),
  },
  {
    path: '/admin/login',
    element: withSuspense(<AdminLogin />),
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: withSuspense(<Dashboard />) },
      { path: 'knowledge', element: withSuspense(<Knowledge />) },
      { path: 'flows', element: withSuspense(<Flows />) },
      { path: 'users', element: withSuspense(<Users />) },
      { path: 'towers', element: withSuspense(<Towers />) },
      { path: 'settings', element: withSuspense(<Settings />) },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { path: 'companies', element: withSuspense(<Companies />) },
      { path: 'companies/:id', element: withSuspense(<CompanyDetail />) },
      { path: 'leads', element: withSuspense(<Leads />) },
    ],
  },
])
