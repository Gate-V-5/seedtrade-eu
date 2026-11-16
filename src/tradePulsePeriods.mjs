const periodIndex = period => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(period))
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null
}

export function rollingCompletedHistory(history, latestCompleted, partialPeriod) {
  const end = periodIndex(latestCompleted)
  if (end === null || !Array.isArray(history)) return []
  return history.filter(point => {
    const month = periodIndex(point?.period)
    return month !== null && month <= end && point.period !== partialPeriod
  }).sort((a, b) => periodIndex(a.period) - periodIndex(b.period)).slice(-12)
}

export function rollingCompletedRange(history, latestCompleted, partialPeriod) {
  const points = rollingCompletedHistory(history, latestCompleted, partialPeriod)
  const start = points[0]?.period ?? null
  const end = points.at(-1)?.period ?? null
  const complete = points.length === 12 && end === latestCompleted &&
    points.every((point, index) => periodIndex(point.period) === periodIndex(start) + index)
  return { start, end, complete }
}

export function pulseComparisonPeriod(period) {
  return periodIndex(period)===null?null:`${Number(period.slice(0,4))-1}${period.slice(4)}`
}

export function pulseCardPeriod(view) {
  const period=view?.latest?.period
  return {period:periodIndex(period)===null?null:period,comparison:pulseComparisonPeriod(period),aggregation:'MONTH_ONLY'}
}

export function pulseBarPercent(value, maximum) {
  if (typeof value!=='number'||!Number.isFinite(value)||typeof maximum!=='number'||!Number.isFinite(maximum)||maximum<=0) return null
  return Math.min(100,Math.abs(value)/maximum*100)
}

export function pulseFormat(language='EN') {
  const locale={EN:'en-GB',DE:'de-DE',FR:'fr-FR',ES:'es-ES',IT:'it-IT'}[language]||'en-GB'
  const number=new Intl.NumberFormat(locale,{maximumFractionDigits:2})
  const currency=new Intl.NumberFormat(locale,{style:'currency',currency:'EUR',maximumFractionDigits:0})
  const unitValue=new Intl.NumberFormat(locale,{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2})
  const percent=new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:2,signDisplay:'exceptZero'})
  const month=period=>periodIndex(period)===null?null:new Intl.DateTimeFormat(locale,{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${period}-01T00:00:00Z`))
  return {locale,number:value=>number.format(value),currency:value=>currency.format(value),unitValue:value=>unitValue.format(value),percent:value=>percent.format(value/100),month}
}
