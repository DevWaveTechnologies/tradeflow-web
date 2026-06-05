const inputClass = 'w-full rounded border px-3 py-2 text-sm'
const errorInputClass = 'border-red-500 focus:border-red-500'

function Field({ id, label, value, onChange, error, placeholder, autoFocus = false }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} ${error ? errorInputClass : 'border-gray-300'}`}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

export default function JobSiteAddressFields({
  form,
  onChange,
  errors = {},
  idPrefix = 'job-site',
}) {
  function setField(field, value) {
    onChange({ ...form, [field]: value })
  }

  return (
    <div className="space-y-3">
      <Field
        id={`${idPrefix}-building`}
        label="House name / number"
        value={form.building}
        onChange={(value) => setField('building', value)}
        placeholder="e.g. 12 or Rose Cottage"
        autoFocus
      />
      <Field
        id={`${idPrefix}-line1`}
        label="Address line 1"
        value={form.line1}
        onChange={(value) => setField('line1', value)}
        error={errors.line1}
        placeholder="e.g. High Street"
      />
      <Field
        id={`${idPrefix}-line2`}
        label="Address line 2"
        value={form.line2}
        onChange={(value) => setField('line2', value)}
        placeholder="Optional"
      />
      <Field
        id={`${idPrefix}-postcode`}
        label="Postcode"
        value={form.postcode}
        onChange={(value) => setField('postcode', value)}
        error={errors.postcode}
        placeholder="e.g. SW1A 1AA"
      />
    </div>
  )
}
