import { mapsUrl } from '../lib/customerContact'

const actionClass =
  'inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-50 active:bg-gray-100'

const compactActionClass =
  'inline-flex items-center rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-900 transition hover:bg-gray-50 active:bg-gray-100'

export default function MapsAction({
  address,
  label = 'Open in maps',
  compact = false,
  className = '',
}) {
  const trimmed = address?.trim()
  if (!trimmed) return null

  const cls = compact ? compactActionClass : actionClass

  return (
    <a
      href={mapsUrl(trimmed)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} ${className}`.trim()}
    >
      {label}
    </a>
  )
}
