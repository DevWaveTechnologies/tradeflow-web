const PROFILE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isProfileUuid(value) {
  return typeof value === 'string' && PROFILE_UUID_RE.test(value)
}

export function formatStatus(status) {
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ')
}

export const JOB_STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Completed' },
]

export function normalizeJobStatus(status) {
  return status || 'pending'
}

export function filterJobs(jobs, { search = '', status = '', workerId = '' } = {}) {
  const query = search.trim().toLowerCase()

  return jobs.filter((job) => {
    if (status && normalizeJobStatus(job.status) !== status) {
      return false
    }

    if (workerId && job.assigned_to !== workerId) {
      return false
    }

    if (query) {
      const title = (job.title ?? '').toLowerCase()
      const customer = (job.companies?.name ?? '').toLowerCase()
      if (!title.includes(query) && !customer.includes(query)) {
        return false
      }
    }

    return true
  })
}

export function formatJobDate(isoDate) {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatScheduledDate(dateKey) {
  if (!dateKey) return '—'
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatScheduledTime(time) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatScheduledDateTime(dateKey, time) {
  if (!dateKey) return 'Not scheduled'
  const dateLabel = formatScheduledDate(dateKey)
  const timeLabel = formatScheduledTime(time)
  return timeLabel ? `${dateLabel} at ${timeLabel}` : dateLabel
}

export function formatNoteDate(isoDate) {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function workerNameForJob(job, workers = []) {
  if (!job.assigned_to) return 'Unassigned'
  return (
    workers.find((w) => w.id === job.assigned_to)?.name ??
    job.profiles?.name ??
    job.users?.name ??
    'Unknown worker'
  )
}
