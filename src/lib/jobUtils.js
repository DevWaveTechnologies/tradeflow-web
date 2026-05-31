export function formatStatus(status) {
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ')
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
