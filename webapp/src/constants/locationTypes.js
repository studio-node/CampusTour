/**
 * Values match Postgres enum public.location_type (see supabase_schema.sql).
 */
export const LOCATION_TYPE_OPTIONS = [
  { value: 'academic', label: 'Academic' },
  { value: 'residential', label: 'Residential' },
  { value: 'dining', label: 'Dining' },
  { value: 'students', label: 'Student life' },
  { value: 'recreation', label: 'Recreation' },
  { value: 'study', label: 'Study (e.g. library)' },
  { value: 'misc', label: 'Miscellaneous' },
]

export const DEFAULT_LOCATION_TYPE = 'misc'

export function labelForLocationType(value) {
  if (value == null || value === '') return '—'
  const found = LOCATION_TYPE_OPTIONS.find((o) => o.value === value)
  return found ? found.label : value
}
