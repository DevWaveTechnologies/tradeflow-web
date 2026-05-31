import { useCallback, useEffect, useState } from 'react'
import CreateJobForm from './CreateJobForm'
import JobListItem from './JobListItem'
import { useJobsRealtime } from '../hooks/useJobsRealtime'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [jobs, setJobs] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchJobs()
  }, [])

  const refreshJobs = useCallback(() => {
    fetchJobs()
  }, [])

  useJobsRealtime(refreshJobs)

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

  return (
    <>
      <CreateJobForm onCreated={fetchJobs} />

      {errorMessage ? (
        <p className="mt-4 text-red-600">{errorMessage}</p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {jobs.map((job) => (
          <JobListItem key={job.id} job={job} />
        ))}
      </ul>
    </>
  )
}
