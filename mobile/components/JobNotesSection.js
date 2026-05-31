import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  InputAccessoryView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { formatNoteDate } from '../lib/jobUtils'
import { fetchProfileNames } from '../lib/profileNames'

const NOTE_ACCESSORY_ID = 'job-note-accessory'

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

  async function handleSubmit() {
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
    <View style={styles.section}>
      <Text style={styles.heading}>Field notes</Text>
      <Text style={styles.hint}>
        Site log — e.g. &quot;Boiler inspected.&quot; or &quot;Need replacement valve.&quot;
      </Text>

      <View style={styles.inputBox}>
        <View style={styles.inputHeader}>
          <Text style={styles.inputLabel}>Add a note</Text>
          {Platform.OS !== 'ios' ? (
            <Pressable
              style={[styles.headerButton, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.headerButtonText}>
                {submitting ? 'Saving…' : 'Add note'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <TextInput
          style={styles.textArea}
          value={body}
          onChangeText={setBody}
          placeholder="Type your note here…"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          editable={!submitting}
          inputAccessoryViewID={Platform.OS === 'ios' ? NOTE_ACCESSORY_ID : undefined}
        />

        {Platform.OS === 'ios' ? (
          <InputAccessoryView nativeID={NOTE_ACCESSORY_ID}>
            <View style={styles.accessoryBar}>
              <Pressable
                style={[styles.accessoryButton, submitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.accessoryButtonText}>
                  {submitting ? 'Saving…' : 'Add note'}
                </Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        ) : null}
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <View style={styles.listSection}>
        <Text style={styles.listHeading}>
          {loading ? 'Loading notes…' : `Previous notes (${notes.length})`}
        </Text>

        {loading ? (
          <ActivityIndicator color="#111827" style={styles.loader} />
        ) : notes.length === 0 ? (
          <Text style={styles.empty}>No notes yet.</Text>
        ) : (
          notes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteAuthor}>{note.authorName}</Text>
                <Text style={styles.noteTime}>{formatNoteDate(note.created_at)}</Text>
              </View>
              <Text style={styles.noteBody}>{note.body}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  hint: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  listSection: {
    marginTop: 24,
  },
  listHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  loader: {
    marginVertical: 8,
  },
  empty: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  noteAuthor: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  noteTime: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  noteBody: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  inputBox: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 12,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  headerButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
    height: 80,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accessoryButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  accessoryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  error: {
    marginTop: 8,
    color: '#dc2626',
    fontSize: 14,
  },
})
