/** Display name for a lead row (DB stores first + last, no combined `name`). */
export function formatLeadDisplayName(lead: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const a = (lead.first_name || '').trim();
  const b = (lead.last_name || '').trim();
  const s = [a, b].filter(Boolean).join(' ').trim();
  return s || '—';
}
