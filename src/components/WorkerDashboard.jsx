import { useEffect, useState } from 'react'
import JobCard from './JobCard'
import { supabase } from '../lib/supabase'

export default function WorkerDashboard({ profile }) {
  const [jobs, setJobs] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchJobs()
  }, [profile.id])

  async function fetchJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, companies(name), users(name)')
      .eq('assigned_to', profile.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJobs(data ?? [])
    setErrorMessage('')
  }

  async function updateJobStatus(jobId, status) {
    setErrorMessage('')

    const { error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', jobId)
      .eq('assigned_to', profile.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, status } : job)),
    )
  }

  return (
    <>
      <p className="mt-4 text-sm text-gray-600">Jobs assigned to you</p>

      {errorMessage ? (
        <p className="mt-4 text-red-600">{errorMessage}</p>
      ) : null}

      {jobs.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No jobs assigned yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onStatusChange={updateJobStatus}
              showAssignedWorker={false}
            />
          ))}
        </ul>
      )}
    </>
  )
}
