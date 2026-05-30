export function emptyCustomerForm() {
  return {
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  }
}

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
