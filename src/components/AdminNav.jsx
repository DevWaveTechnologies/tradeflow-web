export default function AdminNav({ page, onPageChange }) {
  const linkClass = (id) =>
    `rounded px-4 py-2 text-sm font-medium ${
      page === id
        ? 'bg-gray-900 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b pb-4">
      <button type="button" className={linkClass('jobs')} onClick={() => onPageChange('jobs')}>
        Jobs
      </button>
      <button
        type="button"
        className={linkClass('calendar')}
        onClick={() => onPageChange('calendar')}
      >
        Calendar
      </button>
      <button
        type="button"
        className={linkClass('dispatch')}
        onClick={() => onPageChange('dispatch')}
      >
        Dispatch
      </button>
      <button
        type="button"
        className={linkClass('customers')}
        onClick={() => onPageChange('customers')}
      >
        Customers
      </button>
    </nav>
  )
}
