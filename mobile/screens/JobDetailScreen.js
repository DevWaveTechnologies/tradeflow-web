import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'
import { formatJobDate, formatStatus, workerNameForJob } from '../lib/jobUtils'
import JobNotesSection from '../components/JobNotesSection'
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

    let query = supabase.from('jobs').update({ status }).eq('id', jobId)

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
    onUpdated?.()
  }

  async function assignWorker(workerId) {
    if (!isAdmin) return

    setErrorMessage('')
    setAssigning(true)

    const { error } = await supabase
      .from('jobs')
      .update({ assigned_to: workerId })
      .eq('id', jobId)

    setAssigning(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJob((current) => (current ? { ...current, assigned_to: workerId } : current))
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

  const description = job.notes?.trim() || '—'

  return (
    <View style={styles.flex}>
      <AppHeader title={job.title} subtitle="Job details" />
      <KeyboardAwareScreen contentContainerStyle={styles.body}>
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← Back to jobs</Text>
        </Pressable>

        <View style={styles.card}>
          <DetailRow label="Customer" value={job.companies?.name ?? '—'} />
          <DetailRow label="Description" value={description} />
          {job.address ? <DetailRow label="Job site" value={job.address} /> : null}
          <DetailRow label="Status" value={formatStatus(job.status)} />
          <DetailRow
            label="Assigned worker"
            value={workerNameForJob(job, workers)}
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

        <JobNotesSection jobId={jobId} authorId={profile.id} />
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
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
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
