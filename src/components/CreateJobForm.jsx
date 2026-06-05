import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  emptyJobSiteForm,
  jobSiteFormHasValues,
  validateJobSiteForm,
} from '../lib/jobSiteAddress'
import JobSiteAddressFields from './JobSiteAddressFields'

export default function CreateJobForm({ onCreated }) {
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [companyId, setCompanyId] = useState('')
  const [title, setTitle] = useState('')
  const [jobSite, setJobSite] = useState(emptyJobSiteForm)
  const [jobSiteErrors, setJobSiteErrors] = useState({})
  const [notes, setNotes] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledStartTime, setScheduledStartTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    setLoadingCustomers(true)
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, address')
      .order('name')

    setLoadingCustomers(false)

    if (!error) {
      setCustomers(data ?? [])
    }
  }

  function handleCustomerChange(event) {
    const id = event.target.value
    setCompanyId(id)

    const customer = customers.find((c) => c.id === id)
    if (customer?.address && !jobSiteFormHasValues(jobSite)) {
      setJobSite({ ...emptyJobSiteForm(), line1: customer.address })
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!title.trim()) {
      setErrorMessage('Job title is required.')
      return
    }

    if (!companyId) {
      setErrorMessage('Select a customer for this job.')
      return
    }

    const addressValidation = validateJobSiteForm(jobSite)
    if (!addressValidation.valid) {
      setJobSiteErrors(addressValidation.errors)
      setErrorMessage('Fix the job site address before saving.')
      return
    }

    setJobSiteErrors({})
    setSubmitting(true)

    const { error } = await supabase.from('jobs').insert({
      title: title.trim(),
      company_id: companyId,
      ...addressValidation.payload,
      notes: notes.trim() || null,
      scheduled_date: scheduledDate || null,
      scheduled_start_time: scheduledStartTime || null,
    })

    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setCompanyId('')
    setTitle('')
    setJobSite(emptyJobSiteForm())
    setJobSiteErrors({})
    setNotes('')
    setScheduledDate('')
    setScheduledStartTime('')
    setSuccessMessage('Job created.')
    onCreated?.()
  }

  return (
    <section className="mt-8 rounded border p-6 text-left">
      <h2 className="text-xl font-semibold text-gray-900">Create job</h2>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="job-customer" className="mb-1 block text-sm font-medium">
            Customer <span className="text-red-600">*</span>
          </label>
          {loadingCustomers ? (
            <p className="text-sm text-gray-500">Loading customers…</p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-amber-700">
              No customers yet. Open the Customers tab and add one first.
            </p>
          ) : (
            <select
              id="job-customer"
              value={companyId}
              onChange={handleCustomerChange}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value="">Select customer…</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="job-title" className="mb-1 block text-sm font-medium">
            Title
          </label>
          <input
            id="job-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="e.g. Boiler repair"
            required
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-900">Job site address</p>
          <p className="mb-3 text-xs text-gray-500">
            Optional — can differ from the customer address. If you add any part, line 1 and a
            valid UK postcode are required.
          </p>
          <JobSiteAddressFields
            form={jobSite}
            onChange={(next) => {
              setJobSite(next)
              setJobSiteErrors({})
            }}
            errors={jobSiteErrors}
            idPrefix="create-job-site"
          />
        </div>

        <div>
          <label htmlFor="job-notes" className="mb-1 block text-sm font-medium">
            Notes
          </label>
          <textarea
            id="job-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded border px-3 py-2"
            rows={3}
            placeholder="e.g. Customer reports leak"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="job-scheduled-date" className="mb-1 block text-sm font-medium">
              Scheduled date
            </label>
            <input
              id="job-scheduled-date"
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="job-scheduled-time" className="mb-1 block text-sm font-medium">
              Start time
            </label>
            <input
              id="job-scheduled-time"
              type="time"
              value={scheduledStartTime}
              onChange={(event) => setScheduledStartTime(event.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Optional — scheduled jobs appear on the Calendar tab.
        </p>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

        <button
          type="submit"
          disabled={submitting || loadingCustomers || customers.length === 0}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Create job'}
        </button>
      </form>
    </section>
  )
}
