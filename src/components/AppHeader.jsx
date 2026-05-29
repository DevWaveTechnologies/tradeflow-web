import { useAuth } from '../contexts/AuthContext'
import LogoutButton from './LogoutButton'

export default function AppHeader() {
  const { profile } = useAuth()

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-4 text-left">
      <div>
        <h1 className="text-3xl font-bold">TradeFlow</h1>
        {profile ? (
          <p className="mt-1 text-sm text-gray-600">
            {profile.name} · <span className="capitalize">{profile.role}</span>
          </p>
        ) : null}
      </div>
      <LogoutButton />
    </header>
  )
}
