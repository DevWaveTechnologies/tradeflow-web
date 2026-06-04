import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatStatus } from '../lib/jobUtils'
import CustomerContactActions from './CustomerContactActions'

export default function JobListItem({ job, onPress }) {
  const customer = job.companies?.name ?? 'No customer'

  return (
    <View style={styles.card}>
      <Pressable onPress={() => onPress(job.id)}>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.meta}>
          {customer} · <Text style={styles.status}>{formatStatus(job.status)}</Text>
        </Text>
      </Pressable>
      <CustomerContactActions customer={job.companies} compact style={styles.actions} />
    </View>
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
  actions: {
    marginTop: 10,
  },
})
