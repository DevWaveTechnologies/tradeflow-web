import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatJobDate, formatScheduledDateTime, formatStatus, workerNameForJob } from '../lib/jobUtils'
import JobNotesSection from '../components/JobNotesSection'
import JobPhotosSection from '../components/JobPhotosSection'
import JobActivitySection from '../components/JobActivitySection'

export default function JobDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [job, setJob] = useState(null)
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [activityRefreshKey, setActivityRefreshKey] = useState(0)

  function bumpActivity() {
    setActivityRefreshKey((key) => key + 1)
  }

  useEffect(() => {
    if (isAdmin) {
      fetchWorkers()
    }
    fetchJob()
  }, [id, isAdmin])

  async function fetchWorkers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'worker')
      .order('name')

    setWorkers(data ?? [])
  }

  async function fetchJob() {
    setLoading(true)
    setErrorMessage('')

    let query = supabase
      .from('jobs')
      .select('*, companies(id, name, phone, email, address)')
      .eq('id', id)

    if (!isAdmin && profile?.id) {
      query = query.eq('assigned_to', profile.id)
    }

    const { data, error } = await query.maybeSingle()

    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
      setJob(null)
      return
    }

    if (!data) {
      setErrorMessage('Job not found or you do not have access.')
      setJob(null)
      return
    }

    setJob(data)
  }

  async function updateJobStatus(status) {
    setErrorMessage('')
    setUpdatingStatus(true)

    let query = supabase.from('jobs').update({ status }).eq('id', id)

    if (!isAdmin) {
      query = query.eq('assigned_to', profile.id)
    }

    const { error } = await query
    setUpdatingStatus(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJob((current) => (current ? { ...current, status } : current))
    bumpActivity()
  }

  async function assignWorker(workerId) {
    if (!isAdmin) return

    setErrorMessage('')
    setAssigning(true)

    const { error } = await supabase
      .from('jobs')
      .update({ assigned_to: workerId })
      .eq('id', id)

    setAssigning(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJob((current) => (current ? { ...current, assigned_to: workerId } : current))
    bumpActivity()
  }

  if (loading) {
    return <p className="mt-6 text-sm text-gray-500">Loading job…</p>
  }

  if (!job) {
    return (
      <div className="mt-6 text-left">
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to jobs
        </Link>
        <p className="mt-4 text-red-600">{errorMessage || 'Job not found.'}</p>
      </div>
    )
  }

  const customer = job.companies?.name ?? '—'
  const description = job.notes?.trim() || '—'
  const worker = workerNameForJob(job, workers)

  return (
    <article className="mt-6 max-w-2xl text-left">
      <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to jobs
      </Link>

      <h2 className="mt-4 text-2xl font-bold text-gray-900">{job.title}</h2>

      <dl className="mt-6 divide-y rounded border bg-white">
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-gray-500">Customer</dt>
          <dd className="text-sm text-gray-900 sm:col-span-2">{customer}</dd>
        </div>
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-gray-500">Description</dt>
          <dd className="whitespace-pre-wrap text-sm text-gray-900 sm:col-span-2">
            {description}
          </dd>
        </div>
        {job.address ? (
          <div className="grid gap-1 px-4 py-4 sm:grid-cols-3">
            <dt className="text-sm font-medium text-gray-500">Job site</dt>
            <dd className="text-sm text-gray-900 sm:col-span-2">{job.address}</dd>
          </div>
        ) : null}
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-gray-500">Status</dt>
          <dd className="text-sm capitalize text-gray-900 sm:col-span-2">
            {formatStatus(job.status)}
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-gray-500">Assigned worker</dt>
          <dd className="text-sm text-gray-900 sm:col-span-2">{worker}</dd>
        </div>
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-gray-500">Scheduled</dt>
          <dd className="text-sm text-gray-900 sm:col-span-2">
            {formatScheduledDateTime(job.scheduled_date, job.scheduled_start_time)}
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-gray-500">Date</dt>
          <dd className="text-sm text-gray-900 sm:col-span-2">
            {formatJobDate(job.created_at)}
          </dd>
        </div>
      </dl>

      {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateJobStatus('in_progress')}
          disabled={job.status === 'in_progress' || updatingStatus}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
        >
          In Progress
        </button>
        <button
          type="button"
          onClick={() => updateJobStatus('done')}
          disabled={job.status === 'done' || updatingStatus}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
        >
          Done
        </button>
      </div>

      {isAdmin ? (
        <div className="mt-6 max-w-xs">
          <label htmlFor="assign-worker" className="mb-1 block text-sm font-medium">
            Assign to worker
          </label>
          <select
            id="assign-worker"
            value={job.assigned_to ?? ''}
            onChange={(event) => assignWorker(event.target.value || null)}
            disabled={assigning}
            className="w-full rounded border px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Unassigned</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <JobPhotosSection jobId={id} authorId={profile.id} onRecorded={bumpActivity} />
      <JobNotesSection jobId={id} authorId={profile.id} onRecorded={bumpActivity} />
      <JobActivitySection jobId={id} refreshKey={activityRefreshKey} />
    </article>
  )
}
