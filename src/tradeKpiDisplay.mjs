export function compactTonnes(value,locale='en-GB') {
 return `${new Intl.NumberFormat(locale,{minimumFractionDigits:1,maximumFractionDigits:1}).format(Number(value)/1000)}k t`
}
export function exactTonnes(value,locale='en-GB') {
 return new Intl.NumberFormat(locale,{maximumFractionDigits:6}).format(Number(value))
}
