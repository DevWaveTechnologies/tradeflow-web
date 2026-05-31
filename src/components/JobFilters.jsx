import { JOB_STATUS_FILTERS } from '../lib/jobUtils'

export default function JobFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  workerId,
  onWorkerIdChange,
  workers,
  showWorkerFilter = true,
}) {
  return (
    <section className="mt-6 rounded-lg border bg-white p-4 text-left">
      <h3 className="text-sm font-semibold text-gray-900">Search & filters</h3>

      <div className="mt-3">
        <label htmlFor="job-search" className="mb-1 block text-sm font-medium text-gray-700">
          Search
        </label>
        <input
          id="job-search"
          type="search"
          placeholder="Customer or job title…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Status</p>
        <div className="flex flex-wrap gap-2">
          {JOB_STATUS_FILTERS.map((option) => {
            const active = status === option.value
            return (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => onStatusChange(option.value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {showWorkerFilter ? (
        <div className="mt-4 max-w-xs">
          <label htmlFor="worker-filter" className="mb-1 block text-sm font-medium text-gray-700">
            Assigned worker
          </label>
          <select
            id="worker-filter"
            value={workerId}
            onChange={(event) => onWorkerIdChange(event.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">All workers</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </section>
  )
}
