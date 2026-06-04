import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  customerHasContact,
  emailUrl,
  mapsUrl,
  openContactUrl,
  phoneUrl,
} from '../lib/customerContact'

function ActionButton({ label, url, compact }) {
  return (
    <Pressable
      style={[styles.button, compact && styles.buttonCompact]}
      onPress={() => openContactUrl(url)}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>{label}</Text>
    </Pressable>
  )
}

export default function CustomerContactActions({ customer, compact = false, style }) {
  if (!customerHasContact(customer)) return null

  const phone = customer.phone?.trim()
  const email = customer.email?.trim()
  const address = customer.address?.trim()

  return (
    <View style={[styles.row, style]} accessibilityRole="toolbar" accessibilityLabel="Customer contact">
      {phone ? <ActionButton label="Call" url={phoneUrl(phone)} compact={compact} /> : null}
      {email ? <ActionButton label="Email" url={emailUrl(email)} compact={compact} /> : null}
      {address ? (
        <ActionButton label="View address" url={mapsUrl(address)} compact={compact} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
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
