import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CreateJobForm({ onCreated }) {
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!title.trim()) {
      setErrorMessage('Job title is required.')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from('jobs').insert({
      title: title.trim(),
      address: address.trim() || null,
      notes: notes.trim() || null,
    })

    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setTitle('')
    setAddress('')
    setNotes('')
    setSuccessMessage('Job created.')
    onCreated?.()
  }

  return (
    <section className="mt-8 rounded border p-6 text-left">
      <h2 className="text-xl font-semibold text-gray-900">Create job</h2>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
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
          <label htmlFor="job-address" className="mb-1 block text-sm font-medium">
            Address
          </label>
          <input
            id="job-address"
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="e.g. Swansea"
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

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Create job'}
        </button>
      </form>
    </section>
  )
}
