import { useCallback, useEffect, useState } from 'react'
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
import JobListItem from '../components/JobListItem'
import JobDetailScreen from './JobDetailScreen'
import { useJobsRealtime } from '../hooks/useJobsRealtime'

export default function JobsScreen({ embedded = false, refreshKey = 0, onSubViewChange }) {
  const { profile } = useAuth()
  const isAdmin = profile.role === 'admin'
  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (embedded) {
      onSubViewChange?.(!!selectedJobId)
    }
  }, [embedded, selectedJobId, onSubViewChange])

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
    fetchJobs().finally(() => setLoading(false))
  }, [profile.id, profile.role, refreshKey])

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
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobListItem job={item} onPress={setSelectedJobId} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {isAdmin
                ? 'No jobs yet. Open the Create job tab to add one.'
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
