import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LogoutButton() {
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
    >
      {signingOut ? 'Logging out…' : 'Log out'}
    </button>
  )
}
