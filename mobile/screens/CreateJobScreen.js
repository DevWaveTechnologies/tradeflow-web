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
import KeyboardAwareScreen from '../components/KeyboardAwareScreen'

export default function CreateJobScreen({ onCreated }) {
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [companyId, setCompanyId] = useState('')
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledStartTime, setScheduledStartTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    setLoadingCustomers(true)
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, address')
      .order('name')

    setLoadingCustomers(false)

    if (!error) {
      setCustomers(data ?? [])
    }
  }

  function handleCustomerChange(customerId) {
    setCompanyId(customerId)

    const customer = customers.find((c) => c.id === customerId)
    if (customer?.address && !address.trim()) {
      setAddress(customer.address)
    }
  }

  async function handleCreate() {
    setErrorMessage('')
    setSuccessMessage('')

    if (!title.trim()) {
      setErrorMessage('Job title is required.')
      return
    }

    if (!companyId) {
      setErrorMessage('Select a customer for this job.')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from('jobs').insert({
      title: title.trim(),
      company_id: companyId,
      address: address.trim() || null,
      notes: notes.trim() || null,
      scheduled_date: scheduledDate.trim() || null,
      scheduled_start_time: scheduledStartTime.trim() || null,
    })

    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setCompanyId('')
    setTitle('')
    setAddress('')
    setNotes('')
    setScheduledDate('')
    setScheduledStartTime('')
    setSuccessMessage('Job created.')
    onCreated?.()
  }

  const canSubmit = !submitting && !loadingCustomers && customers.length > 0

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.heading}>Create job</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Customer *</Text>
            {loadingCustomers ? (
              <ActivityIndicator color="#111827" style={styles.loader} />
            ) : customers.length === 0 ? (
              <Text style={styles.hint}>
                No customers yet. Add one on the Customers tab first.
              </Text>
            ) : (
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={companyId}
                  onValueChange={(value) => handleCustomerChange(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select customer…" value="" />
                  {customers.map((customer) => (
                    <Picker.Item
                      key={customer.id}
                      label={customer.name}
                      value={customer.id}
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Boiler repair"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Job site address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Can differ from customer address"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="e.g. Customer reports leak"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Scheduled date</Text>
            <TextInput
              style={styles.input}
              value={scheduledDate}
              onChangeText={setScheduledDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Start time</Text>
            <TextInput
              style={styles.input}
              value={scheduledStartTime}
              onChangeText={setScheduledStartTime}
              placeholder="09:30"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
            />
          </View>
          <Text style={styles.hint}>Optional — scheduled jobs appear on the web Calendar tab.</Text>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          <Pressable
            style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={!canSubmit}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Saving…' : 'Create job'}
            </Text>
          </Pressable>
        </View>
    </KeyboardAwareScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
  loader: {
    marginVertical: 8,
  },
  hint: {
    fontSize: 14,
    color: '#b45309',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 8,
  },
  success: {
    color: '#15803d',
    fontSize: 14,
    marginBottom: 8,
  },
})
