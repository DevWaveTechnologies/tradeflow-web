import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'
import {
  formatJobDate,
  formatScheduledDateTime,
  formatStatus,
  scheduleDateInputValue,
  scheduleTimeInputValue,
  workerNameForJob,
} from '../lib/jobUtils'
import JobNotesSection from '../components/JobNotesSection'
import JobPhotosSection from '../components/JobPhotosSection'
import JobActivitySection from '../components/JobActivitySection'
import JobEditableRow, { EditActions, PencilButton } from '../components/JobEditableRow'
import CustomerContactActions from '../components/CustomerContactActions'
import MapsAction from '../components/MapsAction'
import KeyboardAwareScreen from '../components/KeyboardAwareScreen'

function DetailRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

export default function JobDetailScreen({ jobId, onBack, onUpdated }) {
  const { profile } = useAuth()
  const isAdmin = profile.role === 'admin'

  const [job, setJob] = useState(null)
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [activityRefreshKey, setActivityRefreshKey] = useState(0)
  const [editingField, setEditingField] = useState(null)
  const [savingField, setSavingField] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [draftAddress, setDraftAddress] = useState('')
  const [draftScheduledDate, setDraftScheduledDate] = useState('')
  const [draftScheduledTime, setDraftScheduledTime] = useState('')

  function bumpActivity() {
    setActivityRefreshKey((key) => key + 1)
  }

  function startEdit(field) {
    if (!job) return
    setEditingField(field)
    setDraftTitle(job.title ?? '')
    setDraftNotes(job.notes ?? '')
    setDraftAddress(job.address ?? '')
    setDraftScheduledDate(scheduleDateInputValue(job.scheduled_date))
    setDraftScheduledTime(scheduleTimeInputValue(job.scheduled_start_time))
    setErrorMessage('')
  }

  function cancelEdit() {
    setEditingField(null)
    setErrorMessage('')
  }

  async function saveField(field) {
    if (!job) return

    const payload = { last_updated_by: profile.id }

    if (field === 'title') {
      const title = draftTitle.trim()
      if (!title) {
        setErrorMessage('Title is required.')
        return
      }
      payload.title = title
    } else if (field === 'notes') {
      payload.notes = draftNotes.trim() || null
    } else if (field === 'address') {
      payload.address = draftAddress.trim() || null
    } else if (field === 'schedule') {
      payload.scheduled_date = draftScheduledDate.trim() || null
      payload.scheduled_start_time = draftScheduledTime.trim() || null
    }

    setSavingField(true)
    setErrorMessage('')

    const { error } = await supabase.from('jobs').update(payload).eq('id', jobId)

    setSavingField(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJob((current) => (current ? { ...current, ...payload } : current))
    setEditingField(null)
    bumpActivity()
    onUpdated?.()
  }

  useEffect(() => {
    if (isAdmin) {
      fetchWorkers()
    }
    fetchJob()
  }, [jobId, isAdmin])

  async function fetchWorkers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'worker')
      .order('name')

    setWorkers(data ?? [])
  }

  async function fetchJob() {
    setLoading(true)
    setErrorMessage('')

    let query = supabase
      .from('jobs')
      .select('*, companies(id, name, phone, email, address)')
      .eq('id', jobId)

    if (!isAdmin) {
      query = query.eq('assigned_to', profile.id)
    }

    const { data, error } = await query.maybeSingle()

    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
      setJob(null)
      return
    }

    if (!data) {
      setErrorMessage('Job not found or you do not have access.')
      setJob(null)
      return
    }

    setJob(data)
  }

  async function updateJobStatus(status) {
    setErrorMessage('')
    setUpdatingStatus(true)

    let query = supabase
      .from('jobs')
      .update({ status, last_updated_by: profile.id })
      .eq('id', jobId)

    if (!isAdmin) {
      query = query.eq('assigned_to', profile.id)
    }

    const { error } = await query
    setUpdatingStatus(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJob((current) => (current ? { ...current, status } : current))
    bumpActivity()
    onUpdated?.()
  }

  async function assignWorker(workerId) {
    if (!isAdmin) return

    setErrorMessage('')
    setAssigning(true)

    const { error } = await supabase
      .from('jobs')
      .update({ assigned_to: workerId, last_updated_by: profile.id })
      .eq('id', jobId)

    setAssigning(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJob((current) => (current ? { ...current, assigned_to: workerId } : current))
    bumpActivity()
    onUpdated?.()
  }

  if (loading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Job" subtitle="Loading…" />
        <ActivityIndicator style={styles.loader} size="large" color="#111827" />
      </View>
    )
  }

  if (!job) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Job" subtitle="Not found" />
        <View style={styles.body}>
          <Pressable onPress={onBack}>
            <Text style={styles.backLink}>← Back to jobs</Text>
          </Pressable>
          <Text style={styles.error}>{errorMessage || 'Job not found.'}</Text>
        </View>
      </View>
    )
  }

  const saveCancel = (field) => (
    <EditActions
      onSave={() => saveField(field)}
      onCancel={cancelEdit}
      saving={savingField}
    />
  )

  return (
    <View style={styles.flex}>
      <AppHeader title={job.title} subtitle="Job details" />
      <KeyboardAwareScreen contentContainerStyle={styles.body}>
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← Back to jobs</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Customer</Text>
            <Text style={styles.rowValue}>{job.companies?.name ?? '—'}</Text>
            <CustomerContactActions customer={job.companies} />
          </View>

          {isAdmin && editingField === 'title' ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={draftTitle}
                onChangeText={setDraftTitle}
                autoFocus
              />
              {saveCancel('title')}
            </View>
          ) : (
            <View style={styles.row}>
              <View style={styles.labelRow}>
                <Text style={styles.rowLabel}>Title</Text>
                {isAdmin ? (
                  <PencilButton onPress={() => startEdit('title')} label="Edit title" />
                ) : null}
              </View>
              <Text style={styles.rowValue}>{job.title}</Text>
            </View>
          )}

          <JobEditableRow
            label="Description"
            value={job.notes?.trim() || '—'}
            canEdit={isAdmin}
            isEditing={editingField === 'notes'}
            onEdit={() => startEdit('notes')}
            editor={
              <TextInput
                style={[styles.input, styles.textArea]}
                value={draftNotes}
                onChangeText={setDraftNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoFocus
              />
            }
            actions={saveCancel('notes')}
          />

          <JobEditableRow
            label="Job site"
            value={job.address?.trim() || '—'}
            footer={
              editingField !== 'address' ? (
                <MapsAction address={job.address} style={styles.mapsAction} />
              ) : null
            }
            canEdit={isAdmin}
            isEditing={editingField === 'address'}
            onEdit={() => startEdit('address')}
            editor={
              <TextInput
                style={styles.input}
                value={draftAddress}
                onChangeText={setDraftAddress}
                autoFocus
              />
            }
            actions={saveCancel('address')}
          />

          <DetailRow label="Status" value={formatStatus(job.status)} />
          <DetailRow label="Assigned worker" value={workerNameForJob(job, workers)} />

          <JobEditableRow
            label="Scheduled"
            value={formatScheduledDateTime(job.scheduled_date, job.scheduled_start_time)}
            canEdit={isAdmin}
            isEditing={editingField === 'schedule'}
            onEdit={() => startEdit('schedule')}
            editor={
              <>
                <TextInput
                  style={styles.input}
                  value={draftScheduledDate}
                  onChangeText={setDraftScheduledDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  value={draftScheduledTime}
                  onChangeText={setDraftScheduledTime}
                  placeholder="09:30"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                />
              </>
            }
            actions={saveCancel('schedule')}
          />

          <DetailRow label="Date" value={formatJobDate(job.created_at)} />
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            style={[
              styles.actionButton,
              job.status === 'in_progress' && styles.actionButtonDisabled,
            ]}
            onPress={() => updateJobStatus('in_progress')}
            disabled={job.status === 'in_progress' || updatingStatus}
          >
            <Text style={styles.actionButtonText}>In Progress</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, job.status === 'done' && styles.actionButtonDisabled]}
            onPress={() => updateJobStatus('done')}
            disabled={job.status === 'done' || updatingStatus}
          >
            <Text style={styles.actionButtonText}>Done</Text>
          </Pressable>
        </View>

        {isAdmin ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Assign to worker</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={job.assigned_to ?? ''}
                onValueChange={(value) => assignWorker(value === '' ? null : value)}
                enabled={!assigning}
                style={styles.picker}
              >
                <Picker.Item label="Unassigned" value="" />
                {workers.map((worker) => (
                  <Picker.Item key={worker.id} label={worker.name} value={worker.id} />
                ))}
              </Picker>
            </View>
          </View>
        ) : null}

        <JobPhotosSection jobId={jobId} authorId={profile.id} onRecorded={bumpActivity} />
        <JobNotesSection jobId={jobId} authorId={profile.id} onRecorded={bumpActivity} />
        <JobActivitySection jobId={jobId} refreshKey={activityRefreshKey} />
      </KeyboardAwareScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  body: {
    paddingHorizontal: 16,
  },
  backLink: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  rowValue: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },
  mapsAction: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111827',
  },
  textArea: {
    minHeight: 88,
  },
  loader: {
    marginTop: 40,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 48,
  },
})
