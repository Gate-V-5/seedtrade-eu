import { localizedContentText } from './i18n/content.mjs'

// Owner-approved public-only exception, 2026-10-16. Stored evidence is immutable.
const approvedParagraphs = {
  "en": "Heat and water deficits during flowering, seed filling or tuber development may affect multiplication outcomes and later availability. SeedTrade therefore records the event as contextual evidence only and does not convert it into a directional Market Signal.",
  "de": "Hitze und Wasserdefizite während Blüte, Samenfüllung oder Knollenentwicklung können die Vermehrungsergebnisse und die spätere Verfügbarkeit beeinflussen. SeedTrade erfasst das Ereignis deshalb ausschließlich als Kontextinformation und leitet daraus kein gerichtetes Market Signal ab.",
  "fr": "La chaleur et le déficit hydrique pendant la floraison, le remplissage des graines ou le développement des tubercules peuvent influer sur les résultats de multiplication et la disponibilité ultérieure. SeedTrade enregistre donc cet événement uniquement comme élément de contexte et ne le convertit pas en Market Signal directionnel.",
  "es": "El calor y los déficits hídricos durante la floración, el llenado de semillas o el desarrollo de tubérculos pueden afectar a los resultados de multiplicación y a la disponibilidad posterior. Por ello, SeedTrade registra el evento únicamente como evidencia contextual y no lo convierte en un Market Signal direccional.",
  "it": "Caldo e deficit idrici durante la fioritura, il riempimento dei semi o lo sviluppo dei tuberi possono influire sui risultati della moltiplicazione e sulla disponibilità successiva. SeedTrade registra quindi l’evento solo come evidenza di contesto e non lo converte in un Market Signal direzionale."
}

export function publicNewsText(record, language, field) {
  const text = localizedContentText(record, language, field)
  if (record?.slug !== 'europe-summer-crop-heat-drought-2026' || field !== 'why_it_matters') return text
  for (const paragraph of Object.values(approvedParagraphs)) {
    if (text === paragraph) return paragraph.slice(0, paragraph.indexOf('. ') + 1)
  }
  return text
}
