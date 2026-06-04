export function phoneDialString(phone) {
  const trimmed = phone?.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/[^\d+]/g, '')
  return digits || null
}

export function phoneUrl(phone) {
  const dial = phoneDialString(phone)
  return dial ? `tel:${dial}` : null
}

export function emailUrl(email) {
  const trimmed = email?.trim()
  return trimmed ? `mailto:${trimmed}` : null
}

export function mapsUrl(address) {
  const trimmed = address?.trim()
  return trimmed
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`
    : null
}

export function customerHasContact(customer) {
  if (!customer) return false
  return Boolean(
    customer.phone?.trim() || customer.email?.trim() || customer.address?.trim(),
  )
}
