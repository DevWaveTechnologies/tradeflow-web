import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'

function formatStatus(status) {
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ')
}

export default function JobCard({
  job,
  workerName,
  showAssign = false,
  workers = [],
  onAssignWorker,
  onStatusChange,
  assigning = false,
  updatingStatus = false,
}) {
  return (
    <View style={styles.jobCard}>
      <Text style={styles.jobTitle}>{job.title}</Text>
      {job.companies?.name ? (
        <Text style={styles.jobMeta}>Customer: {job.companies.name}</Text>
      ) : null}
      <Text style={styles.jobMeta}>Status: {formatStatus(job.status)}</Text>
      {workerName ? <Text style={styles.jobMeta}>Worker: {workerName}</Text> : null}
      {job.address ? <Text style={styles.jobDetail}>{job.address}</Text> : null}
      {job.notes ? <Text style={styles.jobDetail}>{job.notes}</Text> : null}

      {showAssign ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Assign to worker</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={job.assigned_to ?? ''}
              onValueChange={(value) =>
                onAssignWorker(job.id, value === '' ? null : value)
              }
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

      <View style={styles.actions}>
        <Pressable
          style={[
            styles.actionButton,
            job.status === 'in_progress' && styles.actionButtonDisabled,
          ]}
          onPress={() => onStatusChange(job.id, 'in_progress')}
          disabled={job.status === 'in_progress' || updatingStatus}
        >
          <Text style={styles.actionButtonText}>In Progress</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, job.status === 'done' && styles.actionButtonDisabled]}
          onPress={() => onStatusChange(job.id, 'done')}
          disabled={job.status === 'done' || updatingStatus}
        >
          <Text style={styles.actionButtonText}>Done</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  jobMeta: {
    fontSize: 14,
    color: '#374151',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  jobDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
})
