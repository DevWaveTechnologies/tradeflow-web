import { useCallback, useEffect, useMemo, useState } from 'react'
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
import JobFilters from '../components/JobFilters'
import JobListItem from '../components/JobListItem'
import JobDetailScreen from './JobDetailScreen'
import { useJobsRealtime } from '../hooks/useJobsRealtime'
import { filterJobs } from '../lib/jobUtils'
import useNotificationOpenJob from '../hooks/useNotificationOpenJob'
import WorkerPushStatus from '../components/WorkerPushStatus'

export default function JobsScreen({ embedded = false, refreshKey = 0, onSubViewChange }) {
  const { profile } = useAuth()
  const isAdmin = profile.role === 'admin'
  const [jobs, setJobs] = useState([])
  const [workers, setWorkers] = useState([])
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [workerFilter, setWorkerFilter] = useState('')

  useNotificationOpenJob(setSelectedJobId)

  useEffect(() => {
    if (embedded) {
      onSubViewChange?.(!!selectedJobId)
    }
  }, [embedded, selectedJobId, onSubViewChange])

  async function fetchWorkers() {
    if (!isAdmin) return

    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'worker')
      .order('name')

    setWorkers(data ?? [])
  }

  async function fetchJobs() {
    setErrorMessage('')

    let query = supabase
      .from('jobs')
      .select('*, companies(name)')
      .order('created_at', { ascending: false })

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

  useEffect(() => {
    setLoading(true)
    if (isAdmin) {
      fetchWorkers()
    }
    fetchJobs().finally(() => setLoading(false))
  }, [profile.id, profile.role, refreshKey, isAdmin])

  const filteredJobs = useMemo(
    () =>
      filterJobs(jobs, {
        search,
        status: statusFilter,
        workerId: isAdmin ? workerFilter : '',
      }),
    [jobs, isAdmin, search, statusFilter, workerFilter],
  )

  const hasActiveFilters = Boolean(
    search.trim() || statusFilter || (isAdmin && workerFilter),
  )

  const refreshJobs = useCallback(() => {
    fetchJobs()
  }, [profile.id, profile.role, isAdmin])

  useJobsRealtime(refreshJobs, isAdmin)

  async function handleRefresh() {
    setRefreshing(true)
    await fetchJobs()
    setRefreshing(false)
  }

  if (selectedJobId) {
    return (
      <JobDetailScreen
        jobId={selectedJobId}
        onBack={() => setSelectedJobId(null)}
        onUpdated={fetchJobs}
      />
    )
  }

  return (
    <View style={[styles.container, embedded && styles.embedded]}>
      {!embedded ? (
        <AppHeader
          title={isAdmin ? 'All Jobs' : 'My Jobs'}
          subtitle={isAdmin ? 'Admin view' : 'Assigned to you'}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#111827" />
      ) : errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobListItem job={item} onPress={setSelectedJobId} />
          )}
          ListHeaderComponent={
            <>
              {!isAdmin ? <WorkerPushStatus /> : null}
              <JobFilters
                search={search}
                onSearchChange={setSearch}
                status={statusFilter}
                onStatusChange={setStatusFilter}
                workerId={workerFilter}
                onWorkerIdChange={setWorkerFilter}
                workers={workers}
                showWorkerFilter={isAdmin}
              />
              {hasActiveFilters ? (
                <Text style={styles.filterSummary}>
                  Showing {filteredJobs.length} of {jobs.length} jobs
                </Text>
              ) : null}
            </>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {jobs.length === 0
                ? isAdmin
                  ? 'No jobs yet. Open the Create job tab to add one.'
                  : 'No jobs assigned to you yet. Ask admin to assign a job.'
                : 'No jobs match your search or filters.'}
            </Text>
          }
          contentContainerStyle={
            filteredJobs.length === 0
              ? styles.emptyContainerWithFilters
              : styles.list
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
  embedded: {
    flex: 1,
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
  filterSummary: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainerWithFilters: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
})
