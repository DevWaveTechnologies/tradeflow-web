import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CustomerFormFields, {
  customerToForm,
  emptyCustomerForm,
  formToPayload,
} from './CustomerFormFields'

function CustomerDetailView({ customer }) {
  const rows = [
    ['Phone', customer.phone],
    ['Email', customer.email],
    ['Address', customer.address],
    ['Notes', customer.notes],
  ]

  return (
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) =>
        value ? (
          <div key={label} className={label === 'Notes' ? 'sm:col-span-2' : ''}>
            <dt className="font-medium text-gray-500">{label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">{value}</dd>
          </div>
        ) : null,
      )}
      {!customer.phone && !customer.email && !customer.address && !customer.notes ? (
        <p className="text-sm text-gray-500 sm:col-span-2">No extra details on file.</p>
      ) : null}
    </dl>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [mode, setMode] = useState('list')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyCustomerForm)

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, phone, email, address, notes')
      .order('name')

    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setCustomers(data ?? [])
    setErrorMessage('')
  }

  function clearMessages() {
    setErrorMessage('')
    setSuccessMessage('')
  }

  function openCreate() {
    clearMessages()
    setSelected(null)
    setForm(emptyCustomerForm())
    setMode('create')
  }

  function openView(customer) {
    clearMessages()
    setSelected(customer)
    setMode('view')
  }

  function openEdit(customer) {
    clearMessages()
    setSelected(customer)
    setForm(customerToForm(customer))
    setMode('edit')
  }

  function backToList() {
    clearMessages()
    setSelected(null)
    setMode('list')
  }

  async function handleCreate(event) {
    event.preventDefault()
    clearMessages()

    if (!form.name.trim()) {
      setErrorMessage('Customer name is required.')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase
      .from('companies')
      .insert(formToPayload(form))
      .select('id, name, phone, email, address, notes')
      .single()
    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setCustomers((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
    setSuccessMessage('Customer created.')
    openView(data)
  }

  async function handleUpdate(event) {
    event.preventDefault()
    clearMessages()

    if (!form.name.trim()) {
      setErrorMessage('Customer name is required.')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase
      .from('companies')
      .update(formToPayload(form))
      .eq('id', selected.id)
      .select('id, name, phone, email, address, notes')
      .single()
    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setCustomers((current) =>
      current
        .map((c) => (c.id === data.id ? data : c))
        .sort((a, b) => a.name.localeCompare(b.name)),
    )
    setSelected(data)
    setSuccessMessage('Customer updated.')
    setMode('view')
  }

  if (mode === 'create' || mode === 'edit') {
    const isEdit = mode === 'edit'
    return (
      <section className="text-left">
        <button
          type="button"
          onClick={backToList}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to customers
        </button>

        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          {isEdit ? 'Edit customer' : 'Create customer'}
        </h2>

        <form
          className="mt-4 max-w-lg rounded border p-6"
          onSubmit={isEdit ? handleUpdate : handleCreate}
        >
          <CustomerFormFields
            form={form}
            onChange={setForm}
            idPrefix={isEdit ? 'edit-customer' : 'new-customer'}
          />

          {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}
          {successMessage ? (
            <p className="mt-4 text-sm text-green-700">{successMessage}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}
            </button>
            <button
              type="button"
              onClick={isEdit && selected ? () => openView(selected) : backToList}
              className="rounded border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    )
  }

  if (mode === 'view' && selected) {
    return (
      <section className="text-left">
        <button
          type="button"
          onClick={backToList}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to customers
        </button>

        <div className="mt-4 rounded border p-6">
          <h2 className="text-xl font-semibold text-gray-900">{selected.name}</h2>
          <CustomerDetailView customer={selected} />

          {successMessage ? (
            <p className="mt-4 text-sm text-green-700">{successMessage}</p>
          ) : null}
          {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}

          <button
            type="button"
            onClick={() => openEdit(selected)}
            className="mt-6 rounded border px-4 py-2 text-sm font-medium"
          >
            Edit customer
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
        <button
          type="button"
          onClick={openCreate}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add customer
        </button>
      </div>

      {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}
      {successMessage ? <p className="mt-4 text-sm text-green-700">{successMessage}</p> : null}

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading customers…</p>
      ) : customers.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          No customers yet. Add one to link jobs to a customer instead of retyping details.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {customers.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => openView(customer)}
                className="w-full rounded border p-4 text-left hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{customer.name}</span>
                {customer.phone || customer.email ? (
                  <p className="mt-1 text-sm text-gray-600">
                    {[customer.phone, customer.email].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
