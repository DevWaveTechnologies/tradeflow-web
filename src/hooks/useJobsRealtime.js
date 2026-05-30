import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useJobsRealtime(onChange) {
  useEffect(() => {
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
  }, [onChange])
}
