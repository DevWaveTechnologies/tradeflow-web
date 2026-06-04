import { formatStatus, isProfileUuid } from './jobUtils'
import { fetchProfileNames } from './profileNames'

export function formatActivityError(error) {
  if (!error) return ''

  const message = error.message ?? String(error)
  const code = error.code ?? ''

  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('job_activity') ||
    message.includes('get_job_activity_for_job') ||
    message.includes('schema cache')
  ) {
    return 'Activity history is not set up in Supabase. Run fix-job-activity.sql and fix-job-activity-actor-names.sql in the SQL Editor.'
  }

  return message
}

function workerLabel(workerId, nameById) {
  if (!workerId) return 'Unassigned'
  return nameById[workerId] ?? 'Unknown worker'
}

function statusLabel(status) {
  return formatStatus(status ?? 'pending')
}

function actorNameFor(row, nameById) {
  if (row.actor_name) return row.actor_name
  const meta = row.metadata ?? {}
  if (meta.actor_name) return meta.actor_name
  if (row.actor_id && nameById[row.actor_id]) return nameById[row.actor_id]
  if (!row.actor_id) return 'System'
  return 'Someone'
}

export function describeActivity(activity, nameById = {}) {
  const actor = actorNameFor(activity, nameById)
  const meta = activity.metadata ?? {}

  switch (activity.activity_type) {
    case 'job_created':
      return `${actor} created this job`
    case 'assignment_changed': {
      const from = workerLabel(meta.from, nameById)
      const to = workerLabel(meta.to, nameById)
      if (!meta.from && meta.to) {
        return `${actor} assigned ${to}`
      }
      if (meta.from && !meta.to) {
        return `${actor} unassigned ${from}`
      }
      return `${actor} reassigned from ${from} to ${to}`
    }
    case 'status_changed':
      return `${actor} changed status from ${statusLabel(meta.from)} to ${statusLabel(meta.to)}`
    case 'note_added':
      return meta.preview
        ? `${actor} added a note: “${meta.preview}”`
        : `${actor} added a note`
    case 'photo_uploaded': {
      const label = meta.photo_type === 'after' ? 'after' : 'before'
      return `${actor} uploaded a ${label} photo`
    }
    default:
      return `${actor} updated this job`
  }
}

export async function fetchJobActivityWithActors(supabase, jobId) {
  const { data: rpcRows, error: rpcError } = await supabase.rpc('get_job_activity_for_job', {
    p_job_id: jobId,
  })

  let activities = rpcRows
  let error = rpcError

  if (rpcError) {
    const result = await supabase
      .from('job_activity')
      .select('id, job_id, actor_id, activity_type, metadata, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    activities = result.data
    error = result.error
  }

  if (error) {
    return { activities: [], error }
  }

  const rows = activities ?? []
  if (rows.length === 0) {
    return { activities: [], error: null }
  }

  const profileIds = new Set()
  for (const row of rows) {
    if (isProfileUuid(row.actor_id)) profileIds.add(row.actor_id)
    if (row.activity_type === 'assignment_changed') {
      const meta = row.metadata ?? {}
      if (isProfileUuid(meta.from)) profileIds.add(meta.from)
      if (isProfileUuid(meta.to)) profileIds.add(meta.to)
    }
  }

  const nameById = await fetchProfileNames(supabase, [...profileIds])

  return {
    activities: rows.map((row) => {
      const actorName = actorNameFor(row, nameById)
      return {
        ...row,
        actorName,
        description: describeActivity({ ...row, actorName }, nameById),
      }
    }),
    error: null,
  }
}
