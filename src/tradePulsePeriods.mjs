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
