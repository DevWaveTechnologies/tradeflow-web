import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  formatJobDate,
  formatScheduledDateTime,
  formatStatus,
  scheduleDateInputValue,
  scheduleTimeInputValue,
  workerNameForJob,
} from '../lib/jobUtils'
import JobNotesSection from '../components/JobNotesSection'
import JobPhotosSection from '../components/JobPhotosSection'
import JobActivitySection from '../components/JobActivitySection'
import JobEditableField, { EditActions, PencilButton } from '../components/JobEditableField'
import CustomerContactActions from '../components/CustomerContactActions'
import MapsAction from '../components/MapsAction'

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [job, setJob] = useState(null)
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activityRefreshKey, setActivityRefreshKey] = useState(0)
  const [editingField, setEditingField] = useState(null)
  const [savingField, setSavingField] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [draftAddress, setDraftAddress] = useState('')
  const [draftScheduledDate, setDraftScheduledDate] = useState('')
  const [draftScheduledTime, setDraftScheduledTime] = useState('')

  function bumpActivity() {
    setActivityRefreshKey((key) => key + 1)
  }

  function startEdit(field) {
    if (!job) return
    setEditingField(field)
    setDraftTitle(job.title ?? '')
    setDraftNotes(job.notes ?? '')
    setDraftAddress(job.address ?? '')
    setDraftScheduledDate(scheduleDateInputValue(job.scheduled_date))
    setDraftScheduledTime(scheduleTimeInputValue(job.scheduled_start_time))
    setErrorMessage('')
  }

  function cancelEdit() {
    setEditingField(null)
    setErrorMessage('')
  }

  async function saveField(field) {
    if (!job || !profile?.id) return

    const payload = { last_updated_by: profile.id }

    if (field === 'title') {
      const title = draftTitle.trim()
      if (!title) {
        setErrorMessage('Title is required.')
        return
      }
      payload.title = title
    } else if (field === 'notes') {
      payload.notes = draftNotes.trim() || null
    } else if (field === 'address') {
      payload.address = draftAddress.trim() || null
    } else if (field === 'schedule') {
      payload.scheduled_date = draftScheduledDate || null
      payload.scheduled_start_time = draftScheduledTime || null
    }

    setSavingField(true)
    setErrorMessage('')

    const { error } = await supabase.from('jobs').update(payload).eq('id', id)

    setSavingField(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJob((current) => (current ? { ...current, ...payload } : current))
    setEditingField(null)
    bumpActivity()
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

    let query = supabase
      .from('jobs')
      .update({ status, last_updated_by: profile.id })
      .eq('id', id)

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
      .update({ assigned_to: workerId, last_updated_by: profile.id })
      .eq('id', id)

    setAssigning(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJob((current) => (current ? { ...current, assigned_to: workerId } : current))
    bumpActivity()
  }

  async function deleteJob() {
    if (!isAdmin || !job) return

    const confirmed = window.confirm(
      `Delete "${job.title}"? Notes, photos, and activity for this job will be removed.`,
    )
    if (!confirmed) return

    setErrorMessage('')
    setDeleting(true)

    const { error } = await supabase.from('jobs').delete().eq('id', id)

    setDeleting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    navigate('/')
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

  const customer = job.companies
  const customerName = customer?.name ?? '—'
  const description = job.notes?.trim() || '—'
  const worker = workerNameForJob(job, workers)
  const inputClass = 'w-full rounded border px-3 py-2 text-sm'

  return (
    <article className="mt-6 max-w-2xl text-left">
      <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
        ← Back to jobs
      </Link>

      <div className="mt-4 flex items-start gap-2">
        {isAdmin && editingField === 'title' ? (
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              className={inputClass}
              autoFocus
            />
            <EditActions
              onSave={() => saveField('title')}
              onCancel={cancelEdit}
              saving={savingField}
            />
          </div>
        ) : (
          <>
            <h2 className="flex-1 text-2xl font-bold text-gray-900">{job.title}</h2>
            {isAdmin ? (
              <PencilButton label="Edit title" onClick={() => startEdit('title')} />
            ) : null}
          </>
        )}
      </div>

      <dl className="mt-6 divide-y rounded border bg-white">
        <div className="grid gap-2 px-4 py-4 sm:grid-cols-3">
          <dt className="text-sm font-medium text-gray-500">Customer</dt>
          <dd className="space-y-2 text-sm text-gray-900 sm:col-span-2">
            <span>{customerName}</span>
            <CustomerContactActions customer={customer} />
          </dd>
        </div>

        <JobEditableField
          label="Description"
          canEdit={isAdmin}
          isEditing={editingField === 'notes'}
          onEdit={() => startEdit('notes')}
          display={<span className="whitespace-pre-wrap">{description}</span>}
          actions={
            <EditActions
              onSave={() => saveField('notes')}
              onCancel={cancelEdit}
              saving={savingField}
            />
          }
        >
          <textarea
            value={draftNotes}
            onChange={(event) => setDraftNotes(event.target.value)}
            className={inputClass}
            rows={3}
            autoFocus
          />
        </JobEditableField>

        <JobEditableField
          label="Job site"
          canEdit={isAdmin}
          isEditing={editingField === 'address'}
          onEdit={() => startEdit('address')}
          display={job.address?.trim() || '—'}
          footer={editingField !== 'address' ? <MapsAction address={job.address} /> : null}
          actions={
            <EditActions
              onSave={() => saveField('address')}
              onCancel={cancelEdit}
              saving={savingField}
            />
          }
        >
          <input
            type="text"
            value={draftAddress}
            onChange={(event) => setDraftAddress(event.target.value)}
            className={inputClass}
            autoFocus
          />
        </JobEditableField>

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

        <JobEditableField
          label="Scheduled"
          canEdit={isAdmin}
          isEditing={editingField === 'schedule'}
          onEdit={() => startEdit('schedule')}
          display={formatScheduledDateTime(job.scheduled_date, job.scheduled_start_time)}
          actions={
            <EditActions
              onSave={() => saveField('schedule')}
              onCancel={cancelEdit}
              saving={savingField}
            />
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="date"
              value={draftScheduledDate}
              onChange={(event) => setDraftScheduledDate(event.target.value)}
              className={inputClass}
            />
            <input
              type="time"
              value={draftScheduledTime}
              onChange={(event) => setDraftScheduledTime(event.target.value)}
              className={inputClass}
            />
          </div>
        </JobEditableField>

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

          <button
            type="button"
            onClick={deleteJob}
            disabled={deleting}
            className="mt-6 rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete job'}
          </button>
        </div>
      ) : null}

      <JobPhotosSection jobId={id} authorId={profile.id} onRecorded={bumpActivity} />
      <JobNotesSection jobId={id} authorId={profile.id} onRecorded={bumpActivity} />
      <JobActivitySection jobId={id} refreshKey={activityRefreshKey} />
    </article>
  )
}
