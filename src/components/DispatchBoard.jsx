import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UNASSIGNED_COLUMN,
  buildTimeSlots,
  cellKey,
  formatTimeSlotLabel,
  jobsForCell,
  jobsWithoutTime,
} from '../lib/dispatchUtils'
import { formatDayHeading, shiftAnchor, toDateKey } from '../lib/calendarUtils'
import { formatStatus } from '../lib/jobUtils'
import { useJobsRealtime } from '../hooks/useJobsRealtime'
import { supabase } from '../lib/supabase'

function JobCard({ job, onDragStart, onDragEnd, isDragging }) {
  const customer = job.companies?.name ?? 'No customer'

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, job)}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded border bg-white p-2 text-left shadow-sm active:cursor-grabbing ${
        isDragging ? 'opacity-40' : 'hover:border-gray-400'
      }`}
    >
      <p className="text-sm font-semibold text-gray-900">{job.title}</p>
      <p className="mt-0.5 text-xs text-gray-600">{customer}</p>
      <p className="mt-0.5 text-xs capitalize text-gray-500">{formatStatus(job.status)}</p>
      <Link
        to={`/jobs/${job.id}`}
        className="mt-1 inline-block text-xs font-medium text-gray-700 hover:underline"
        draggable={false}
        onClick={(event) => event.stopPropagation()}
      >
        Open job →
      </Link>
    </div>
  )
}

function DropCell({ columnId, time, children, onDrop, isDragOver }) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDragEnter={(event) => {
        event.preventDefault()
        onDrop.setDragOver(cellKey(columnId, time))
      }}
      onDragLeave={() => onDrop.clearDragOver(cellKey(columnId, time))}
      onDrop={(event) => {
        event.preventDefault()
        onDrop.handle(columnId, time)
      }}
      className={`min-h-[4.5rem] border-b border-r border-gray-100 p-1 transition ${
        isDragOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'bg-white'
      }`}
      data-column={columnId}
      data-time={time ?? ''}
    >
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export default function DispatchBoard() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [workers, setWorkers] = useState([])
  const [scheduledJobs, setScheduledJobs] = useState([])
  const [poolJobs, setPoolJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [savingMessage, setSavingMessage] = useState('')
  const [draggedJob, setDraggedJob] = useState(null)
  const [dragOverCell, setDragOverCell] = useState(null)

  const dateKey = toDateKey(selectedDate)
  const timeSlots = useMemo(() => buildTimeSlots(), [])

  const columns = useMemo(
    () => [
      { id: UNASSIGNED_COLUMN, name: 'Unassigned' },
      ...workers.map((worker) => ({ id: worker.id, name: worker.name })),
    ],
    [workers],
  )

  const fetchBoard = useCallback(async () => {
    setErrorMessage('')
    setLoading(true)

    const [workersResult, scheduledResult, poolResult] = await Promise.all([
      supabase.from('profiles').select('id, name').eq('role', 'worker').order('name'),
      supabase
        .from('jobs')
        .select('id, title, status, assigned_to, scheduled_date, scheduled_start_time, companies(name)')
        .eq('scheduled_date', dateKey)
        .order('scheduled_start_time', { ascending: true, nullsFirst: true }),
      supabase
        .from('jobs')
        .select('id, title, status, assigned_to, scheduled_date, scheduled_start_time, companies(name)')
        .is('scheduled_date', null)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    setLoading(false)

    if (workersResult.error) {
      setErrorMessage(workersResult.error.message)
      return
    }

    if (scheduledResult.error) {
      if (scheduledResult.error.message.includes('scheduled_date')) {
        setErrorMessage(
          'Scheduling columns are missing. Run supabase/fix-jobs-scheduling.sql in the SQL Editor.',
        )
      } else {
        setErrorMessage(scheduledResult.error.message)
      }
      return
    }

    setWorkers(workersResult.data ?? [])
    setScheduledJobs(scheduledResult.data ?? [])
    setPoolJobs(poolResult.data ?? [])
  }, [dateKey])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  useJobsRealtime(fetchBoard)

  async function updateJobSchedule(job, columnId, time, date = dateKey) {
    if (!job) return

    setSavingMessage('Saving…')
    setErrorMessage('')

    const assigned_to = columnId === UNASSIGNED_COLUMN ? null : columnId

    const { error } = await supabase
      .from('jobs')
      .update({
        assigned_to,
        scheduled_date: date,
        scheduled_start_time: time || null,
      })
      .eq('id', job.id)

    setSavingMessage('')

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSavingMessage('Schedule updated.')
    setTimeout(() => setSavingMessage(''), 2000)
    await fetchBoard()
  }

  async function moveToPool(job) {
    if (!job) return

    setSavingMessage('Saving…')
    setErrorMessage('')

    const { error } = await supabase
      .from('jobs')
      .update({
        scheduled_date: null,
        scheduled_start_time: null,
      })
      .eq('id', job.id)

    setSavingMessage('')

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSavingMessage('Moved to backlog.')
    setTimeout(() => setSavingMessage(''), 2000)
    await fetchBoard()
  }

  function handleDragStart(event, job) {
    setDraggedJob(job)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', job.id)
  }

  function handleDragEnd() {
    setDraggedJob(null)
    setDragOverCell(null)
  }

  const dropHandlers = {
    setDragOver: (key) => setDragOverCell(key),
    clearDragOver: (key) => setDragOverCell((current) => (current === key ? null : current)),
    handle: (columnId, time) => {
      setDragOverCell(null)
      if (draggedJob) {
        updateJobSchedule(draggedJob, columnId, time)
      }
      setDraggedJob(null)
    },
  }

  return (
    <section className="mt-4 text-left">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dispatch board</h2>
          <p className="mt-1 max-w-xl text-sm text-gray-600">
            Drag jobs onto a worker and time slot to assign and schedule. Best on desktop — workers
            use the mobile app to view today&apos;s jobs and update status.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(shiftAnchor('day', selectedDate, -1))}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Previous day
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              setSelectedDate(today)
            }}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(shiftAnchor('day', selectedDate, 1))}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Next day
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">
            Date{' '}
            <input
              type="date"
              value={dateKey}
              onChange={(event) => {
                if (event.target.value) {
                  const [y, m, d] = event.target.value.split('-').map(Number)
                  setSelectedDate(new Date(y, m - 1, d))
                }
              }}
              className="ml-1 rounded border px-2 py-1 text-sm"
            />
          </label>
          <p className="text-sm font-medium text-gray-900">{formatDayHeading(selectedDate)}</p>
        </div>
      </div>

      {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}
      {savingMessage ? <p className="mt-4 text-sm text-gray-600">{savingMessage}</p> : null}
      {loading ? <p className="mt-4 text-sm text-gray-500">Loading dispatch board…</p> : null}

      {!loading ? (
        <>
          <div className="mt-6 hidden lg:block">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <div
                className="grid min-w-[900px]"
                style={{
                  gridTemplateColumns: `5rem repeat(${columns.length}, minmax(10rem, 1fr))`,
                }}
              >
                <div className="sticky left-0 border-b border-r bg-gray-50 p-2 text-xs font-semibold uppercase text-gray-500">
                  Time
                </div>
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="border-b border-r bg-gray-50 p-2 text-center text-sm font-semibold text-gray-900"
                  >
                    {column.name}
                  </div>
                ))}

                <div className="border-b border-r bg-gray-50 px-2 py-2 text-xs font-medium text-gray-600">
                  Any time
                </div>
                {columns.map((column) => (
                  <DropCell
                    key={`any-${column.id}`}
                    columnId={column.id}
                    time={null}
                    onDrop={dropHandlers}
                    isDragOver={dragOverCell === cellKey(column.id, null)}
                  >
                    {jobsWithoutTime(scheduledJobs, column.id).map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedJob?.id === job.id}
                      />
                    ))}
                  </DropCell>
                ))}

                {timeSlots.map((time) => (
                  <div key={time} className="contents">
                    <div className="border-b border-r bg-gray-50 px-2 py-3 text-xs font-medium text-gray-600">
                      {formatTimeSlotLabel(time)}
                    </div>
                    {columns.map((column) => (
                      <DropCell
                        key={`${column.id}-${time}`}
                        columnId={column.id}
                        time={time}
                        onDrop={dropHandlers}
                        isDragOver={dragOverCell === cellKey(column.id, time)}
                      >
                        {jobsForCell(scheduledJobs, column.id, time).map((job) => (
                          <JobCard
                            key={job.id}
                            job={job}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            isDragging={draggedJob?.id === job.id}
                          />
                        ))}
                      </DropCell>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-amber-800 lg:hidden">
            Open on a larger screen to use the drag-and-drop dispatch board.
          </p>

          <div
            className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4"
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (draggedJob) {
                moveToPool(draggedJob)
              }
              setDraggedJob(null)
            }}
          >
            <h3 className="text-sm font-semibold text-gray-900">To schedule (no date yet)</h3>
            <p className="mt-1 text-xs text-gray-600">
              Drag these onto the board to set the date, time, and worker.
            </p>
            {poolJobs.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No unscheduled jobs in the backlog.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {poolJobs.map((job) => (
                  <li key={job.id} className="w-48">
                    <JobCard
                      job={job}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedJob?.id === job.id}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}
