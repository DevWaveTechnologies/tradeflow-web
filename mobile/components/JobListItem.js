import { Pressable, StyleSheet, Text } from 'react-native'
import { formatStatus } from '../lib/jobUtils'

export default function JobListItem({ job, onPress }) {
  const customer = job.companies?.name ?? 'No customer'

  return (
    <Pressable style={styles.card} onPress={() => onPress(job.id)}>
      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.meta}>
        {customer} · <Text style={styles.status}>{formatStatus(job.status)}</Text>
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  meta: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  status: {
    textTransform: 'capitalize',
  },
})
