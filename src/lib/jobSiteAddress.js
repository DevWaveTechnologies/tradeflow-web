/** UK outward + inward postcode (e.g. SW1A 1AA, CF10 1AA). */
export const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/i

export function emptyJobSiteForm() {
  return { building: '', line1: '', line2: '', postcode: '' }
}

export function jobSiteFormHasValues(form) {
  return Boolean(
    form.building?.trim() ||
      form.line1?.trim() ||
      form.line2?.trim() ||
      form.postcode?.trim(),
  )
}

export function isPostcodeValid(postcode) {
  const trimmed = postcode?.trim()
  if (!trimmed) return false
  const compact = trimmed.replace(/\s+/g, '').toUpperCase()
  if (compact === 'GIR0AA') return true
  return UK_POSTCODE_REGEX.test(compact)
}

export function normalizePostcode(postcode) {
  const compact = postcode.replace(/\s+/g, '').toUpperCase()
  if (compact === 'GIR0AA') return 'GIR 0AA'
  if (!UK_POSTCODE_REGEX.test(compact)) return null
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}

export function jobToJobSiteForm(job) {
  if (!job) return emptyJobSiteForm()

  if (job.address_line_1 || job.postcode || job.address_building || job.address_line_2) {
    return {
      building: job.address_building ?? '',
      line1: job.address_line_1 ?? '',
      line2: job.address_line_2 ?? '',
      postcode: job.postcode ?? '',
    }
  }

  if (job.address?.trim()) {
    return { building: '', line1: job.address.trim(), line2: '', postcode: '' }
  }

  return emptyJobSiteForm()
}

export function formatJobSiteAddress(parts) {
  if (!parts) return ''

  const building = parts.address_building?.trim() ?? parts.building?.trim() ?? ''
  const line1 = parts.address_line_1?.trim() ?? parts.line1?.trim() ?? ''
  const line2 = parts.address_line_2?.trim() ?? parts.line2?.trim() ?? ''
  const postcode = parts.postcode?.trim() ?? ''

  const formatted = [building, line1, line2, postcode].filter(Boolean).join(', ')
  if (formatted) return formatted

  return parts.address?.trim() ?? ''
}

export function formatJobSiteAddressLines(job) {
  const form = jobToJobSiteForm(job)
  if (!jobSiteFormHasValues(form)) return []

  const lines = []
  if (form.building.trim()) lines.push(form.building.trim())
  if (form.line1.trim()) lines.push(form.line1.trim())
  if (form.line2.trim()) lines.push(form.line2.trim())
  if (form.postcode.trim()) lines.push(form.postcode.trim())
  return lines
}

export function jobSiteMapsAddress(job) {
  const formatted = formatJobSiteAddress(job)
  return formatted || null
}

export function validateJobSiteForm(form) {
  const building = form.building?.trim() ?? ''
  const line1 = form.line1?.trim() ?? ''
  const line2 = form.line2?.trim() ?? ''
  const postcodeRaw = form.postcode?.trim() ?? ''

  if (!building && !line1 && !line2 && !postcodeRaw) {
    return {
      valid: true,
      errors: {},
      payload: {
        address_building: null,
        address_line_1: null,
        address_line_2: null,
        postcode: null,
        address: null,
      },
    }
  }

  const errors = {}

  if (!line1) {
    errors.line1 = 'Address line 1 is required.'
  }

  if (!postcodeRaw) {
    errors.postcode = 'Postcode is required.'
  } else if (!isPostcodeValid(postcodeRaw)) {
    errors.postcode = 'Enter a valid UK postcode (e.g. SW1A 1AA).'
  }

  if (Object.keys(errors).length) {
    return { valid: false, errors, payload: null }
  }

  const postcode = normalizePostcode(postcodeRaw)
  const payload = {
    address_building: building || null,
    address_line_1: line1,
    address_line_2: line2 || null,
    postcode,
    address: formatJobSiteAddress({
      building,
      line1,
      line2,
      postcode,
    }),
  }

  return { valid: true, errors: {}, payload }
}
