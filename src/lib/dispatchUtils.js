export const UNASSIGNED_COLUMN = '__unassigned__'

export const DISPATCH_START_HOUR = 7
export const DISPATCH_END_HOUR = 18

export function buildTimeSlots() {
  const slots = []
  for (let hour = DISPATCH_START_HOUR; hour <= DISPATCH_END_HOUR; hour += 1) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
  }
  return slots
}

export function formatTimeSlotLabel(time) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function workerColumnId(assignedTo) {
  return assignedTo ?? UNASSIGNED_COLUMN
}

export function cellKey(columnId, time) {
  return `${columnId}|${time ?? ''}`
}

export function parseCellKey(key) {
  const [columnId, time] = key.split('|')
  return {
    columnId,
    time: time || null,
  }
}

export function jobsForCell(jobs, columnId, time) {
  return jobs.filter((job) => {
    if (workerColumnId(job.assigned_to) !== columnId) return false
    if (!time) return !job.scheduled_start_time
    return job.scheduled_start_time?.slice(0, 5) === time
  })
}

export function jobsWithoutTime(jobs, columnId) {
  return jobs.filter(
    (job) => workerColumnId(job.assigned_to) === columnId && !job.scheduled_start_time,
  )
}
