import { useEffect } from 'react'
import { Alert, AppState } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { registerForPushNotifications } from '../lib/pushNotifications'

/**
 * Registers Expo push token for workers as soon as they are logged in.
 * Runs at app root (not only JobsScreen) so a token is saved reliably.
 */
export default function WorkerPushSetup() {
  const { profile } = useAuth()

  useEffect(() => {
    if (profile?.role !== 'worker' || !profile.id) {
      return undefined
    }

    let cancelled = false
    const userId = profile.id

    async function register(showAlertOnError) {
      const { error, token } = await registerForPushNotifications(userId)
      if (cancelled) return

      if (error && showAlertOnError) {
        Alert.alert('Push registration failed', error.message)
      } else if (token) {
        console.log('Push token saved to push_tokens')
      }
    }

    register(true)

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        register(false)
      }
    })

    return () => {
      cancelled = true
      appStateSub.remove()
    }
  }, [profile?.id, profile?.role])

  return null
}
