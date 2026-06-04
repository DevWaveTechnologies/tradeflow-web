import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useAuth } from '../context/AuthContext'
import {
  addNotificationResponseListener,
  registerForPushNotifications,
} from '../lib/pushNotifications'

export default function usePushNotifications({ onOpenJob }) {
  const { session, profile } = useAuth()
  const onOpenJobRef = useRef(onOpenJob)

  useEffect(() => {
    onOpenJobRef.current = onOpenJob
  }, [onOpenJob])

  useEffect(() => {
    if (!session?.user?.id || profile?.role !== 'worker') {
      return undefined
    }

    let cancelled = false
    const userId = session.user.id

    async function register() {
      const { error } = await registerForPushNotifications(userId)
      if (error && !cancelled) {
        console.warn('Push registration:', error.message)
      }
    }

    register()

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        register()
      }
    })

    const subscription = addNotificationResponseListener((response) => {
      const jobId = response.notification.request.content.data?.jobId
      if (jobId && onOpenJobRef.current) {
        onOpenJobRef.current(jobId)
      }
    })

    return () => {
      cancelled = true
      appStateSub.remove()
      subscription.remove()
    }
  }, [session?.user?.id, profile?.role])
}
