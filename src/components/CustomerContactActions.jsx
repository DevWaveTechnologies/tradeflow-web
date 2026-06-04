import { customerHasContact, emailUrl, mapsUrl, phoneUrl } from '../lib/customerContact'

const actionClass =
  'inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-50 active:bg-gray-100'

const compactActionClass =
  'inline-flex items-center rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-900 transition hover:bg-gray-50 active:bg-gray-100'

export default function CustomerContactActions({ customer, compact = false, className = '' }) {
  if (!customerHasContact(customer)) return null

  const phone = customer.phone?.trim()
  const email = customer.email?.trim()
  const address = customer.address?.trim()
  const cls = compact ? compactActionClass : actionClass

  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`.trim()}
      role="group"
      aria-label="Customer contact"
    >
      {phone ? (
        <a href={phoneUrl(phone)} className={cls}>
          Call
        </a>
      ) : null}
      {email ? (
        <a href={emailUrl(email)} className={cls}>
          Email
        </a>
      ) : null}
      {address ? (
        <a href={mapsUrl(address)} target="_blank" rel="noopener noreferrer" className={cls}>
          View address
        </a>
      ) : null}
    </div>
  )
}
