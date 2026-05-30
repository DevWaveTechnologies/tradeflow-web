import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { customerToForm, emptyCustomerForm, formToPayload } from '../lib/customers'
import AppHeader from '../components/AppHeader'
import CustomerFormFields from '../components/CustomerFormFields'

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

export default function CustomersScreen({ embedded = false, onSubViewChange }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [mode, setMode] = useState('list')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyCustomerForm)

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (embedded) {
      onSubViewChange?.(mode !== 'list')
    }
  }, [embedded, mode, onSubViewChange])

  async function fetchCustomers() {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, phone, email, address, notes')
      .order('name')

    if (error) {
      setErrorMessage(error.message)
      setCustomers([])
      return
    }

    setCustomers(data ?? [])
    setErrorMessage('')
  }

  async function loadCustomers(showLoader = false) {
    if (showLoader) setLoading(true)
    await fetchCustomers()
    if (showLoader) setLoading(false)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await fetchCustomers()
    setRefreshing(false)
  }

  function clearMessages() {
    setErrorMessage('')
    setSuccessMessage('')
  }

  function backToList() {
    clearMessages()
    setSelected(null)
    setMode('list')
  }

  function openCreate() {
    clearMessages()
    setSelected(null)
    setForm(emptyCustomerForm())
    setMode('create')
  }

  function openView(customer) {
    clearMessages()
    setSelected(customer)
    setMode('view')
  }

  function openEdit(customer) {
    clearMessages()
    setSelected(customer)
    setForm(customerToForm(customer))
    setMode('edit')
  }

  async function handleCreate() {
    clearMessages()

    if (!form.name.trim()) {
      setErrorMessage('Customer name is required.')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase
      .from('companies')
      .insert(formToPayload(form))
      .select('id, name, phone, email, address, notes')
      .single()
    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setCustomers((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
    setSuccessMessage('Customer created.')
    openView(data)
  }

  async function handleUpdate() {
    clearMessages()

    if (!form.name.trim()) {
      setErrorMessage('Customer name is required.')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase
      .from('companies')
      .update(formToPayload(form))
      .eq('id', selected.id)
      .select('id, name, phone, email, address, notes')
      .single()
    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setCustomers((current) =>
      current.map((c) => (c.id === data.id ? data : c)).sort((a, b) => a.name.localeCompare(b.name)),
    )
    setSelected(data)
    setSuccessMessage('Customer updated.')
    setMode('view')
  }

  if (mode === 'create' || mode === 'edit') {
    const isEdit = mode === 'edit'
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppHeader title={isEdit ? 'Edit customer' : 'New customer'} subtitle="Admin" />
        <ScrollView
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={backToList}>
            <Text style={styles.backLink}>← Customers</Text>
          </Pressable>

          <View style={styles.card}>
            <CustomerFormFields form={form} onChange={setForm} />

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

            <View style={styles.actions}>
              <Pressable
                style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                onPress={isEdit ? handleUpdate : handleCreate}
                disabled={submitting}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={isEdit && selected ? () => openView(selected) : backToList}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  if (mode === 'view' && selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title={selected.name} subtitle="Customer" />
        <ScrollView contentContainerStyle={styles.formScroll}>
          <Pressable onPress={backToList}>
            <Text style={styles.backLink}>← Customers</Text>
          </Pressable>

          <View style={styles.card}>
            <DetailRow label="Phone" value={selected.phone} />
            <DetailRow label="Email" value={selected.email} />
            <DetailRow label="Address" value={selected.address} />
            <DetailRow label="Notes" value={selected.notes} />
            {!selected.phone &&
            !selected.email &&
            !selected.address &&
            !selected.notes ? (
              <Text style={styles.muted}>No extra details on file.</Text>
            ) : null}

            {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            <Pressable style={styles.secondaryButton} onPress={() => openEdit(selected)}>
              <Text style={styles.secondaryButtonText}>Edit customer</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      {!embedded ? <AppHeader title="Customers" subtitle="Admin" /> : null}

      <View style={styles.toolbar}>
        <Pressable style={styles.primaryButton} onPress={openCreate}>
          <Text style={styles.primaryButtonText}>Add customer</Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#111827" />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={
            customers.length === 0 ? styles.emptyContainer : styles.list
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              No customers yet. Tap Add customer to create one for linking to jobs.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.listCard} onPress={() => openView(item)}>
              <Text style={styles.listTitle}>{item.name}</Text>
              {item.phone || item.email ? (
                <Text style={styles.listMeta}>
                  {[item.phone, item.email].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  formScroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  backLink: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  listMeta: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  detailValue: {
    marginTop: 2,
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },
  actions: {
    marginTop: 8,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
  muted: {
    fontSize: 14,
    color: '#6b7280',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 8,
  },
  errorBanner: {
    color: '#dc2626',
    fontSize: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  success: {
    color: '#15803d',
    fontSize: 14,
    marginTop: 8,
  },
})
