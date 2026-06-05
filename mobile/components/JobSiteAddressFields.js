import { StyleSheet, Text, TextInput, View } from 'react-native'

function Field({ label, value, onChangeText, error, placeholder, autoFocus = false }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoCapitalize="words"
        autoFocus={autoFocus}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

export default function JobSiteAddressFields({ form, onChange, errors = {} }) {
  function setField(field, value) {
    onChange({ ...form, [field]: value })
  }

  return (
    <View style={styles.group}>
      <Field
        label="House name / number"
        value={form.building}
        onChangeText={(value) => setField('building', value)}
        placeholder="e.g. 12 or Rose Cottage"
        autoFocus
      />
      <Field
        label="Address line 1"
        value={form.line1}
        onChangeText={(value) => setField('line1', value)}
        error={errors.line1}
        placeholder="e.g. High Street"
      />
      <Field
        label="Address line 2"
        value={form.line2}
        onChangeText={(value) => setField('line2', value)}
        placeholder="Optional"
      />
      <Field
        label="Postcode"
        value={form.postcode}
        onChangeText={(value) => setField('postcode', value)}
        error={errors.postcode}
        placeholder="e.g. SW1A 1AA"
        autoCapitalize="characters"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
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
  inputError: {
    borderColor: '#dc2626',
  },
  error: {
    fontSize: 12,
    color: '#dc2626',
  },
})
