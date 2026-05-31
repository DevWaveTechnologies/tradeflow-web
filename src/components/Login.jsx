import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import loginBackground from '../assets/Trafeflow login image.png'

function loginErrorMessage(error) {
  const message = error?.message ?? 'Sign in failed.'
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return 'Wrong email or password. Use the exact user from Supabase → Authentication → Users.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Email not confirmed. In Supabase, open the user and confirm their email, or turn off Confirm email under Sign In / Providers.'
  }
  if (lower.includes('email signups are disabled')) {
    return 'Sign-ups are disabled. Create the user in Supabase → Authentication → Users → Add user.'
  }

  return message
}

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSubmitting(true)

    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)

    if (error) {
      setErrorMessage(loginErrorMessage(error))
    }
  }

  return (
    <div className="relative min-h-svh w-full">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${loginBackground}")` }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 bg-black/35" aria-hidden="true" />

      <div className="relative z-10 flex min-h-svh items-center justify-center p-6">
        <section className="w-full max-w-md rounded-lg border border-white/30 bg-white/95 p-6 text-left shadow-xl backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-gray-900">TradeFlow</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sign in as admin or worker. Your role is set on your account in Supabase.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        </section>
      </div>
    </div>
  )
}
