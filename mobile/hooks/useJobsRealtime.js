import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useJobsRealtime(onChange, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          onChange()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onChange, enabled])
}
