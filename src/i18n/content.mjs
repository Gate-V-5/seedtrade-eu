// Canonical English remains on the record. Only textual fields are localized.
const narrativeFields = new Set(['headline', 'title', 'summary', 'body', 'why_it_matters',
  'partner_disclosure', 'methodology_note', 'interpretation', 'explanation', 'context',
  'current_situation', 'crop_weather_interpretation', 'regional_context', 'risk_narrative', 'opportunity_narrative'])
const languages = new Set(['en', 'de', 'fr', 'es', 'it'])
const valueAt = (object, path) => path.reduce((value, key) =>
  value != null && Object.hasOwn(value, key) ? value[key] : undefined, object)

export function localizedContentText(record, language, field) {
  // Localization cannot promote an explicitly unpublished/private record.
  if (!record || record.classification !== 'PUBLIC_SAFE' || record.publication_eligible === false ||
    (record.publication_status != null && record.publication_status !== 'PUBLIC_SAFE')) return ''
  const path = String(field).split('.')
  const allowed = path.length === 1 ? narrativeFields.has(field) :
    path.length === 3 && /^\d+$/.test(path[1]) &&
      ((path[0] === 'content' && ['heading', 'body'].includes(path[2])) ||
       (path[0] === 'regions' && path[2] === 'name'))
  if (!allowed) return '' // Never translate identity, source/SEO metadata or measurements.
  const english = valueAt(record, path)
  if (typeof english !== 'string' || !english.trim()) return ''
  const code = String(language).toLowerCase()
  if (code === 'en' || !languages.has(code)) return english
  const translated = valueAt(record.localizations?.[code], path)
  return typeof translated === 'string' && translated.trim() ? translated : english
}
