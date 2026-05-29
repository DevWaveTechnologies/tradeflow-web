import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'
import JobCard from '../components/JobCard'

export default function JobsScreen() {
  const { profile } = useAuth()
  const isAdmin = profile.role === 'admin'
  const [jobs, setJobs] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [assigningJobId, setAssigningJobId] = useState(null)
  const [updatingJobId, setUpdatingJobId] = useState(null)

  async function fetchWorkers() {
    if (!isAdmin) return

    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'worker')
      .order('name')

    if (!error) {
      setWorkers(data ?? [])
    }
  }

  async function fetchJobs() {
    setErrorMessage('')

    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false })

    if (!isAdmin) {
      query = query.eq('assigned_to', profile.id)
    }

    const { data, error } = await query

    if (error) {
      setErrorMessage(error.message)
      setJobs([])
      return
    }

    setJobs(data ?? [])
  }

  async function loadAll() {
    await Promise.all([fetchWorkers(), fetchJobs()])
  }

  useEffect(() => {
    setLoading(true)
    loadAll().finally(() => setLoading(false))
  }, [profile.id, profile.role])

  async function handleRefresh() {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }

  async function updateJobStatus(jobId, status) {
    setErrorMessage('')
    setUpdatingJobId(jobId)

    let query = supabase.from('jobs').update({ status }).eq('id', jobId)

    if (!isAdmin) {
      query = query.eq('assigned_to', profile.id)
    }

    const { error } = await query
    setUpdatingJobId(null)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setJobs((current) =>
      current.map((job) => (job.id === jobId ? { ...job, status } : job)),
    )
  }

  async function assignWorker(jobId, workerId) {
    if (!isAdmin) return

    setErrorMessage('')
    setAssigningJobId(jobId)

    const previousJobs = jobs
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId ? { ...job, assigned_to: workerId } : job,
      ),
    )

    const { error } = await supabase
      .from('jobs')
      .update({ assigned_to: workerId })
      .eq('id', jobId)

    setAssigningJobId(null)

    if (error) {
      setJobs(previousJobs)
      setErrorMessage(error.message)
    }
  }

  function workerNameForJob(job) {
    if (!job.assigned_to) return 'Unassigned'
    return workers.find((w) => w.id === job.assigned_to)?.name ?? 'Assigned'
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title={isAdmin ? 'All Jobs' : 'My Jobs'}
        subtitle={isAdmin ? 'Admin view' : 'Assigned to you'}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#111827" />
      ) : errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              workerName={isAdmin ? workerNameForJob(item) : null}
              showAssign={isAdmin}
              workers={workers}
              onAssignWorker={assignWorker}
              onStatusChange={updateJobStatus}
              assigning={assigningJobId === item.id}
              updatingStatus={updatingJobId === item.id}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {isAdmin
                ? 'No jobs yet. Create jobs from the web admin.'
                : 'No jobs assigned to you yet. Ask admin to assign a job.'}
            </Text>
          }
          contentContainerStyle={
            jobs.length === 0 ? styles.emptyContainer : styles.list
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loader: {
    marginTop: 40,
  },
  error: {
    color: '#dc2626',
    marginTop: 16,
    marginHorizontal: 16,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
})
