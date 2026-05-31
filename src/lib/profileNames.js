export async function fetchProfileNames(supabase, ids) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) {
    return {}
  }

  const { data, error } = await supabase.rpc('get_profile_names', { p_ids: unique })

  if (!error && data) {
    return Object.fromEntries(data.map((row) => [row.id, row.name]))
  }

  const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', unique)

  return Object.fromEntries((profiles ?? []).map((row) => [row.id, row.name]))
}
