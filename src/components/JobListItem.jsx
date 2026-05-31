import { Link } from 'react-router-dom'
import { formatStatus } from '../lib/jobUtils'

export default function JobListItem({ job }) {
  const customer = job.companies?.name ?? 'No customer'

  return (
    <li>
      <Link
        to={`/jobs/${job.id}`}
        className="block rounded border p-4 text-left transition hover:bg-gray-50"
      >
        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
        <p className="mt-1 text-sm text-gray-600">
          {customer} · <span className="capitalize">{formatStatus(job.status)}</span>
        </p>
      </Link>
    </li>
  )
}
