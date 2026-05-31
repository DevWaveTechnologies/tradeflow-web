import { Route, Routes } from 'react-router-dom'
import Login from './components/Login'
import AppHeader from './components/AppHeader'
import LogoutButton from './components/LogoutButton'
import AdminShell from './components/AdminShell'
import WorkerDashboard from './components/WorkerDashboard'
import JobDetailPage from './pages/JobDetailPage'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function AppContent() {
  const { session, profile, profileError, loading } = useAuth()

  if (loading) {
    return (
      <div className="p-10">
        <p>Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  if (!profile) {
    const authUserId = session.user.id
    const isRlsBlock = profileError.toLowerCase().includes('row-level security')

    return (
      <div className="p-10 text-left">
        <div className="mb-4 flex justify-end">
          <LogoutButton />
        </div>
        <h1 className="text-2xl font-bold">TradeFlow</h1>
        {isRlsBlock || profileError.toLowerCase().includes('infinite recursion') ? (
          <p className="mt-4 text-red-600">
            RLS policy error. Run <code>supabase/fix-users-profile-rls.sql</code> in the SQL
            Editor, add your user row below, then refresh.
          </p>
        ) : (
          <p className="mt-4 text-red-600">
            Signed in, but no matching row in <code>public.profiles</code>. Add a row with
            this id and role <code>admin</code> or <code>worker</code>:
          </p>
        )}
        <p className="mt-2 font-mono text-sm">{authUserId}</p>
        {profileError ? (
          <p className="mt-2 text-sm text-gray-600">{profileError}</p>
        ) : null}
      </div>
    )
  }

  if (profile.role !== 'admin' && profile.role !== 'worker') {
    return (
      <div className="p-10 text-left">
        <div className="mb-4 flex justify-end">
          <LogoutButton />
        </div>
        <h1 className="text-2xl font-bold">TradeFlow</h1>
        <p className="mt-4 text-red-600">
          Unknown role &quot;{profile.role}&quot;. Use <code>admin</code> or{' '}
          <code>worker</code> in the users table.
        </p>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/jobs/:id"
        element={
          <div className="p-10">
            <AppHeader />
            <JobDetailPage />
          </div>
        }
      />
      <Route
        path="*"
        element={
          <div className="p-10">
            <AppHeader />
            {profile.role === 'admin' ? (
              <AdminShell />
            ) : (
              <WorkerDashboard profile={profile} />
            )}
          </div>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
