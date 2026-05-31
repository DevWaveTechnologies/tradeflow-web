import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { formatNoteDate } from '../lib/jobUtils'
import { fetchJobActivityWithActors, formatActivityError } from '../lib/jobActivity'
import { supabase } from '../lib/supabase'

export default function JobActivitySection({ jobId, refreshKey = 0 }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadActivity()
  }, [jobId, refreshKey])

  async function loadActivity() {
    setLoading(true)
    const { activities: nextActivities, error } = await fetchJobActivityWithActors(supabase, jobId)
    setLoading(false)

    if (error) {
      setErrorMessage(formatActivityError(error))
      return
    }

    setActivities(nextActivities)
    setErrorMessage('')
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Activity</Text>
      <Text style={styles.hint}>Timeline of changes on this job.</Text>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {loading ? <ActivityIndicator color="#111827" style={styles.loader} /> : null}

      {!loading && activities.length === 0 && !errorMessage ? (
        <Text style={styles.empty}>No activity recorded yet.</Text>
      ) : null}

      {!loading && activities.length > 0 ? (
        <View style={styles.timeline}>
          {activities.map((activity, index) => (
            <View key={activity.id} style={styles.item}>
              <View style={styles.markerColumn}>
                <View style={styles.dot} />
                {index < activities.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={styles.content}>
                <Text style={styles.time}>{formatNoteDate(activity.created_at)}</Text>
                <Text style={styles.description}>{activity.description}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    marginBottom: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  hint: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  error: {
    marginTop: 12,
    fontSize: 14,
    color: '#dc2626',
  },
  loader: {
    marginTop: 16,
  },
  empty: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  timeline: {
    marginTop: 12,
  },
  item: {
    flexDirection: 'row',
    minHeight: 48,
  },
  markerColumn: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111827',
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingBottom: 16,
    paddingLeft: 8,
  },
  time: {
    fontSize: 11,
    color: '#6b7280',
  },
  description: {
    marginTop: 4,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
})
