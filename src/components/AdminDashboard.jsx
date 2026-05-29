import { useEffect, useState } from 'react'
import CreateJobForm from './CreateJobForm'
import JobCard from './JobCard'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [jobs, setJobs] = useState([])
  const [workers, setWorkers] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [assigningJobId, setAssigningJobId] = useState(null)

  useEffect(() => {
    fetchWorkers()
    fetchJobs()
  }, [])

  async function fetchJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJobs(data ?? [])
    setErrorMessage('')
  }

  async function fetchWorkers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('role', 'worker')
      .order('name')

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setWorkers(data ?? [])
  }

  async function updateJobStatus(jobId, status) {
    setErrorMessage('')

    const { error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', jobId)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, status } : job)),
    )
  }

  async function assignWorker(jobId, workerId) {
    setErrorMessage('')
    setAssigningJobId(jobId)

    const previousJobs = jobs
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId ? { ...job, assigned_to: workerId } : job,
      ),
    )

    const { error } = await supabase
      .from('jobs')
      .update({ assigned_to: workerId })
      .eq('id', jobId)

    setAssigningJobId(null)

    if (error) {
      setJobs(previousJobs)
      setErrorMessage(error.message)
      return
    }
  }

  return (
    <>
      <CreateJobForm onCreated={fetchJobs} />

      {errorMessage ? (
        <p className="mt-4 text-red-600">{errorMessage}</p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            workers={workers}
            onStatusChange={updateJobStatus}
            showAssign
            onAssignWorker={assignWorker}
            assigning={assigningJobId === job.id}
          />
        ))}
      </ul>
    </>
  )
}
