import { StyleSheet, Text, TextInput, View } from 'react-native'

export default function CustomerFormFields({ form, onChange }) {

  function setField(key, value) {
    onChange({ ...form, [key]: value })
  }

  return (
    <View style={styles.fields}>
      <View style={styles.field}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(value) => setField('name', value)}
          placeholder="Customer name"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={form.phone}
          onChangeText={(value) => setField('phone', value)}
          keyboardType="phone-pad"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={form.email}
          onChangeText={(value) => setField('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={form.address}
          onChangeText={(value) => setField('address', value)}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.notes}
          onChangeText={(value) => setField('notes', value)}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholderTextColor="#9ca3af"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fields: {
    gap: 16,
  },
  field: {
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
})
