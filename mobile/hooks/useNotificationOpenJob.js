import { useEffect, useRef } from 'react'
import { addNotificationResponseListener } from '../lib/pushNotifications'

export default function useNotificationOpenJob(onOpenJob) {
  const onOpenJobRef = useRef(onOpenJob)

  useEffect(() => {
    onOpenJobRef.current = onOpenJob
  }, [onOpenJob])

  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const jobId = response.notification.request.content.data?.jobId
      if (jobId && onOpenJobRef.current) {
        onOpenJobRef.current(jobId)
      }
    })

    return () => subscription.remove()
  }, [])
}
