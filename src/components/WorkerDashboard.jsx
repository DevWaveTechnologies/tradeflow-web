import { useEffect, useMemo, useState } from 'react'
import JobFilters from './JobFilters'
import JobListItem from './JobListItem'
import { filterJobs } from '../lib/jobUtils'
import { supabase } from '../lib/supabase'

export default function WorkerDashboard({ profile }) {
  const [jobs, setJobs] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchJobs()
  }, [profile.id])

  async function fetchJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, companies(name, phone, email, address)')
      .eq('assigned_to', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJobs(data ?? [])
    setErrorMessage('')
  }

  const filteredJobs = useMemo(
    () => filterJobs(jobs, { search, status: statusFilter }),
    [jobs, search, statusFilter],
  )

  const hasActiveFilters = Boolean(search.trim() || statusFilter)

  return (
    <>
      <p className="mt-4 text-sm text-gray-600">Jobs assigned to you</p>

      <JobFilters
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        showWorkerFilter={false}
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
        <p className="mt-6 text-sm text-gray-500">
          {jobs.length === 0
            ? 'No jobs assigned yet.'
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
