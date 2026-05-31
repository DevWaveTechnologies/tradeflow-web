import { useState } from 'react'
import AdminNav from './AdminNav'
import AdminDashboard from './AdminDashboard'
import CustomersPage from './CustomersPage'

export default function AdminShell() {
  const [page, setPage] = useState('jobs')

  return (
    <>
      <AdminNav page={page} onPageChange={setPage} />
      {page === 'jobs' ? <AdminDashboard /> : <CustomersPage />}
    </>
  )
}
