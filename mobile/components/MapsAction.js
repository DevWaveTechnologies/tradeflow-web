import { Pressable, StyleSheet, Text } from 'react-native'
import { mapsUrl, openContactUrl } from '../lib/customerContact'

export default function MapsAction({
  address,
  label = 'Open in maps',
  compact = false,
  style,
}) {
  const trimmed = address?.trim()
  if (!trimmed) return null

  return (
    <Pressable
      style={[styles.button, compact && styles.buttonCompact, style]}
      onPress={() => openContactUrl(mapsUrl(trimmed))}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  buttonCompact: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  buttonTextCompact: {
    fontSize: 12,
  },
})
