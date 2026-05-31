import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatNoteDate } from '../lib/jobUtils'
import { fetchProfileNames } from '../lib/profileNames'

async function fetchNotesWithAuthors(jobId) {
  const { data: notes, error } = await supabase
    .from('job_notes')
    .select('id, body, created_at, author_id')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) {
    return { notes: [], error }
  }

  const rows = notes ?? []
  if (rows.length === 0) {
    return { notes: [], error: null }
  }

  const authorIds = [...new Set(rows.map((note) => note.author_id))]
  const nameById = await fetchProfileNames(supabase, authorIds)

  return {
    notes: rows.map((note) => ({
      ...note,
      authorName: nameById[note.author_id] ?? 'Unknown',
    })),
    error: null,
  }
}

export default function JobNotesSection({ jobId, authorId, onRecorded }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchNotes()
  }, [jobId])

  async function fetchNotes() {
    setLoading(true)
    const { notes: nextNotes, error } = await fetchNotesWithAuthors(jobId)
    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setNotes(nextNotes)
    setErrorMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    const trimmed = body.trim()
    if (!trimmed) {
      setErrorMessage('Enter a note before saving.')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from('job_notes').insert({
      job_id: jobId,
      author_id: authorId,
      body: trimmed,
    })

    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setBody('')
    await fetchNotes()
    onRecorded?.()
  }

  return (
    <section className="mt-8 text-left">
      <h3 className="text-lg font-semibold text-gray-900">Field notes</h3>
      <p className="mt-1 text-sm text-gray-600">
        Site log — e.g. &quot;Boiler inspected.&quot; or &quot;Need replacement valve.&quot;
      </p>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div className="rounded-lg border-2 border-gray-300 bg-white p-3">
          <label htmlFor="job-note-body" className="mb-2 block text-sm font-semibold text-gray-700">
            Add a note
          </label>
          <textarea
            id="job-note-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="Type your note here…"
            disabled={submitting}
            className="w-full resize-y rounded border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Add note'}
        </button>
      </form>

      <div className="mt-8">
        <p className="text-sm font-semibold text-gray-700">
          {loading ? 'Loading notes…' : `Previous notes (${notes.length})`}
        </p>

        {loading ? (
          <p className="mt-2 text-sm text-gray-500">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No notes yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg border bg-white px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900">{note.authorName}</span>
                  <time className="text-xs text-gray-500">{formatNoteDate(note.created_at)}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
