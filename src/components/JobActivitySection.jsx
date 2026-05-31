import { useEffect, useState } from 'react'
import { formatNoteDate } from '../lib/jobUtils'
import { fetchJobActivityWithActors, formatActivityError } from '../lib/jobActivity'
import { supabase } from '../lib/supabase'

export default function JobActivitySection({ jobId, refreshKey = 0 }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadActivity()
  }, [jobId, refreshKey])

  async function loadActivity() {
    setLoading(true)
    const { activities: nextActivities, error } = await fetchJobActivityWithActors(supabase, jobId)
    setLoading(false)

    if (error) {
      setErrorMessage(formatActivityError(error))
      return
    }

    setActivities(nextActivities)
    setErrorMessage('')
  }

  return (
    <section className="mt-8 text-left">
      <h3 className="text-lg font-semibold text-gray-900">Activity</h3>
      <p className="mt-1 text-sm text-gray-600">Timeline of changes on this job.</p>

      {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
      {loading ? <p className="mt-4 text-sm text-gray-500">Loading activity…</p> : null}

      {!loading && activities.length === 0 && !errorMessage ? (
        <p className="mt-4 text-sm text-gray-500">No activity recorded yet.</p>
      ) : null}

      {!loading && activities.length > 0 ? (
        <ol className="relative mt-4 space-y-0 border-l border-gray-200 pl-6">
          {activities.map((activity, index) => (
            <li key={activity.id} className={`relative ${index < activities.length - 1 ? 'pb-6' : ''}`}>
              <span className="absolute -left-[1.625rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-gray-900 ring-1 ring-gray-200" />
              <time className="text-xs text-gray-500">{formatNoteDate(activity.created_at)}</time>
              <p className="mt-1 text-sm text-gray-800">{activity.description}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}
