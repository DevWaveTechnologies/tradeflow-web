export function PencilButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      title={label}
    >
      <span aria-hidden="true">✎</span>
    </button>
  )
}

export default function JobEditableField({
  label,
  canEdit,
  isEditing,
  onEdit,
  display,
  footer,
  children,
  actions,
}) {
  return (
    <div className="grid gap-1 px-4 py-4 sm:grid-cols-3">
      <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
        <span>{label}</span>
        {canEdit && !isEditing ? <PencilButton label={`Edit ${label}`} onClick={onEdit} /> : null}
      </dt>
      <dd className="text-sm text-gray-900 sm:col-span-2">
        {isEditing ? (
          <div className="space-y-2">
            {children}
            {actions}
          </div>
        ) : (
          <div className="space-y-2">
            {display}
            {footer}
          </div>
        )}
      </dd>
    </div>
  )
}

export function EditActions({ onSave, onCancel, saving }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded border px-3 py-1.5 text-xs disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  )
}
