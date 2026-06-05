import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { JOB_STATUS_FILTERS } from '../lib/jobUtils'

export default function JobFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  workerId,
  onWorkerIdChange,
  workers,
  showWorkerFilter = true,
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Search & filters</Text>

      <Text style={styles.label}>Search</Text>
      <TextInput
        style={styles.input}
        placeholder="Customer or job title…"
        value={search}
        onChangeText={onSearchChange}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <Text style={styles.label}>Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {JOB_STATUS_FILTERS.map((option) => {
          const active = status === option.value
          return (
            <Pressable
              key={option.value || 'all'}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onStatusChange(option.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {showWorkerFilter ? (
        <>
          <Text style={styles.label}>Assigned worker</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={workerId} onValueChange={onWorkerIdChange}>
              <Picker.Item label="All workers" value="" />
              {workers.map((worker) => (
                <Picker.Item key={worker.id} label={worker.name} value={worker.id} />
              ))}
            </Picker>
          </View>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
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
  },
  chipScroll: {
    flexGrow: 0,
  },
  chip: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
})
