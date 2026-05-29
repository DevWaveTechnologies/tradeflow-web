import { useEffect, useState } from 'react'
import CreateJobForm from './components/CreateJobForm'
import JobCard from './components/JobCard'
import { supabase } from './lib/supabase'

function App() {
  const [jobs, setJobs] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchJobs()
  }, [])

  async function fetchJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, companies(name), users(name)')

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

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, status } : job)),
    )
  }

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">
        TradeFlow
      </h1>

      <CreateJobForm onCreated={fetchJobs} />

      {errorMessage ? (
        <p className="mt-4 text-red-600">{errorMessage}</p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onStatusChange={updateJobStatus} />
        ))}
      </ul>
    </div>
  )
}

export default App