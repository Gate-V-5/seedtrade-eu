// Presentation only. This mapping never changes publication or evidence eligibility.
export function priceConfidence(qualityStatus) {
  return qualityStatus === "EVIDENCE_ELIGIBLE"
    ? { level: "Eligible", tone: "good", explanation: "The published trade observations passed the existing representative unit-value eligibility checks. Category-level unit values are derived indicators, not market prices." }
    : { level: "Limited", tone: "limited", explanation: "Available observations do not meet the existing representative unit-value eligibility checks. Official trade observations may still be valid; a representative price interpretation is withheld." }
}

export function marketSignalConfidence(marketStatus, supplyState, weatherStatus) {
  if (marketStatus === "INSUFFICIENT_EVIDENCE") {
    const gaps = []
    if (supplyState === "INSUFFICIENT_EVIDENCE") gaps.push("EU-wide seed-production evidence is incomplete")
    if (weatherStatus === "EXPOSURE_ONLY_NO_VALIDATED_IMPACT" || weatherStatus === "INSUFFICIENT_EVIDENCE") gaps.push("weather exposure has no validated production impact")
    return { level: "Limited", tone: "limited", explanation: `No directional Market Signal is published. ${gaps.length ? gaps.join("; ") + "." : "The existing combined-evidence gate is not met."} Verified trade observations remain available.` }
  }
  return { level: "Eligible", tone: "good", explanation: "The existing combined-evidence gate permits this Market Signal. It remains descriptive, not a forecast." }
}
