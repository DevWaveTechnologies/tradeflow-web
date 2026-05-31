export const emptyCustomerForm = () => ({
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
})

export function customerToForm(customer) {
  return {
    name: customer.name ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    notes: customer.notes ?? '',
  }
}

export function formToPayload(form) {
  return {
    name: form.name.trim(),
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    notes: form.notes.trim() || null,
  }
}

export default function CustomerFormFields({ form, onChange, idPrefix = 'customer' }) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-name`} className="mb-1 block text-sm font-medium">
          Name <span className="text-red-600">*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          className="w-full rounded border px-3 py-2"
          required
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-phone`} className="mb-1 block text-sm font-medium">
          Phone
        </label>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          value={form.phone}
          onChange={(event) => onChange({ ...form, phone: event.target.value })}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-email`} className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          value={form.email}
          onChange={(event) => onChange({ ...form, email: event.target.value })}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-address`} className="mb-1 block text-sm font-medium">
          Address
        </label>
        <input
          id={`${idPrefix}-address`}
          type="text"
          value={form.address}
          onChange={(event) => onChange({ ...form, address: event.target.value })}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-notes`} className="mb-1 block text-sm font-medium">
          Notes
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          value={form.notes}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
          className="w-full rounded border px-3 py-2"
          rows={3}
        />
      </div>
    </div>
  )
}
