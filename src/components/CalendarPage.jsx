import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  daysForWeek,
  formatPeriodLabel,
  formatShortDay,
  groupJobsByDate,
  isSameDay,
  isSameMonth,
  rangeForView,
  shiftAnchor,
  toDateKey,
  weeksForMonthGrid,
} from '../lib/calendarUtils'
import { formatScheduledTime, formatStatus } from '../lib/jobUtils'
import { useJobsRealtime } from '../hooks/useJobsRealtime'
import { supabase } from '../lib/supabase'

const VIEWS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

function JobChip({ job }) {
  const customer = job.companies?.name ?? 'No customer'
  const time = formatScheduledTime(job.scheduled_start_time)

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block rounded border border-gray-200 bg-white px-2 py-1.5 text-left text-xs hover:bg-gray-50"
    >
      {time ? <span className="font-medium text-gray-900">{time}</span> : null}
      <span className={time ? 'mt-0.5 block' : 'block'}>
        <span className="font-medium text-gray-900">{job.title}</span>
      </span>
      <span className="mt-0.5 block text-gray-500">
        {customer} · {formatStatus(job.status)}
      </span>
    </Link>
  )
}

function DayView({ date, jobsByDate }) {
  const key = toDateKey(date)
  const jobs = jobsByDate[key] ?? []

  return (
    <div className="mt-4 rounded-lg border bg-white p-4 text-left">
      {jobs.length === 0 ? (
        <p className="text-sm text-gray-500">No jobs scheduled for this day.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobChip job={job} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function WeekView({ anchor, jobsByDate, onSelectDay }) {
  const days = daysForWeek(anchor)

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-7">
      {days.map((day) => {
        const key = toDateKey(day)
        const jobs = jobsByDate[key] ?? []
        const today = isSameDay(day, new Date())

        return (
          <div
            key={key}
            className={`min-h-40 rounded-lg border bg-white p-3 text-left ${
              today ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className="mb-2 text-left text-sm font-semibold text-gray-900 hover:underline"
            >
              {formatShortDay(day)}
            </button>
            {jobs.length === 0 ? (
              <p className="text-xs text-gray-400">No jobs</p>
            ) : (
              <ul className="space-y-2">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <JobChip job={job} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MonthView({ anchor, jobsByDate, onSelectDay }) {
  const weeks = weeksForMonthGrid(anchor)
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[640px] rounded-lg border bg-white">
        <div className="grid grid-cols-7 border-b bg-gray-50 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
          {weekdayLabels.map((label) => (
            <div key={label} className="px-2 py-2">
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day) => {
              const key = toDateKey(day)
              const jobs = jobsByDate[key] ?? []
              const inMonth = isSameMonth(day, anchor)
              const today = isSameDay(day, new Date())

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={`min-h-28 border-r p-2 text-left last:border-r-0 hover:bg-gray-50 ${
                    inMonth ? 'bg-white' : 'bg-gray-50/80'
                  } ${today ? 'ring-1 ring-inset ring-gray-900' : ''}`}
                >
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                      today
                        ? 'bg-gray-900 font-semibold text-white'
                        : inMonth
                          ? 'font-medium text-gray-900'
                          : 'text-gray-400'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <ul className="mt-1 space-y-1">
                    {jobs.slice(0, 3).map((job) => (
                      <li
                        key={job.id}
                        className="truncate rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700"
                      >
                        {formatScheduledTime(job.scheduled_start_time)
                          ? `${formatScheduledTime(job.scheduled_start_time)} `
                          : ''}
                        {job.title}
                      </li>
                    ))}
                    {jobs.length > 3 ? (
                      <li className="text-[11px] text-gray-500">+{jobs.length - 3} more</li>
                    ) : null}
                  </ul>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const [view, setView] = useState('week')
  const [anchor, setAnchor] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchJobs = useCallback(async () => {
    setErrorMessage('')
    setLoading(true)

    const { start, end } = rangeForView(view, anchor)
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, status, scheduled_date, scheduled_start_time, companies(name)')
      .gte('scheduled_date', toDateKey(start))
      .lte('scheduled_date', toDateKey(end))
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true, nullsFirst: false })

    setLoading(false)

    if (error) {
      if (error.message.includes('scheduled_date')) {
        setErrorMessage(
          'Scheduling columns are missing. Run supabase/fix-jobs-scheduling.sql in the SQL Editor.',
        )
      } else {
        setErrorMessage(error.message)
      }
      setJobs([])
      return
    }

    setJobs(data ?? [])
  }, [view, anchor])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  useJobsRealtime(fetchJobs)

  const jobsByDate = useMemo(() => groupJobsByDate(jobs), [jobs])

  function handleSelectDay(day) {
    setAnchor(day)
    setView('day')
  }

  return (
    <section className="mt-4 text-left">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
          <p className="mt-1 text-sm text-gray-600">
            Scheduled jobs only — set a date when creating a job to book it here.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setView(option.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                view === option.id
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              setAnchor(today)
            }}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Next
          </button>
        </div>
        <p className="text-sm font-medium text-gray-900">{formatPeriodLabel(view, anchor)}</p>
      </div>

      {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}
      {loading ? <p className="mt-4 text-sm text-gray-500">Loading schedule…</p> : null}

      {!loading && !errorMessage ? (
        <>
          {view === 'day' ? <DayView date={anchor} jobsByDate={jobsByDate} /> : null}
          {view === 'week' ? (
            <WeekView anchor={anchor} jobsByDate={jobsByDate} onSelectDay={handleSelectDay} />
          ) : null}
          {view === 'month' ? (
            <MonthView anchor={anchor} jobsByDate={jobsByDate} onSelectDay={handleSelectDay} />
          ) : null}
        </>
      ) : null}

      {!loading && jobs.length === 0 && !errorMessage ? (
        <p className="mt-4 text-sm text-gray-500">
          No scheduled jobs in this period. Add a scheduled date on the Jobs tab when creating a
          job.
        </p>
      ) : null}
    </section>
  )
}
