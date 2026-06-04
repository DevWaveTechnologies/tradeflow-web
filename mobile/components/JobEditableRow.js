import { Pressable, StyleSheet, Text, View } from 'react-native'

export function PencilButton({ onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      style={styles.pencil}
    >
      <Text style={styles.pencilText}>✎</Text>
    </Pressable>
  )
}

export function EditActions({ onSave, onCancel, saving }) {
  return (
    <View style={styles.actions}>
      <Pressable
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
      <Pressable
        style={[styles.cancelButton, saving && styles.buttonDisabled]}
        onPress={onCancel}
        disabled={saving}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </View>
  )
}

export default function JobEditableRow({ label, value, canEdit, isEditing, onEdit, editor, actions }) {
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.rowLabel}>{label}</Text>
        {canEdit && !isEditing ? <PencilButton onPress={onEdit} label={`Edit ${label}`} /> : null}
      </View>
      {isEditing ? (
        <View style={styles.editorBlock}>
          {editor}
          {actions}
        </View>
      ) : (
        <Text style={styles.rowValue}>{value}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  rowValue: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },
  pencil: {
    padding: 2,
  },
  pencilText: {
    fontSize: 14,
    color: '#6b7280',
  },
  editorBlock: {
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#111827',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
