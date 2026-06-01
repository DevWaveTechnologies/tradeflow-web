export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key) {
  if (!key) return null
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfWeek(date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

export function endOfWeek(date) {
  return addDays(startOfWeek(date), 6)
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function rangeForView(view, anchor) {
  if (view === 'day') {
    return { start: anchor, end: anchor }
  }
  if (view === 'week') {
    return { start: startOfWeek(anchor), end: endOfWeek(anchor) }
  }
  return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
}

export function daysForWeek(anchor) {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function weeksForMonthGrid(anchor) {
  const monthStart = startOfMonth(anchor)
  const gridStart = startOfWeek(monthStart)
  const weeks = []

  for (let week = 0; week < 6; week += 1) {
    const days = []
    for (let day = 0; day < 7; day += 1) {
      days.push(addDays(gridStart, week * 7 + day))
    }
    weeks.push(days)
  }

  return weeks
}

export function formatDayHeading(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShortDay(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatMonthYear(date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function formatPeriodLabel(view, anchor) {
  if (view === 'day') {
    return formatDayHeading(anchor)
  }
  if (view === 'week') {
    const start = startOfWeek(anchor)
    const end = endOfWeek(anchor)
    const sameMonth = start.getMonth() === end.getMonth()
    const startLabel = start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    const endLabel = end.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${startLabel} – ${endLabel}`
  }
  return formatMonthYear(anchor)
}

export function shiftAnchor(view, anchor, direction) {
  const next = new Date(anchor)
  if (view === 'day') {
    next.setDate(next.getDate() + direction)
    return next
  }
  if (view === 'week') {
    next.setDate(next.getDate() + direction * 7)
    return next
  }
  next.setMonth(next.getMonth() + direction)
  return next
}

export function groupJobsByDate(jobs) {
  const grouped = {}

  for (const job of jobs) {
    if (!job.scheduled_date) continue
    const key = job.scheduled_date
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(job)
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      const timeA = a.scheduled_start_time ?? ''
      const timeB = b.scheduled_start_time ?? ''
      return timeA.localeCompare(timeB)
    })
  }

  return grouped
}

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b)
}

export function isSameMonth(day, anchor) {
  return day.getMonth() === anchor.getMonth() && day.getFullYear() === anchor.getFullYear()
}
