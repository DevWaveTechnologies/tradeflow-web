import { useCallback, useEffect, useMemo, useState } from 'react'
import CreateJobForm from './CreateJobForm'
import JobFilters from './JobFilters'
import JobListItem from './JobListItem'
import { useJobsRealtime } from '../hooks/useJobsRealtime'
import { filterJobs } from '../lib/jobUtils'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [jobs, setJobs] = useState([])
  const [workers, setWorkers] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [workerFilter, setWorkerFilter] = useState('')

  useEffect(() => {
    fetchJobs()
    fetchWorkers()
  }, [])

  const refreshJobs = useCallback(() => {
    fetchJobs()
  }, [])

  useJobsRealtime(refreshJobs)

  async function fetchWorkers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'worker')
      .order('name')

    setWorkers(data ?? [])
  }

  async function fetchJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, companies(id, name, phone, email, address)')
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJobs(data ?? [])
    setErrorMessage('')
  }

  const filteredJobs = useMemo(
    () =>
      filterJobs(jobs, {
        search,
        status: statusFilter,
        workerId: workerFilter,
      }),
    [jobs, search, statusFilter, workerFilter],
  )

  const hasActiveFilters = Boolean(search.trim() || statusFilter || workerFilter)

  return (
    <>
      <CreateJobForm onCreated={fetchJobs} />

      <JobFilters
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        workerId={workerFilter}
        onWorkerIdChange={setWorkerFilter}
        workers={workers}
      />

      {errorMessage ? (
        <p className="mt-4 text-red-600">{errorMessage}</p>
      ) : null}

      {hasActiveFilters ? (
        <p className="mt-4 text-left text-sm text-gray-600">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </p>
      ) : null}

      {filteredJobs.length === 0 ? (
        <p className="mt-6 text-left text-sm text-gray-500">
          {jobs.length === 0
            ? 'No jobs yet. Create one above.'
            : 'No jobs match your search or filters.'}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {filteredJobs.map((job) => (
            <JobListItem key={job.id} job={job} />
          ))}
        </ul>
      )}
    </>
  )
}
