import { useEffect, useState } from 'react'
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
      .select('*')

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJobs(data ?? [])
  }

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">
        TradeFlow
      </h1>
      {errorMessage ? (
        <p className="mt-4 text-red-600">{errorMessage}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className="rounded border p-4">
              <p className="font-semibold">{job.title}</p>
              {job.address ? <p className="text-sm text-gray-600">{job.address}</p> : null}
              {job.notes ? <p className="mt-1 text-sm">{job.notes}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App