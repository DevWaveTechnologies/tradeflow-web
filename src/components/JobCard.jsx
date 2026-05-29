function formatStatus(status) {
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ')
}

export default function JobCard({ job, onStatusChange }) {
  const customer = job.companies?.name ?? 'Unassigned'
  const worker = job.users?.name ?? 'Unassigned'

  return (
    <li className="rounded border p-4 text-left">
      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-gray-500">Customer</dt>
          <dd className="text-gray-900">{customer}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Status</dt>
          <dd className="capitalize text-gray-900">{formatStatus(job.status)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-gray-500">Assigned worker</dt>
          <dd className="text-gray-900">{worker}</dd>
        </div>
      </dl>

      {job.address || job.notes ? (
        <div className="mt-3 border-t pt-3 text-sm text-gray-600">
          {job.address ? <p>{job.address}</p> : null}
          {job.notes ? <p className={job.address ? 'mt-1' : ''}>{job.notes}</p> : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
        <button
          type="button"
          onClick={() => onStatusChange(job.id, 'in_progress')}
          disabled={job.status === 'in_progress'}
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
        >
          In Progress
        </button>
        <button
          type="button"
          onClick={() => onStatusChange(job.id, 'done')}
          disabled={job.status === 'done'}
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
        >
          Done
        </button>
      </div>
    </li>
  )
}
