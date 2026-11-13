import { createContext, useContext, useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/i18n/marketCardNames.js
var marketCardNameRows = [
	[
		"White mustard",
		"Weißer Senf",
		"Moutarde blanche",
		"Mostaza blanca",
		"Senape bianca"
	],
	[
		"Brown / Indian mustard",
		"Brauner / Indischer Senf",
		"Moutarde brune / indienne",
		"Mostaza parda / india",
		"Senape bruna / indiana"
	],
	[
		"Black mustard",
		"Schwarzer Senf",
		"Moutarde noire",
		"Mostaza negra",
		"Senape nera"
	],
	[
		"Oil radish",
		"Ölrettich",
		"Radis oléifère",
		"Rábano oleaginoso",
		"Ravanello oleifero"
	],
	[
		"Rapeseed",
		"Raps",
		"Colza",
		"Colza",
		"Colza"
	],
	[
		"Turnip rape",
		"Rübsen",
		"Navette",
		"Nabina",
		"Ravizzone"
	],
	[
		"Fodder kale",
		"Futterkohl",
		"Chou fourrager",
		"Col forrajera",
		"Cavolo da foraggio"
	],
	[
		"Fodder turnip",
		"Stoppelrübe",
		"Navet fourrager",
		"Nabo forrajero",
		"Rapa da foraggio"
	],
	[
		"Phacelia",
		"Phacelia",
		"Phacélie",
		"Facelia",
		"Facelia"
	],
	[
		"Sunflower",
		"Sonnenblume",
		"Tournesol",
		"Girasol",
		"Girasole"
	],
	[
		"Buckwheat",
		"Buchweizen",
		"Sarrasin",
		"Alforfón",
		"Grano saraceno"
	],
	[
		"Oat",
		"Hafer",
		"Avoine",
		"Avena",
		"Avena"
	],
	[
		"Bristle / black oat",
		"Sandhafer / Rauhafer",
		"Avoine rude / noire",
		"Avena estrigosa / negra",
		"Avena strigosa / nera"
	],
	[
		"Rye",
		"Roggen",
		"Seigle",
		"Centeno",
		"Segale"
	],
	[
		"Sorghum",
		"Sorghum",
		"Sorgho",
		"Sorgo",
		"Sorgo"
	],
	[
		"Hybrid ryegrass",
		"Bastardweidelgras",
		"Ray-grass hybride",
		"Raigrás híbrido",
		"Loietto ibrido"
	],
	[
		"Westerwold ryegrass",
		"Westerwoldisches Weidelgras",
		"Ray-grass de Westerwold",
		"Raigrás de Westerwold",
		"Loietto di Westerwold"
	],
	[
		"Festulolium",
		"Festulolium",
		"Festulolium",
		"Festulolium",
		"Festulolium"
	],
	[
		"Tall fescue",
		"Rohrschwingel",
		"Fétuque élevée",
		"Festuca alta",
		"Festuca arundinacea"
	],
	[
		"Cocksfoot",
		"Knaulgras",
		"Dactyle",
		"Dáctilo",
		"Erba mazzolina"
	],
	[
		"Hairy vetch",
		"Zottelwicke",
		"Vesce velue",
		"Veza vellosa",
		"Veccia villosa"
	],
	[
		"Hungarian / Pannonian vetch",
		"Ungarische / Pannonische Wicke",
		"Vesce de Hongrie / de Pannonie",
		"Veza húngara / de Panonia",
		"Veccia ungherese / pannonica"
	],
	[
		"Purple / Bengal vetch",
		"Purpurwicke / Bengalische Wicke",
		"Vesce pourpre / du Bengale",
		"Veza púrpura / de Bengala",
		"Veccia purpurea / del Bengala"
	],
	[
		"Pea",
		"Erbse",
		"Pois",
		"Guisante",
		"Pisello"
	],
	[
		"Faba bean",
		"Ackerbohne",
		"Féverole",
		"Haba",
		"Favino"
	],
	[
		"Narrow-leaved lupin",
		"Schmalblättrige Lupine",
		"Lupin à feuilles étroites",
		"Altramuz de hoja estrecha",
		"Lupino a foglie strette"
	],
	[
		"Yellow lupin",
		"Gelbe Lupine",
		"Lupin jaune",
		"Altramuz amarillo",
		"Lupino giallo"
	],
	[
		"White clover",
		"Weißklee",
		"Trèfle blanc",
		"Trébol blanco",
		"Trifoglio bianco"
	],
	[
		"Persian clover",
		"Perserklee",
		"Trèfle de Perse",
		"Trébol persa",
		"Trifoglio persiano"
	],
	[
		"Berseem / Alexandrian clover",
		"Berseemklee / Alexandrinerklee",
		"Trèfle d’Alexandrie",
		"Trébol de Alejandría",
		"Trifoglio alessandrino"
	],
	[
		"Crimson clover",
		"Inkarnatklee",
		"Trèfle incarnat",
		"Trébol encarnado",
		"Trifoglio incarnato"
	],
	[
		"Balansa clover",
		"Michels Klee / Balansaklee",
		"Trèfle de Micheli / balansa",
		"Trébol balansa",
		"Trifoglio di Micheli / balansa"
	],
	[
		"Alsike clover",
		"Schwedenklee",
		"Trèfle hybride",
		"Trébol híbrido",
		"Trifoglio ibrido"
	],
	[
		"Subterranean clover",
		"Erdklee",
		"Trèfle souterrain",
		"Trébol subterráneo",
		"Trifoglio sotterraneo"
	],
	[
		"Black medic",
		"Hopfenklee",
		"Luzerne lupuline",
		"Mielga",
		"Erba medica lupulina"
	],
	[
		"Yellow sweet clover",
		"Gelber Steinklee",
		"Mélilot officinal",
		"Meliloto amarillo",
		"Meliloto giallo"
	],
	[
		"White sweet clover",
		"Weißer Steinklee",
		"Mélilot blanc",
		"Meliloto blanco",
		"Meliloto bianco"
	],
	[
		"Birdsfoot trefoil",
		"Hornklee",
		"Lotier corniculé",
		"Loto corniculado",
		"Ginestrino"
	],
	[
		"Sainfoin",
		"Esparsette",
		"Sainfoin",
		"Esparceta",
		"Lupinella"
	],
	[
		"Flax / linseed",
		"Lein / Öllein",
		"Lin",
		"Lino",
		"Lino"
	],
	[
		"Hemp",
		"Hanf",
		"Chanvre",
		"Cáñamo",
		"Canapa"
	],
	[
		"Coriander",
		"Koriander",
		"Coriandre",
		"Cilantro",
		"Coriandolo"
	],
	[
		"Dill",
		"Dill",
		"Aneth",
		"Eneldo",
		"Aneto"
	],
	[
		"Camelina",
		"Leindotter",
		"Caméline",
		"Camelina",
		"Camelina"
	],
	[
		"Niger / Ramtilla",
		"Nigersaat / Ramtillkraut",
		"Niger / Guizotia",
		"Níger / Guizotia",
		"Niger / Guizotia"
	],
	[
		"Chicory",
		"Zichorie",
		"Chicorée",
		"Achicoria",
		"Cicoria"
	]
];
//#endregion
//#region src/i18n/snapshotIntelligence.js
var snapshotIntelligenceRows = [
	[
		"Market watch",
		"Marktbeobachtung",
		"Points à surveiller",
		"Seguimiento del mercado",
		"Mercato da monitorare"
	],
	[
		"Market situation",
		"Marktlage",
		"Situation du marché",
		"Situación del mercado",
		"Situazione del mercato"
	],
	[
		"What to watch",
		"Darauf achten",
		"À surveiller",
		"Qué vigilar",
		"Da monitorare"
	],
	[
		"B2B view",
		"B2B-Einordnung",
		"Lecture B2B",
		"Perspectiva B2B",
		"Lettura B2B"
	],
	[
		"Latest market evidence",
		"Aktuelle Marktdaten",
		"Derniers éléments du marché",
		"Última evidencia del mercado",
		"Ultimi dati di mercato"
	],
	[
		"As of",
		"Datenstand",
		"En date de",
		"A fecha de",
		"Al"
	],
	[
		"Trade unit value",
		"Handelswert je kg",
		"Valeur unitaire des échanges",
		"Valor unitario comercial",
		"Valore unitario degli scambi"
	],
	[
		"Trade unit value history",
		"Verlauf des Handelswerts je kg",
		"Historique de la valeur unitaire",
		"Historial del valor unitario",
		"Storico del valore unitario"
	],
	[
		"Trade unit value history — €/kg",
		"Handelswert je kg im Zeitverlauf — €/kg",
		"Historique de la valeur unitaire — €/kg",
		"Historial del valor unitario — €/kg",
		"Storico del valore unitario — €/kg"
	],
	[
		"Trade unit value YoY",
		"Handelswert je kg zum Vorjahr",
		"Valeur unitaire sur un an",
		"Valor unitario interanual",
		"Valore unitario annuo"
	],
	[
		"Trade unit value evidence",
		"Daten zum Handelswert je kg",
		"Données de valeur unitaire",
		"Evidencia del valor unitario",
		"Dati del valore unitario"
	],
	[
		"Seed price",
		"Saatgutpreis",
		"Prix des semences",
		"Precio de semillas",
		"Prezzo delle sementi"
	],
	[
		"About trade unit value",
		"Zum Handelswert je kg",
		"À propos de la valeur unitaire",
		"Sobre el valor unitario",
		"Informazioni sul valore unitario"
	],
	[
		"Trade unit value = reported trade value divided by reported net weight. A customs indicator, not a seller quotation.",
		"Handelswert je kg = gemeldeter Handelswert geteilt durch gemeldetes Nettogewicht. Ein Zollindikator, kein Verkäuferangebot.",
		"Valeur unitaire = valeur déclarée des échanges divisée par le poids net déclaré. Un indicateur douanier, pas une offre vendeur.",
		"Valor unitario = valor comercial declarado dividido por peso neto declarado. Indicador aduanero, no oferta de un vendedor.",
		"Valore unitario = valore dichiarato degli scambi diviso per peso netto dichiarato. Indicatore doganale, non offerta di un venditore."
	],
	[
		"Verified commercial seed quotation with publication rights.",
		"Geprüftes kommerzielles Saatgutangebot mit Veröffentlichungsrechten.",
		"Offre commerciale de semences vérifiée, avec droits de publication.",
		"Oferta comercial de semillas verificada con derechos de publicación.",
		"Offerta commerciale di sementi verificata con diritti di pubblicazione."
	],
	[
		"Trade unit values for new observations are withheld pending the established validation.",
		"Handelswerte je kg für neue Beobachtungen bleiben bis zur etablierten Prüfung unveröffentlicht.",
		"Les valeurs unitaires des nouvelles observations restent non publiées en attendant la validation.",
		"Los valores unitarios de las nuevas observaciones se retienen hasta completar la validación.",
		"I valori unitari delle nuove osservazioni restano sospesi fino alla validazione."
	],
	[
		"June 2026 seed dispatches rose slightly; customs unit value fell. Seed-production evidence ends in 2025.",
		"Saatgutversendungen stiegen im Juni 2026 leicht; der Handelswert je kg sank. Die Saatgutproduktionsdaten enden 2025.",
		"Les expéditions de semences ont légèrement augmenté en juin 2026 ; la valeur unitaire a baissé. Les données de production s’arrêtent en 2025.",
		"Los envíos de semillas subieron ligeramente en junio de 2026; el valor unitario bajó. La evidencia de producción termina en 2025.",
		"Le spedizioni di sementi sono salite leggermente a giugno 2026; il valore unitario è sceso. I dati produttivi terminano nel 2025."
	],
	[
		"Latest completed trade: June 2026. Customs values describe shipments, not current offers or available lots.",
		"Letzter vollständiger Handelsmonat: Juni 2026. Zollwerte beschreiben Lieferungen, keine aktuellen Angebote oder verfügbaren Partien.",
		"Dernier mois commercial complet : juin 2026. Les valeurs douanières décrivent les expéditions, pas les offres ou lots disponibles.",
		"Último mes comercial completo: junio de 2026. Los valores aduaneros describen envíos, no ofertas actuales ni lotes disponibles.",
		"Ultimo mese commerciale completo: giugno 2026. I valori doganali descrivono spedizioni, non offerte attuali o lotti disponibili."
	],
	[
		"Germany’s 2026 spring and winter seed declarations show planned capacity, not deliverable seed.",
		"Deutschlands Saatgutmeldungen 2026 für Sommer- und Winterformen zeigen geplante Kapazität, kein lieferbares Saatgut.",
		"Les déclarations allemandes de semences 2026, de printemps et d’hiver, montrent une capacité prévue, pas des semences livrables.",
		"Las declaraciones alemanas de semillas 2026 de primavera e invierno muestran capacidad prevista, no semillas entregables.",
		"Le dichiarazioni tedesche 2026 per forme primaverili e invernali indicano capacità prevista, non sementi consegnabili."
	],
	[
		"Approved area by spring/winter form",
		"Anerkannte Fläche nach Sommer-/Winterform",
		"Surface agréée par forme de printemps/hiver",
		"Superficie aprobada por forma primavera/invierno",
		"Superficie approvata per forma primaverile/invernale"
	],
	[
		"Hybrid versus open-pollinated lot availability",
		"Verfügbare Hybrid- und offen abblühende Partien",
		"Disponibilité des lots hybrides ou à pollinisation libre",
		"Lotes híbridos frente a polinización abierta",
		"Lotti ibridi e a impollinazione libera disponibili"
	],
	[
		"Compare hybrid and open-pollinated lots separately.",
		"Hybrid- und offen abblühende Partien getrennt vergleichen.",
		"Comparer séparément les lots hybrides et à pollinisation libre.",
		"Comparar por separado lotes híbridos y de polinización abierta.",
		"Confrontare separatamente lotti ibridi e a impollinazione libera."
	],
	[
		"Bavaria’s 2026 spring and winter field results remain separate; final certified quantities and stocks are unconfirmed.",
		"Bayerns Feldergebnisse 2026 für Sommer- und Winterformen bleiben getrennt; zertifizierte Endmengen und Bestände sind unbestätigt.",
		"Les résultats bavarois 2026 de printemps et d’hiver restent distincts ; quantités certifiées finales et stocks sont non confirmés.",
		"Los resultados bávaros 2026 de primavera e invierno siguen separados; cantidades certificadas finales y existencias sin confirmar.",
		"I risultati bavaresi 2026 primaverili e invernali restano distinti; quantità certificate finali e scorte non confermate."
	],
	[
		"Final germination and certified quantity by form",
		"Endkeimfähigkeit und zertifizierte Menge je Form",
		"Germination finale et quantité certifiée par forme",
		"Germinación final y cantidad certificada por forma",
		"Germinabilità finale e quantità certificata per forma"
	],
	[
		"Next-season spring/winter orders",
		"Bestellungen für Sommer-/Winterformen der Folgesaison",
		"Commandes de printemps/hiver pour la saison suivante",
		"Pedidos primavera/invierno de la próxima campaña",
		"Ordini primaverili/invernali della prossima stagione"
	],
	[
		"Check seed class and deliverability by spring/winter form.",
		"Saatgutklasse und Lieferbarkeit je Sommer-/Winterform prüfen.",
		"Vérifier classe et disponibilité par forme de printemps/hiver.",
		"Verificar clase y entrega por forma primavera/invierno.",
		"Verificare classe e consegna per forma primaverile/invernale."
	],
	[
		"Germany’s 2026 declarations show seed capacity. Customs data do not separate Westerwolds and other forms.",
		"Deutschlands Meldungen 2026 zeigen Saatgutkapazität. Zolldaten trennen Westerwolds und andere Formen nicht.",
		"Les déclarations allemandes 2026 montrent une capacité semencière. Les douanes ne distinguent pas Westerwolds des autres formes.",
		"Las declaraciones alemanas 2026 muestran capacidad de semillas. Las aduanas no separan Westerwolds de otras formas.",
		"Le dichiarazioni tedesche 2026 indicano capacità sementiera. Le dogane non separano Westerwolds dalle altre forme."
	],
	[
		"Certified new-harvest quantity",
		"Zertifizierte Menge aus der neuen Ernte",
		"Quantité certifiée de la nouvelle récolte",
		"Cantidad certificada de la nueva cosecha",
		"Quantità certificata del nuovo raccolto"
	],
	[
		"Availability by commercial form and cultivar",
		"Verfügbarkeit nach Handelsform und Sorte",
		"Disponibilité par forme commerciale et variété",
		"Disponibilidad por forma comercial y variedad",
		"Disponibilità per forma commerciale e varietà"
	],
	[
		"Match the commercial form and cultivar to the intended use.",
		"Handelsform und Sorte auf den vorgesehenen Einsatz abstimmen.",
		"Adapter la forme commerciale et la variété à l’usage prévu.",
		"Ajustar la forma comercial y la variedad al uso previsto.",
		"Abbinare forma commerciale e varietà all’impiego previsto."
	],
	[
		"Germany reports 2026 seed declarations. The latest customs unit value is from February 2025.",
		"Deutschland meldet Saatgutflächen für 2026. Der jüngste Handelswert je kg stammt aus Februar 2025.",
		"L’Allemagne déclare des surfaces semencières pour 2026. La dernière valeur unitaire date de février 2025.",
		"Alemania declara superficies semilleras para 2026. El último valor unitario es de febrero de 2025.",
		"La Germania dichiara superfici sementiere per il 2026. L’ultimo valore unitario risale a febbraio 2025."
	],
	[
		"New certified-lot availability",
		"Verfügbarkeit neuer zertifizierter Partien",
		"Disponibilité de nouveaux lots certifiés",
		"Disponibilidad de nuevos lotes certificados",
		"Disponibilità di nuovi lotti certificati"
	],
	[
		"Current variety-specific offers",
		"Aktuelle sortenspezifische Angebote",
		"Offres actuelles par variété",
		"Ofertas actuales por variedad",
		"Offerte attuali per varietà"
	],
	[
		"Compare current offers by variety, germination and delivery terms.",
		"Aktuelle Angebote nach Sorte, Keimfähigkeit und Lieferbedingungen vergleichen.",
		"Comparer les offres selon variété, germination et conditions de livraison.",
		"Comparar ofertas por variedad, germinación y condiciones de entrega.",
		"Confrontare offerte per varietà, germinabilità e termini di consegna."
	],
	[
		"Germany reports 2026 seed capacity. External import and export periods differ; no net balance is inferred.",
		"Deutschland meldet Saatgutkapazität für 2026. Außenhandelsperioden unterscheiden sich; keine Nettobilanz wird abgeleitet.",
		"L’Allemagne déclare une capacité semencière 2026. Les périodes d’import et d’export diffèrent ; aucun solde n’est déduit.",
		"Alemania declara capacidad semillera 2026. Importaciones y exportaciones tienen períodos distintos; no se deduce saldo neto.",
		"La Germania dichiara capacità sementiera 2026. Import ed export hanno periodi diversi; nessun saldo netto dedotto."
	],
	[
		"Same-period external import and export update",
		"Ein- und Ausfuhren für denselben Zeitraum",
		"Importations et exportations sur la même période",
		"Importaciones y exportaciones del mismo período",
		"Import ed export nello stesso periodo"
	],
	[
		"Certified 2026 lot availability",
		"Verfügbarkeit zertifizierter Partien 2026",
		"Disponibilité des lots certifiés 2026",
		"Disponibilidad de lotes certificados 2026",
		"Disponibilità di lotti certificati 2026"
	],
	[
		"Verify delivered lots; unmatched flows do not establish shortage.",
		"Lieferbare Partien prüfen; ungleiche Handelsperioden belegen keine Knappheit.",
		"Vérifier les lots livrables ; des flux non alignés ne prouvent pas une pénurie.",
		"Verificar lotes entregables; flujos no alineados no prueban escasez.",
		"Verificare lotti consegnabili; flussi non allineati non provano scarsità."
	],
	[
		"Germany reports 2026 seed declarations. June volume and customs unit value diverged; current availability is unconfirmed.",
		"Deutschland meldet Saatgutflächen für 2026. Junivolumen und Handelswert je kg divergierten; aktuelle Verfügbarkeit ist unbestätigt.",
		"L’Allemagne déclare des surfaces semencières 2026. Volume et valeur unitaire de juin ont divergé ; disponibilité actuelle non confirmée.",
		"Alemania declara superficies semilleras 2026. Volumen y valor unitario de junio divergieron; disponibilidad actual sin confirmar.",
		"La Germania dichiara superfici sementiere 2026. Volume e valore unitario di giugno divergono; disponibilità attuale non confermata."
	],
	[
		"New-crop certified quantity and germination",
		"Zertifizierte Neuerntemenge und Keimfähigkeit",
		"Quantité certifiée et germination de la nouvelle récolte",
		"Cantidad certificada y germinación de nueva cosecha",
		"Quantità certificata e germinabilità del nuovo raccolto"
	],
	[
		"Next-season buyer orders by variety",
		"Käuferbestellungen der Folgesaison nach Sorte",
		"Commandes de la saison suivante par variété",
		"Pedidos de la próxima campaña por variedad",
		"Ordini della prossima stagione per varietà"
	],
	[
		"Match variety, germination and treatment when comparing offers.",
		"Sorte, Keimfähigkeit und Behandlung beim Angebotsvergleich abstimmen.",
		"Comparer les offres à variété, germination et traitement équivalents.",
		"Comparar ofertas con variedad, germinación y tratamiento equivalentes.",
		"Confrontare offerte con varietà, germinabilità e trattamento equivalenti."
	],
	[
		"Germany reports 2026 seed declarations. Earlier Irish reseeding payments do not establish mono-species orders.",
		"Deutschland meldet Saatgutflächen für 2026. Frühere irische Nachsaatzahlungen belegen keine Bestellungen für eine einzelne Art.",
		"L’Allemagne déclare des surfaces semencières 2026. Les anciens paiements irlandais de ressemis ne prouvent pas des commandes mono-espèce.",
		"Alemania declara superficies semilleras 2026. Los pagos irlandeses anteriores de resiembra no prueban pedidos monoespecíficos.",
		"La Germania dichiara superfici sementiere 2026. I precedenti pagamenti irlandesi per risemina non provano ordini monospecifici."
	],
	[
		"Certified availability by ploidy and cultivar",
		"Zertifizierte Verfügbarkeit nach Ploidie und Sorte",
		"Disponibilité certifiée par ploïdie et variété",
		"Disponibilidad certificada por ploidía y variedad",
		"Disponibilità certificata per ploidia e varietà"
	],
	[
		"Red-clover inclusion in reseeding orders",
		"Rotkleeanteil in Nachsaatbestellungen",
		"Part du trèfle violet dans les commandes de ressemis",
		"Trébol rojo en pedidos de resiembra",
		"Trifoglio violetto negli ordini di risemina"
	],
	[
		"Compare ploidy, cultivar and germination for deliverable seed.",
		"Ploidie, Sorte und Keimfähigkeit für lieferbares Saatgut vergleichen.",
		"Comparer ploïdie, variété et germination des semences livrables.",
		"Comparar ploidía, variedad y germinación de semillas entregables.",
		"Confrontare ploidia, varietà e germinabilità delle sementi consegnabili."
	],
	[
		"Germany reports 2026 seed declarations. The latest customs unit value is from December 2024.",
		"Deutschland meldet Saatgutflächen für 2026. Der jüngste Handelswert je kg stammt aus Dezember 2024.",
		"L’Allemagne déclare des surfaces semencières pour 2026. La dernière valeur unitaire date de décembre 2024.",
		"Alemania declara superficies semilleras para 2026. El último valor unitario es de diciembre de 2024.",
		"La Germania dichiara superfici sementiere per il 2026. L’ultimo valore unitario risale a dicembre 2024."
	],
	[
		"New certified-lot availability",
		"Verfügbarkeit neuer zertifizierter Partien",
		"Disponibilité de nouveaux lots certifiés",
		"Disponibilidad de nuevos lotes certificados",
		"Disponibilità di nuovi lotti certificati"
	],
	[
		"Current cultivar-specific offers",
		"Aktuelle sortenspezifische Angebote",
		"Offres actuelles par variété",
		"Ofertas actuales por variedad",
		"Offerte attuali per varietà"
	],
	[
		"Compare cultivar and lot quality; the old value is not a current quote.",
		"Sorte und Partienqualität vergleichen; der alte Wert ist kein aktuelles Angebot.",
		"Comparer variété et qualité des lots ; l’ancienne valeur n’est pas une offre actuelle.",
		"Comparar variedad y calidad del lote; el valor antiguo no es una oferta actual.",
		"Confrontare varietà e qualità del lotto; il vecchio valore non è un’offerta attuale."
	],
	[
		"Germany reports 2026 seed declarations. June trade rose and unit value fell; variety-level availability is unresolved.",
		"Deutschland meldet Saatgutflächen für 2026. Junihandel stieg, Handelswert je kg sank; Sortenverfügbarkeit ist ungeklärt.",
		"L’Allemagne déclare des surfaces semencières 2026. Le commerce de juin a augmenté, la valeur unitaire a baissé ; disponibilité variétale non résolue.",
		"Alemania declara superficies semilleras 2026. El comercio de junio subió y el valor unitario bajó; disponibilidad varietal sin resolver.",
		"La Germania dichiara superfici sementiere 2026. Gli scambi di giugno salgono e il valore unitario scende; disponibilità varietale irrisolta."
	],
	[
		"Certified availability by maturity group",
		"Zertifizierte Verfügbarkeit nach Reifegruppe",
		"Disponibilité certifiée par groupe de maturité",
		"Disponibilidad certificada por grupo de madurez",
		"Disponibilità certificata per gruppo di maturità"
	],
	[
		"New-lot germination and treatment",
		"Keimfähigkeit und Behandlung neuer Partien",
		"Germination et traitement des nouveaux lots",
		"Germinación y tratamiento de nuevos lotes",
		"Germinabilità e trattamento dei nuovi lotti"
	],
	[
		"Match maturity group and certified lot specifications.",
		"Reifegruppe und zertifizierte Partienspezifikationen abstimmen.",
		"Faire correspondre groupe de maturité et spécifications du lot certifié.",
		"Ajustar grupo de madurez y especificaciones del lote certificado.",
		"Abbinare gruppo di maturità e specifiche del lotto certificato."
	],
	[
		"Reported 2026 fibre-flax area expanded in France, Belgium and the Netherlands; next-season seed demand is unconfirmed.",
		"Gemeldete Faserleinfläche 2026 stieg in Frankreich, Belgien und den Niederlanden; Saatgutbedarf der Folgesaison ist unbestätigt.",
		"Les surfaces de lin fibre déclarées en 2026 ont augmenté en France, Belgique et aux Pays-Bas ; demande semencière suivante non confirmée.",
		"La superficie declarada de lino textil 2026 aumentó en Francia, Bélgica y Países Bajos; demanda de semillas próxima sin confirmar.",
		"La superficie dichiarata di lino da fibra 2026 è cresciuta in Francia, Belgio e Paesi Bassi; domanda sementiera futura non confermata."
	],
	[
		"Oilseed versus fibre sowing contracts",
		"Aussaatverträge für Öl- und Faserlein getrennt",
		"Contrats de semis : lin oléagineux et lin fibre",
		"Contratos de siembra: lino oleaginoso y textil",
		"Contratti di semina: lino oleaginoso e da fibra"
	],
	[
		"Seed usage and replacement rate",
		"Saatgutverbrauch und Erneuerungsquote",
		"Utilisation des semences et taux de renouvellement",
		"Uso de semillas y tasa de renovación",
		"Uso delle sementi e tasso di rinnovo"
	],
	[
		"Separate oilseed and fibre requirements; confirm sowing contracts.",
		"Öl- und Faseranforderungen trennen; Aussaatverträge bestätigen.",
		"Séparer les besoins oléagineux et fibre ; confirmer les contrats de semis.",
		"Separar necesidades oleaginosas y textiles; confirmar contratos de siembra.",
		"Separare esigenze oleaginose e da fibra; confermare contratti di semina."
	],
	[
		"German certification includes domestic and foreign-grown seed; declared 2026 area is not the entire supply.",
		"Deutsche Zertifizierung umfasst in- und ausländisch erzeugtes Saatgut; gemeldete Fläche 2026 ist nicht das gesamte Angebot.",
		"La certification allemande inclut des semences produites localement et à l’étranger ; la surface déclarée 2026 n’est pas toute l’offre.",
		"La certificación alemana incluye semillas nacionales y extranjeras; la superficie declarada 2026 no representa toda la oferta.",
		"La certificazione tedesca include sementi nazionali ed estere; la superficie dichiarata 2026 non è l’intera offerta."
	],
	[
		"Current certified fodder-beet lots",
		"Aktuelle zertifizierte Futterrübenpartien",
		"Lots actuels certifiés de betterave fourragère",
		"Lotes certificados actuales de remolacha forrajera",
		"Lotti certificati attuali di bietola da foraggio"
	],
	[
		"Domestic versus foreign production origin",
		"Inländische oder ausländische Produktionsherkunft",
		"Origine de production nationale ou étrangère",
		"Origen de producción nacional o extranjero",
		"Origine produttiva nazionale o estera"
	],
	[
		"Check fodder-beet scope and lot origin; other beet uses differ.",
		"Futterrübenumfang und Partienherkunft prüfen; andere Rübennutzungen unterscheiden.",
		"Vérifier usage fourrager et origine du lot ; les autres usages diffèrent.",
		"Verificar uso forrajero y origen del lote; otros usos difieren.",
		"Verificare uso foraggero e origine del lotto; altri usi differiscono."
	]
];
//#endregion
//#region src/i18n/b2bMessages.js
var b2bRows = [
	[
		"A necessary session cookie keeps you signed in. Non-essential analytics is disabled.",
		"Ein notwendiges Sitzungscookie hält Sie angemeldet. Nicht erforderliche Analysen sind deaktiviert.",
		"Un cookie de session nécessaire maintient votre connexion. Les analyses non essentielles sont désactivées.",
		"Una cookie de sesión necesaria mantiene su acceso. El análisis no esencial está desactivado.",
		"Un cookie di sessione necessario mantiene l’accesso. Le analisi non essenziali sono disattivate."
	],
	[
		"Company registration",
		"Unternehmensregistrierung",
		"Inscription de l’entreprise",
		"Registro de empresa",
		"Registrazione aziendale"
	],
	[
		"Company account",
		"Unternehmenskonto",
		"Compte entreprise",
		"Cuenta de empresa",
		"Account aziendale"
	],
	[
		"Register company",
		"Unternehmen registrieren",
		"Inscrire une entreprise",
		"Registrar empresa",
		"Registra azienda"
	],
	[
		"Company legal name",
		"Eingetragener Firmenname",
		"Raison sociale",
		"Razón social",
		"Ragione sociale"
	],
	[
		"Legal company name",
		"Eingetragener Firmenname",
		"Raison sociale",
		"Razón social",
		"Ragione sociale"
	],
	[
		"Registration country (ISO 2-letter code)",
		"Registrierungsland (ISO-Code, 2 Buchstaben)",
		"Pays d’immatriculation (code ISO à 2 lettres)",
		"País de registro (código ISO de 2 letras)",
		"Paese di registrazione (codice ISO a 2 lettere)"
	],
	[
		"Registration country (ISO 2 letters)",
		"Registrierungsland (2 ISO-Buchstaben)",
		"Pays d’immatriculation (2 lettres ISO)",
		"País de registro (2 letras ISO)",
		"Paese di registrazione (2 lettere ISO)"
	],
	[
		"Company registration number",
		"Handelsregisternummer",
		"Numéro d’immatriculation",
		"Número de registro de empresa",
		"Numero di registrazione aziendale"
	],
	[
		"Registration number",
		"Registernummer",
		"Numéro d’immatriculation",
		"Número de registro",
		"Numero di registrazione"
	],
	[
		"Business email",
		"Geschäftliche E-Mail",
		"E-mail professionnel",
		"Correo profesional",
		"Email aziendale"
	],
	[
		"Password",
		"Passwort",
		"Mot de passe",
		"Contraseña",
		"Password"
	],
	[
		"Sign in",
		"Anmelden",
		"Se connecter",
		"Iniciar sesión",
		"Accedi"
	],
	[
		"Sign out",
		"Abmelden",
		"Se déconnecter",
		"Cerrar sesión",
		"Esci"
	],
	[
		"Company sign in",
		"Unternehmensanmeldung",
		"Connexion entreprise",
		"Inicio de sesión de empresa",
		"Accesso aziendale"
	],
	[
		"Sign in / company account",
		"Anmelden / Unternehmenskonto",
		"Connexion / compte entreprise",
		"Acceso / cuenta de empresa",
		"Accesso / account aziendale"
	],
	[
		"Reviewer sign in",
		"Prüferanmeldung",
		"Connexion du vérificateur",
		"Acceso del revisor",
		"Accesso del revisore"
	],
	[
		"Company approval is required. Access may be unavailable while B2B is closed.",
		"Eine Unternehmensfreigabe ist erforderlich. Solange B2B geschlossen ist, kann der Zugang fehlen.",
		"L’approbation de l’entreprise est requise. L’accès peut être indisponible tant que le B2B est fermé.",
		"Se requiere aprobación de la empresa. El acceso puede no estar disponible mientras B2B esté cerrado.",
		"È necessaria l’approvazione dell’azienda. L’accesso può essere indisponibile finché il B2B è chiuso."
	],
	[
		"Register your company and confirm your business email address.",
		"Registrieren Sie Ihr Unternehmen und bestätigen Sie Ihre geschäftliche E-Mail-Adresse.",
		"Inscrivez votre entreprise et confirmez votre adresse e-mail professionnelle.",
		"Registre su empresa y confirme su correo profesional.",
		"Registra la tua azienda e conferma l’indirizzo email aziendale."
	],
	[
		"Company registration is currently unavailable.",
		"Die Unternehmensregistrierung ist derzeit nicht verfügbar.",
		"L’inscription des entreprises est actuellement indisponible.",
		"El registro de empresas no está disponible actualmente.",
		"La registrazione aziendale non è attualmente disponibile."
	],
	[
		"Registration is currently unavailable.",
		"Die Registrierung ist derzeit nicht verfügbar.",
		"L’inscription est actuellement indisponible.",
		"El registro no está disponible actualmente.",
		"La registrazione non è attualmente disponibile."
	],
	[
		"No registration data is submitted while this form is unavailable.",
		"Solange dieses Formular nicht verfügbar ist, werden keine Registrierungsdaten übermittelt.",
		"Aucune donnée d’inscription n’est envoyée tant que ce formulaire est indisponible.",
		"No se envían datos de registro mientras este formulario no esté disponible.",
		"Non vengono inviati dati di registrazione quando questo modulo non è disponibile."
	],
	[
		"Your company remains subject to review after email confirmation.",
		"Ihr Unternehmen muss nach der E-Mail-Bestätigung weiterhin geprüft werden.",
		"Votre entreprise reste soumise à vérification après confirmation de l’e-mail.",
		"Su empresa sigue sujeta a revisión después de confirmar el correo.",
		"La tua azienda resta soggetta a verifica dopo la conferma dell’email."
	],
	[
		"Email verification confirms mailbox access only. Offers and enquiries become available after a separate business review.",
		"Die E-Mail-Bestätigung bestätigt nur den Postfachzugriff. Angebote und Anfragen sind erst nach einer gesonderten Unternehmensprüfung verfügbar.",
		"La vérification de l’e-mail confirme uniquement l’accès à la messagerie. Les offres et demandes deviennent accessibles après une vérification distincte de l’entreprise.",
		"La verificación del correo solo confirma el acceso al buzón. Las ofertas y consultas estarán disponibles tras una revisión independiente de la empresa.",
		"La verifica dell’email conferma solo l’accesso alla casella. Offerte e richieste diventano disponibili dopo una verifica aziendale separata."
	],
	[
		"MB \"Gate-V\" processes your personal data to administer your account and enable business communications.",
		"MB \"Gate-V\" verarbeitet Ihre personenbezogenen Daten zur Kontoverwaltung und für geschäftliche Kommunikation.",
		"MB \"Gate-V\" traite vos données personnelles pour gérer votre compte et permettre les échanges professionnels.",
		"MB \"Gate-V\" trata sus datos personales para administrar su cuenta y facilitar las comunicaciones comerciales.",
		"MB \"Gate-V\" tratta i dati personali per gestire l’account e consentire le comunicazioni aziendali."
	],
	[
		"B2B Terms",
		"B2B-Bedingungen",
		"Conditions B2B",
		"Condiciones B2B",
		"Condizioni B2B"
	],
	[
		"Privacy Notice",
		"Datenschutzhinweise",
		"Notice de confidentialité",
		"Aviso de privacidad",
		"Informativa privacy"
	],
	[
		"Notice version",
		"Version der Hinweise",
		"Version de la notice",
		"Versión del aviso",
		"Versione dell’informativa"
	],
	[
		"Declaration version",
		"Version der Erklärung",
		"Version de la déclaration",
		"Versión de la declaración",
		"Versione della dichiarazione"
	],
	[
		"English legal text",
		"Rechtstext auf Englisch",
		"Texte juridique en anglais",
		"Texto legal en inglés",
		"Testo legale in inglese"
	],
	[
		"English legal declaration",
		"Rechtliche Erklärung auf Englisch",
		"Déclaration juridique en anglais",
		"Declaración legal en inglés",
		"Dichiarazione legale in inglese"
	],
	[
		"The legal documents are provided in English. Your interface language does not change the accepted legal version.",
		"Die Rechtsdokumente werden auf Englisch bereitgestellt. Die Sprache der Oberfläche ändert die akzeptierte Rechtsfassung nicht.",
		"Les documents juridiques sont fournis en anglais. La langue de l’interface ne modifie pas la version juridique acceptée.",
		"Los documentos legales se ofrecen en inglés. El idioma de la interfaz no cambia la versión legal aceptada.",
		"I documenti legali sono forniti in inglese. La lingua dell’interfaccia non modifica la versione legale accettata."
	],
	[
		"Local review draft. Not approved for publication or public acceptance.",
		"Lokaler Prüfentwurf. Nicht zur Veröffentlichung oder öffentlichen Annahme freigegeben.",
		"Projet de révision local. Non approuvé pour publication ou acceptation publique.",
		"Borrador local de revisión. No aprobado para publicación ni aceptación pública.",
		"Bozza di revisione locale. Non approvata per pubblicazione o accettazione pubblica."
	],
	[
		"Save or print the English version",
		"Englische Fassung speichern oder drucken",
		"Enregistrer ou imprimer la version anglaise",
		"Guardar o imprimir la versión inglesa",
		"Salva o stampa la versione inglese"
	],
	[
		"Download exact source",
		"Exakte Quelle herunterladen",
		"Télécharger la source exacte",
		"Descargar la fuente exacta",
		"Scarica la fonte esatta"
	],
	[
		"Contacts and content reports",
		"Kontakt und Inhaltsmeldungen",
		"Contacts et signalements de contenu",
		"Contacto y denuncias de contenido",
		"Contatti e segnalazioni di contenuti"
	],
	[
		"Report content",
		"Inhalt melden",
		"Signaler un contenu",
		"Denunciar contenido",
		"Segnala contenuti"
	],
	[
		"Sign in or request another verification email",
		"Anmelden oder eine weitere Bestätigungs-E-Mail anfordern",
		"Se connecter ou demander un nouvel e-mail de vérification",
		"Iniciar sesión o solicitar otro correo de verificación",
		"Accedi o richiedi un’altra email di verifica"
	],
	[
		"Request new verification email",
		"Neue Bestätigungs-E-Mail anfordern",
		"Demander un nouvel e-mail de vérification",
		"Solicitar nuevo correo de verificación",
		"Richiedi una nuova email di verifica"
	],
	[
		"Your registration was saved. Confirmation email delivery is pending. Your email is not yet verified.",
		"Ihre Registrierung wurde gespeichert. Die Bestätigungs-E-Mail wartet auf Zustellung. Ihre E-Mail ist noch nicht bestätigt.",
		"Votre inscription a été enregistrée. L’envoi de l’e-mail de confirmation est en attente. Votre adresse n’est pas encore vérifiée.",
		"Su registro se ha guardado. El correo de confirmación está pendiente de entrega. Su correo aún no está verificado.",
		"La registrazione è stata salvata. La consegna dell’email di conferma è in sospeso. L’email non è ancora verificata."
	],
	[
		"Please check your email to confirm your address. Company review may still be pending.",
		"Bitte prüfen Sie Ihr Postfach und bestätigen Sie Ihre Adresse. Die Unternehmensprüfung kann noch ausstehen.",
		"Consultez votre messagerie pour confirmer votre adresse. La vérification de l’entreprise peut rester en attente.",
		"Revise su correo para confirmar su dirección. La revisión de la empresa puede seguir pendiente.",
		"Controlla la posta per confermare l’indirizzo. La verifica aziendale potrebbe essere ancora in sospeso."
	],
	[
		"Check your details and refresh this page to load the current Terms before retrying.",
		"Prüfen Sie Ihre Angaben und laden Sie die Seite neu, um vor einem erneuten Versuch die aktuellen Bedingungen zu laden.",
		"Vérifiez vos informations et actualisez cette page pour charger les conditions actuelles avant de réessayer.",
		"Compruebe sus datos y actualice la página para cargar las condiciones vigentes antes de reintentar.",
		"Controlla i dati e aggiorna la pagina per caricare le condizioni attuali prima di riprovare."
	],
	[
		"Too many attempts. Please try again later.",
		"Zu viele Versuche. Bitte später erneut versuchen.",
		"Trop de tentatives. Réessayez plus tard.",
		"Demasiados intentos. Vuelva a intentarlo más tarde.",
		"Troppi tentativi. Riprova più tardi."
	],
	[
		"The registration result could not be confirmed. Do not register again. Use your company account to check sign-in or request a verification email.",
		"Das Registrierungsergebnis konnte nicht bestätigt werden. Registrieren Sie sich nicht erneut. Prüfen Sie die Anmeldung im Unternehmenskonto oder fordern Sie eine Bestätigungs-E-Mail an.",
		"Le résultat de l’inscription n’a pas pu être confirmé. Ne vous réinscrivez pas. Vérifiez la connexion à votre compte entreprise ou demandez un e-mail de vérification.",
		"No se pudo confirmar el resultado del registro. No vuelva a registrarse. Compruebe el acceso a su cuenta de empresa o solicite un correo de verificación.",
		"Non è stato possibile confermare la registrazione. Non registrarti di nuovo. Verifica l’accesso all’account aziendale o richiedi un’email di verifica."
	],
	[
		"Verifying your email",
		"E-Mail wird bestätigt",
		"Vérification de votre e-mail",
		"Verificando su correo",
		"Verifica dell’email in corso"
	],
	[
		"Please wait while we check your confirmation link.",
		"Bitte warten Sie, während wir Ihren Bestätigungslink prüfen.",
		"Patientez pendant la vérification de votre lien de confirmation.",
		"Espere mientras comprobamos su enlace de confirmación.",
		"Attendi mentre controlliamo il link di conferma."
	],
	[
		"Email verified",
		"E-Mail bestätigt",
		"E-mail vérifié",
		"Correo verificado",
		"Email verificata"
	],
	[
		"Your email address has been confirmed. Company review may still be pending.",
		"Ihre E-Mail-Adresse wurde bestätigt. Die Unternehmensprüfung kann noch ausstehen.",
		"Votre adresse e-mail a été confirmée. La vérification de l’entreprise peut rester en attente.",
		"Su dirección de correo ha sido confirmada. La revisión de la empresa puede seguir pendiente.",
		"L’indirizzo email è stato confermato. La verifica aziendale potrebbe essere ancora in sospeso."
	],
	[
		"Invalid confirmation link",
		"Ungültiger Bestätigungslink",
		"Lien de confirmation non valide",
		"Enlace de confirmación no válido",
		"Link di conferma non valido"
	],
	[
		"The link is incomplete or invalid. Request a new link when registration is available.",
		"Der Link ist unvollständig oder ungültig. Fordern Sie einen neuen Link an, sobald die Registrierung verfügbar ist.",
		"Le lien est incomplet ou non valide. Demandez un nouveau lien lorsque l’inscription est disponible.",
		"El enlace está incompleto o no es válido. Solicite uno nuevo cuando el registro esté disponible.",
		"Il link è incompleto o non valido. Richiedi un nuovo link quando la registrazione sarà disponibile."
	],
	[
		"Link expired or already used",
		"Link abgelaufen oder bereits verwendet",
		"Lien expiré ou déjà utilisé",
		"Enlace caducado o ya utilizado",
		"Link scaduto o già utilizzato"
	],
	[
		"This confirmation link is no longer valid.",
		"Dieser Bestätigungslink ist nicht mehr gültig.",
		"Ce lien de confirmation n’est plus valide.",
		"Este enlace de confirmación ya no es válido.",
		"Questo link di conferma non è più valido."
	],
	[
		"Verification unavailable",
		"Bestätigung nicht verfügbar",
		"Vérification indisponible",
		"Verificación no disponible",
		"Verifica non disponibile"
	],
	[
		"The verification result could not be confirmed. Sign in to check your account or request a fresh link.",
		"Das Bestätigungsergebnis konnte nicht festgestellt werden. Melden Sie sich zur Kontoprüfung an oder fordern Sie einen neuen Link an.",
		"Le résultat de la vérification n’a pas pu être confirmé. Connectez-vous pour vérifier votre compte ou demandez un nouveau lien.",
		"No se pudo confirmar la verificación. Inicie sesión para comprobar su cuenta o solicite un nuevo enlace.",
		"Non è stato possibile confermare la verifica. Accedi per controllare l’account o richiedi un nuovo link."
	],
	[
		"Sign in to your company account",
		"Beim Unternehmenskonto anmelden",
		"Se connecter au compte entreprise",
		"Acceder a su cuenta de empresa",
		"Accedi al tuo account aziendale"
	],
	[
		"Return to SeedTrade.eu",
		"Zurück zu SeedTrade.eu",
		"Retour à SeedTrade.eu",
		"Volver a SeedTrade.eu",
		"Torna a SeedTrade.eu"
	],
	[
		"Checking account availability…",
		"Kontoverfügbarkeit wird geprüft…",
		"Vérification de la disponibilité du compte…",
		"Comprobando disponibilidad de la cuenta…",
		"Verifica della disponibilità dell’account…"
	],
	[
		"Company accounts are currently unavailable.",
		"Unternehmenskonten sind derzeit nicht verfügbar.",
		"Les comptes entreprise sont actuellement indisponibles.",
		"Las cuentas de empresa no están disponibles actualmente.",
		"Gli account aziendali non sono attualmente disponibili."
	],
	[
		"Company account is temporarily unavailable.",
		"Das Unternehmenskonto ist vorübergehend nicht verfügbar.",
		"Le compte entreprise est temporairement indisponible.",
		"La cuenta de empresa no está disponible temporalmente.",
		"L’account aziendale non è temporaneamente disponibile."
	],
	[
		"Sign in after confirming your email. Company approval is required before creating offers or contacting sellers.",
		"Melden Sie sich nach der E-Mail-Bestätigung an. Vor dem Erstellen von Angeboten oder der Kontaktaufnahme mit Verkäufern ist eine Unternehmensfreigabe erforderlich.",
		"Connectez-vous après confirmation de l’e-mail. L’entreprise doit être approuvée avant de créer des offres ou contacter des vendeurs.",
		"Inicie sesión tras confirmar su correo. La empresa debe estar aprobada para crear ofertas o contactar con vendedores.",
		"Accedi dopo aver confermato l’email. L’azienda deve essere approvata prima di creare offerte o contattare venditori."
	],
	[
		"If these details match an unverified account, a new confirmation email has been requested.",
		"Wenn diese Angaben zu einem unbestätigten Konto gehören, wurde eine neue Bestätigungs-E-Mail angefordert.",
		"Si ces informations correspondent à un compte non vérifié, un nouvel e-mail de confirmation a été demandé.",
		"Si estos datos corresponden a una cuenta sin verificar, se ha solicitado un nuevo correo de confirmación.",
		"Se questi dati corrispondono a un account non verificato, è stata richiesta una nuova email di conferma."
	],
	[
		"Signed in as",
		"Angemeldet als",
		"Connecté en tant que",
		"Sesión iniciada como",
		"Accesso effettuato come"
	],
	[
		"Company",
		"Unternehmen",
		"Entreprise",
		"Empresa",
		"Azienda"
	],
	[
		"My offers",
		"Meine Angebote",
		"Mes offres",
		"Mis ofertas",
		"Le mie offerte"
	],
	[
		"Find seed",
		"Saatgut finden",
		"Trouver des semences",
		"Buscar semillas",
		"Trova sementi"
	],
	[
		"Inquiries",
		"Anfragen",
		"Demandes",
		"Consultas",
		"Richieste"
	],
	[
		"Company reviews",
		"Unternehmensprüfungen",
		"Vérifications des entreprises",
		"Revisiones de empresas",
		"Verifiche aziendali"
	],
	[
		"Refresh account",
		"Konto aktualisieren",
		"Actualiser le compte",
		"Actualizar cuenta",
		"Aggiorna account"
	],
	[
		"Company identity and profile",
		"Unternehmensidentität und Profil",
		"Identité et profil de l’entreprise",
		"Identidad y perfil de empresa",
		"Identità e profilo aziendale"
	],
	[
		"Pending company review",
		"Unternehmensprüfung ausstehend",
		"Vérification de l’entreprise en attente",
		"Revisión de empresa pendiente",
		"Verifica aziendale in sospeso"
	],
	[
		"Company approved",
		"Unternehmen freigegeben",
		"Entreprise approuvée",
		"Empresa aprobada",
		"Azienda approvata"
	],
	[
		"More company information required",
		"Weitere Unternehmensangaben erforderlich",
		"Informations supplémentaires sur l’entreprise requises",
		"Se necesita más información de la empresa",
		"Sono necessarie altre informazioni aziendali"
	],
	[
		"Company review rejected",
		"Unternehmensprüfung abgelehnt",
		"Vérification de l’entreprise refusée",
		"Revisión de empresa rechazada",
		"Verifica aziendale respinta"
	],
	[
		"Reviewer feedback:",
		"Rückmeldung des Prüfers:",
		"Retour du vérificateur :",
		"Comentarios del revisor:",
		"Riscontro del revisore:"
	],
	[
		"Saving company changes requests a new review and returns published offers to draft.",
		"Gespeicherte Unternehmensänderungen lösen eine neue Prüfung aus und setzen veröffentlichte Angebote auf Entwurf zurück.",
		"Enregistrer les modifications de l’entreprise demande une nouvelle vérification et remet les offres publiées en brouillon.",
		"Guardar cambios de empresa solicita una nueva revisión y devuelve las ofertas publicadas a borrador.",
		"Salvare modifiche aziendali richiede una nuova verifica e riporta le offerte pubblicate in bozza."
	],
	[
		"Company profile",
		"Unternehmensprofil",
		"Profil d’entreprise",
		"Perfil de empresa",
		"Profilo aziendale"
	],
	[
		"Company details",
		"Unternehmensdaten",
		"Coordonnées de l’entreprise",
		"Datos de empresa",
		"Dati aziendali"
	],
	[
		"Contact name",
		"Name der Kontaktperson",
		"Nom du contact",
		"Nombre de contacto",
		"Nome del contatto"
	],
	[
		"Contact role",
		"Funktion der Kontaktperson",
		"Fonction du contact",
		"Cargo del contacto",
		"Ruolo del contatto"
	],
	[
		"Phone (optional)",
		"Telefon (optional)",
		"Téléphone (facultatif)",
		"Teléfono (opcional)",
		"Telefono (facoltativo)"
	],
	[
		"VAT number (optional)",
		"USt-IdNr. (optional)",
		"Numéro de TVA (facultatif)",
		"NIF-IVA (opcional)",
		"Partita IVA (facoltativa)"
	],
	[
		"Registered address",
		"Eingetragene Anschrift",
		"Adresse du siège",
		"Domicilio social",
		"Sede legale"
	],
	[
		"Street",
		"Straße",
		"Rue",
		"Calle",
		"Via"
	],
	[
		"City",
		"Stadt",
		"Ville",
		"Ciudad",
		"Città"
	],
	[
		"Postal code",
		"Postleitzahl",
		"Code postal",
		"Código postal",
		"Codice postale"
	],
	[
		"Address country (ISO 2 letters)",
		"Adressland (2 ISO-Buchstaben)",
		"Pays de l’adresse (2 lettres ISO)",
		"País del domicilio (2 letras ISO)",
		"Paese dell’indirizzo (2 lettere ISO)"
	],
	[
		"Company activities",
		"Unternehmensaktivitäten",
		"Activités de l’entreprise",
		"Actividades de la empresa",
		"Attività aziendali"
	],
	[
		"BUYER",
		"Käufer",
		"Acheteur",
		"Comprador",
		"Acquirente"
	],
	[
		"SELLER",
		"Verkäufer",
		"Vendeur",
		"Vendedor",
		"Venditore"
	],
	[
		"PRODUCER",
		"Erzeuger",
		"Producteur",
		"Productor",
		"Produttore"
	],
	[
		"Seed species (optional)",
		"Saatgutarten (optional)",
		"Espèces de semences (facultatif)",
		"Especies de semillas (opcional)",
		"Specie di sementi (facoltativo)"
	],
	[
		"Submit company profile",
		"Unternehmensprofil einreichen",
		"Soumettre le profil d’entreprise",
		"Enviar perfil de empresa",
		"Invia profilo aziendale"
	],
	[
		"My seed offers",
		"Meine Saatgutangebote",
		"Mes offres de semences",
		"Mis ofertas de semillas",
		"Le mie offerte di sementi"
	],
	[
		"Published B2B offers are visible to other approved business users. Company name, species, quantity/unit, price/currency if supplied, seed status, origin and expiry are shown below. Contacts and private messages are not part of this offer preview.",
		"Veröffentlichte B2B-Angebote sind für andere freigegebene Geschäftsnutzer sichtbar. Firmenname, Art, Menge/Einheit, gegebenenfalls Preis/Währung, Saatgutstatus, Herkunft und Ablaufdatum werden unten angezeigt. Kontakte und private Nachrichten gehören nicht zur Angebotsvorschau.",
		"Les offres B2B publiées sont visibles par les autres professionnels approuvés. Le nom de l’entreprise, l’espèce, la quantité/unité, le prix/devise si fourni, le statut des semences, l’origine et l’échéance figurent ci-dessous. Les contacts et messages privés ne font pas partie de cet aperçu.",
		"Las ofertas B2B publicadas son visibles para otros usuarios profesionales aprobados. Se muestran empresa, especie, cantidad/unidad, precio/moneda si se indica, estado de la semilla, origen y vencimiento. Los contactos y mensajes privados no forman parte de esta vista previa.",
		"Le offerte B2B pubblicate sono visibili agli altri utenti aziendali approvati. Sono mostrati nome aziendale, specie, quantità/unità, prezzo/valuta se indicati, stato delle sementi, origine e scadenza. Contatti e messaggi privati non fanno parte dell’anteprima."
	],
	[
		"Listing rules",
		"Angebotsregeln",
		"Règles de publication",
		"Normas de publicación",
		"Regole di pubblicazione"
	],
	[
		"By publishing, you confirm this offer is accurate and you are entitled to offer the seed. Certification and organic claims require applicable evidence; company approval does not verify seed quality. No sale is automatically concluded by publication.",
		"Mit der Veröffentlichung bestätigen Sie die Richtigkeit des Angebots und Ihre Berechtigung, das Saatgut anzubieten. Zertifizierungs- und Bioangaben erfordern entsprechende Nachweise; die Unternehmensfreigabe bestätigt keine Saatgutqualität. Durch die Veröffentlichung wird kein Verkauf automatisch abgeschlossen.",
		"En publiant, vous confirmez l’exactitude de l’offre et votre droit de proposer ces semences. Les mentions de certification et biologiques nécessitent des justificatifs ; l’approbation de l’entreprise ne vérifie pas la qualité des semences. La publication ne conclut aucune vente automatiquement.",
		"Al publicar confirma que la oferta es correcta y que tiene derecho a ofrecer la semilla. Las afirmaciones de certificación y producción ecológica requieren pruebas; la aprobación de empresa no verifica la calidad. La publicación no formaliza una venta automáticamente.",
		"Pubblicando confermi che l’offerta è corretta e che hai diritto a offrire le sementi. Certificazione e dichiarazioni biologiche richiedono prove; l’approvazione aziendale non verifica la qualità. La pubblicazione non conclude automaticamente una vendita."
	],
	[
		"Your company must be approved before creating or publishing offers.",
		"Ihr Unternehmen muss vor dem Erstellen oder Veröffentlichen von Angeboten freigegeben werden.",
		"Votre entreprise doit être approuvée avant de créer ou publier des offres.",
		"Su empresa debe estar aprobada antes de crear o publicar ofertas.",
		"La tua azienda deve essere approvata prima di creare o pubblicare offerte."
	],
	[
		"New offer",
		"Neues Angebot",
		"Nouvelle offre",
		"Nueva oferta",
		"Nuova offerta"
	],
	[
		"Seed offer",
		"Saatgutangebot",
		"Offre de semences",
		"Oferta de semillas",
		"Offerta di sementi"
	],
	[
		"Edit draft",
		"Entwurf bearbeiten",
		"Modifier le brouillon",
		"Editar borrador",
		"Modifica bozza"
	],
	[
		"Edit draft {id}",
		"Entwurf {id} bearbeiten",
		"Modifier le brouillon {id}",
		"Editar borrador {id}",
		"Modifica bozza {id}"
	],
	[
		"Publish offer {id}",
		"Angebot {id} veröffentlichen",
		"Publier l’offre {id}",
		"Publicar oferta {id}",
		"Pubblica offerta {id}"
	],
	[
		"Close offer {id}",
		"Angebot {id} schließen",
		"Clore l’offre {id}",
		"Cerrar oferta {id}",
		"Chiudi offerta {id}"
	],
	[
		"New seed offer",
		"Neues Saatgutangebot",
		"Nouvelle offre de semences",
		"Nueva oferta de semillas",
		"Nuova offerta di sementi"
	],
	[
		"Select species",
		"Art auswählen",
		"Sélectionner une espèce",
		"Seleccionar especie",
		"Seleziona specie"
	],
	[
		"Quantity unit",
		"Mengeneinheit",
		"Unité de quantité",
		"Unidad de cantidad",
		"Unità di quantità"
	],
	[
		"tonnes",
		"Tonnen",
		"tonnes",
		"toneladas",
		"tonnellate"
	],
	[
		"Price (EUR per selected unit, optional)",
		"Preis (EUR je gewählter Einheit, optional)",
		"Prix (EUR par unité choisie, facultatif)",
		"Precio (EUR por unidad elegida, opcional)",
		"Prezzo (EUR per unità scelta, facoltativo)"
	],
	[
		"Seed status",
		"Saatgutstatus",
		"Statut des semences",
		"Estado de la semilla",
		"Stato delle sementi"
	],
	[
		"Sowing status not specified",
		"Aussaatstatus nicht angegeben",
		"Statut de semis non précisé",
		"Estado de siembra no especificado",
		"Stato di semina non specificato"
	],
	[
		"Certified sowing seed",
		"Zertifiziertes Saatgut",
		"Semences certifiées pour semis",
		"Semilla certificada para siembra",
		"Sementi certificate per semina"
	],
	[
		"Non-certified sowing seed",
		"Nicht zertifiziertes Saatgut",
		"Semences non certifiées pour semis",
		"Semilla no certificada para siembra",
		"Sementi non certificate per semina"
	],
	[
		"SOWING_STATUS_UNKNOWN",
		"Aussaatstatus nicht angegeben",
		"Statut de semis non précisé",
		"Estado de siembra no especificado",
		"Stato di semina non specificato"
	],
	[
		"CERTIFIED_SOWING",
		"Zertifiziertes Saatgut",
		"Semences certifiées pour semis",
		"Semilla certificada para siembra",
		"Sementi certificate per semina"
	],
	[
		"NON_CERTIFIED_SOWING",
		"Nicht zertifiziertes Saatgut",
		"Semences non certifiées pour semis",
		"Semilla no certificada para siembra",
		"Sementi non certificate per semina"
	],
	[
		"Seed origin country (ISO 2 letters)",
		"Saatgutherkunftsland (2 ISO-Buchstaben)",
		"Pays d’origine des semences (2 lettres ISO)",
		"País de origen de la semilla (2 letras ISO)",
		"Paese d’origine delle sementi (2 lettere ISO)"
	],
	[
		"Valid until",
		"Gültig bis",
		"Valable jusqu’au",
		"Válido hasta",
		"Valido fino al"
	],
	[
		"Save offer draft",
		"Angebotsentwurf speichern",
		"Enregistrer le brouillon d’offre",
		"Guardar borrador de oferta",
		"Salva bozza dell’offerta"
	],
	[
		"Find seed offers",
		"Saatgutangebote finden",
		"Trouver des offres de semences",
		"Buscar ofertas de semillas",
		"Trova offerte di sementi"
	],
	[
		"Company approval is required to browse trading offers.",
		"Zum Anzeigen von Handelsangeboten ist eine Unternehmensfreigabe erforderlich.",
		"L’approbation de l’entreprise est requise pour consulter les offres commerciales.",
		"Se requiere aprobación de empresa para consultar ofertas comerciales.",
		"È necessaria l’approvazione aziendale per consultare le offerte commerciali."
	],
	[
		"Refresh offers",
		"Angebote aktualisieren",
		"Actualiser les offres",
		"Actualizar ofertas",
		"Aggiorna offerte"
	],
	[
		"No current offers from other approved companies.",
		"Keine aktuellen Angebote anderer freigegebener Unternehmen.",
		"Aucune offre actuelle d’autres entreprises approuvées.",
		"No hay ofertas actuales de otras empresas aprobadas.",
		"Nessuna offerta attuale da altre aziende approvate."
	],
	[
		"Price on inquiry",
		"Preis auf Anfrage",
		"Prix sur demande",
		"Precio previa consulta",
		"Prezzo su richiesta"
	],
	[
		"origin",
		"Herkunft",
		"origine",
		"origen",
		"origine"
	],
	[
		"expires",
		"gültig bis",
		"expire le",
		"vence",
		"scade"
	],
	[
		"Seller-declared seed status:",
		"Vom Verkäufer angegebener Saatgutstatus:",
		"Statut des semences déclaré par le vendeur :",
		"Estado de la semilla declarado por el vendedor:",
		"Stato delle sementi dichiarato dal venditore:"
	],
	[
		"Company approval does not certify this seed.",
		"Die Unternehmensfreigabe zertifiziert dieses Saatgut nicht.",
		"L’approbation de l’entreprise ne certifie pas ces semences.",
		"La aprobación de empresa no certifica esta semilla.",
		"L’approvazione aziendale non certifica queste sementi."
	],
	[
		"Inquiry for offer {id}",
		"Anfrage zu Angebot {id}",
		"Demande concernant l’offre {id}",
		"Consulta sobre la oferta {id}",
		"Richiesta per l’offerta {id}"
	],
	[
		"Your enquiry will be sent to this offer's seller and visible to your two companies. Do not include unnecessary personal data.",
		"Ihre Anfrage wird an den Verkäufer dieses Angebots gesendet und ist für Ihre beiden Unternehmen sichtbar. Geben Sie keine unnötigen personenbezogenen Daten an.",
		"Votre demande sera envoyée au vendeur de cette offre et visible par vos deux entreprises. N’incluez pas de données personnelles inutiles.",
		"Su consulta se enviará al vendedor de esta oferta y será visible para ambas empresas. No incluya datos personales innecesarios.",
		"La richiesta sarà inviata al venditore dell’offerta e visibile alle due aziende. Non includere dati personali non necessari."
	],
	[
		"Message to seller",
		"Nachricht an den Verkäufer",
		"Message au vendeur",
		"Mensaje al vendedor",
		"Messaggio al venditore"
	],
	[
		"Send inquiry",
		"Anfrage senden",
		"Envoyer la demande",
		"Enviar consulta",
		"Invia richiesta"
	],
	[
		"More offers",
		"Weitere Angebote",
		"Plus d’offres",
		"Más ofertas",
		"Altre offerte"
	],
	[
		"More my offers",
		"Weitere eigene Angebote",
		"Plus de mes offres",
		"Más ofertas propias",
		"Altre mie offerte"
	],
	[
		"Buyer and seller inquiries",
		"Käufer- und Verkäuferanfragen",
		"Demandes des acheteurs et vendeurs",
		"Consultas de compradores y vendedores",
		"Richieste di acquirenti e venditori"
	],
	[
		"Messages stay private to the buyer and seller companies. Do not include sensitive documents or payment credentials.",
		"Nachrichten bleiben zwischen Käufer- und Verkäuferunternehmen privat. Fügen Sie keine sensiblen Dokumente oder Zahlungszugangsdaten hinzu.",
		"Les messages restent privés entre les entreprises acheteuse et vendeuse. N’incluez pas de documents sensibles ni d’identifiants de paiement.",
		"Los mensajes son privados entre las empresas compradora y vendedora. No incluya documentos sensibles ni credenciales de pago.",
		"I messaggi restano privati tra le aziende acquirente e venditrice. Non includere documenti sensibili o credenziali di pagamento."
	],
	[
		"Refresh inquiries",
		"Anfragen aktualisieren",
		"Actualiser les demandes",
		"Actualizar consultas",
		"Aggiorna richieste"
	],
	[
		"No inquiries yet.",
		"Noch keine Anfragen.",
		"Aucune demande pour le moment.",
		"Aún no hay consultas.",
		"Nessuna richiesta per ora."
	],
	[
		"More inquiries",
		"Weitere Anfragen",
		"Plus de demandes",
		"Más consultas",
		"Altre richieste"
	],
	[
		"Inquiry conversation",
		"Anfrageverlauf",
		"Conversation de la demande",
		"Conversación de consulta",
		"Conversazione della richiesta"
	],
	[
		"Inquiry {id}",
		"Anfrage {id}",
		"Demande {id}",
		"Consulta {id}",
		"Richiesta {id}"
	],
	[
		"Refresh conversation",
		"Unterhaltung aktualisieren",
		"Actualiser la conversation",
		"Actualizar conversación",
		"Aggiorna conversazione"
	],
	[
		"Your company",
		"Ihr Unternehmen",
		"Votre entreprise",
		"Su empresa",
		"La tua azienda"
	],
	[
		"Counterparty",
		"Gegenpartei",
		"Contrepartie",
		"Contraparte",
		"Controparte"
	],
	[
		"More messages",
		"Weitere Nachrichten",
		"Plus de messages",
		"Más mensajes",
		"Altri messaggi"
	],
	[
		"Inquiry reply",
		"Antwort auf die Anfrage",
		"Réponse à la demande",
		"Respuesta a la consulta",
		"Risposta alla richiesta"
	],
	[
		"Reply",
		"Antwort",
		"Réponse",
		"Respuesta",
		"Risposta"
	],
	[
		"Send reply",
		"Antwort senden",
		"Envoyer la réponse",
		"Enviar respuesta",
		"Invia risposta"
	],
	[
		"Close inquiry",
		"Anfrage schließen",
		"Clore la demande",
		"Cerrar consulta",
		"Chiudi richiesta"
	],
	[
		"Review identity evidence before approving a company. Email confirmation alone is not company approval.",
		"Prüfen Sie die Identitätsnachweise vor einer Unternehmensfreigabe. Eine E-Mail-Bestätigung allein ist keine Unternehmensfreigabe.",
		"Vérifiez les justificatifs d’identité avant d’approuver une entreprise. La confirmation de l’e-mail ne suffit pas.",
		"Revise las pruebas de identidad antes de aprobar una empresa. Confirmar el correo no equivale a aprobar la empresa.",
		"Verifica le prove d’identità prima di approvare un’azienda. La sola conferma dell’email non approva l’azienda."
	],
	[
		"Review company {id}",
		"Unternehmen {id} prüfen",
		"Vérifier l’entreprise {id}",
		"Revisar empresa {id}",
		"Verifica azienda {id}"
	],
	[
		"Company decision",
		"Unternehmensentscheidung",
		"Décision sur l’entreprise",
		"Decisión sobre empresa",
		"Decisione aziendale"
	],
	[
		"Decision",
		"Entscheidung",
		"Décision",
		"Decisión",
		"Decisione"
	],
	[
		"Approve",
		"Freigeben",
		"Approuver",
		"Aprobar",
		"Approva"
	],
	[
		"Request more information",
		"Weitere Angaben anfordern",
		"Demander des informations supplémentaires",
		"Solicitar más información",
		"Richiedi altre informazioni"
	],
	[
		"Reject",
		"Ablehnen",
		"Refuser",
		"Rechazar",
		"Rifiuta"
	],
	[
		"Review reason",
		"Prüfungsbegründung",
		"Motif de la vérification",
		"Motivo de la revisión",
		"Motivo della verifica"
	],
	[
		"Save company decision",
		"Unternehmensentscheidung speichern",
		"Enregistrer la décision",
		"Guardar decisión sobre empresa",
		"Salva decisione aziendale"
	],
	[
		"More company reviews",
		"Weitere Unternehmensprüfungen",
		"Plus de vérifications d’entreprises",
		"Más revisiones de empresas",
		"Altre verifiche aziendali"
	],
	[
		"Public SeedTrade website",
		"Öffentliche SeedTrade-Website",
		"Site public SeedTrade",
		"Sitio público de SeedTrade",
		"Sito pubblico SeedTrade"
	],
	[
		"DRAFT",
		"Entwurf",
		"Brouillon",
		"Borrador",
		"Bozza"
	],
	[
		"PUBLISHED",
		"Veröffentlicht",
		"Publié",
		"Publicado",
		"Pubblicato"
	],
	[
		"CLOSED",
		"Geschlossen",
		"Clos",
		"Cerrado",
		"Chiuso"
	],
	[
		"OPEN",
		"Offen",
		"Ouvert",
		"Abierto",
		"Aperto"
	],
	[
		"REPLIED",
		"Beantwortet",
		"Répondu",
		"Respondido",
		"Con risposta"
	],
	[
		"Saved.",
		"Gespeichert.",
		"Enregistré.",
		"Guardado.",
		"Salvato."
	],
	[
		"Refreshed.",
		"Aktualisiert.",
		"Actualisé.",
		"Actualizado.",
		"Aggiornato."
	],
	[
		"Signed in.",
		"Angemeldet.",
		"Connexion réussie.",
		"Sesión iniciada.",
		"Accesso effettuato."
	],
	[
		"Signed out.",
		"Abgemeldet.",
		"Déconnexion réussie.",
		"Sesión cerrada.",
		"Disconnessione effettuata."
	],
	[
		"Company profile submitted for review.",
		"Unternehmensprofil zur Prüfung eingereicht.",
		"Profil d’entreprise soumis pour vérification.",
		"Perfil de empresa enviado para revisión.",
		"Profilo aziendale inviato per verifica."
	],
	[
		"Offer published.",
		"Angebot veröffentlicht.",
		"Offre publiée.",
		"Oferta publicada.",
		"Offerta pubblicata."
	],
	[
		"Offer closed.",
		"Angebot geschlossen.",
		"Offre close.",
		"Oferta cerrada.",
		"Offerta chiusa."
	],
	[
		"Offer saved as draft.",
		"Angebot als Entwurf gespeichert.",
		"Offre enregistrée en brouillon.",
		"Oferta guardada como borrador.",
		"Offerta salvata come bozza."
	],
	[
		"Offers refreshed.",
		"Angebote aktualisiert.",
		"Offres actualisées.",
		"Ofertas actualizadas.",
		"Offerte aggiornate."
	],
	[
		"More offers loaded.",
		"Weitere Angebote geladen.",
		"Offres supplémentaires chargées.",
		"Más ofertas cargadas.",
		"Altre offerte caricate."
	],
	[
		"Inquiry sent to the seller.",
		"Anfrage an den Verkäufer gesendet.",
		"Demande envoyée au vendeur.",
		"Consulta enviada al vendedor.",
		"Richiesta inviata al venditore."
	],
	[
		"Inquiries refreshed.",
		"Anfragen aktualisiert.",
		"Demandes actualisées.",
		"Consultas actualizadas.",
		"Richieste aggiornate."
	],
	[
		"Inquiry opened.",
		"Anfrage geöffnet.",
		"Demande ouverte.",
		"Consulta abierta.",
		"Richiesta aperta."
	],
	[
		"More inquiries loaded.",
		"Weitere Anfragen geladen.",
		"Demandes supplémentaires chargées.",
		"Más consultas cargadas.",
		"Altre richieste caricate."
	],
	[
		"Conversation refreshed.",
		"Unterhaltung aktualisiert.",
		"Conversation actualisée.",
		"Conversación actualizada.",
		"Conversazione aggiornata."
	],
	[
		"More messages loaded.",
		"Weitere Nachrichten geladen.",
		"Messages supplémentaires chargés.",
		"Más mensajes cargados.",
		"Altri messaggi caricati."
	],
	[
		"Reply saved.",
		"Antwort gespeichert.",
		"Réponse enregistrée.",
		"Respuesta guardada.",
		"Risposta salvata."
	],
	[
		"Inquiry closed.",
		"Anfrage geschlossen.",
		"Demande close.",
		"Consulta cerrada.",
		"Richiesta chiusa."
	],
	[
		"Company review saved.",
		"Unternehmensprüfung gespeichert.",
		"Vérification de l’entreprise enregistrée.",
		"Revisión de empresa guardada.",
		"Verifica aziendale salvata."
	],
	[
		"More reviews loaded.",
		"Weitere Prüfungen geladen.",
		"Vérifications supplémentaires chargées.",
		"Más revisiones cargadas.",
		"Altre verifiche caricate."
	],
	[
		"Please sign in again.",
		"Bitte melden Sie sich erneut an.",
		"Veuillez vous reconnecter.",
		"Vuelva a iniciar sesión.",
		"Accedi di nuovo."
	],
	[
		"Sign-in failed. Check your details and confirm your email first.",
		"Anmeldung fehlgeschlagen. Prüfen Sie Ihre Angaben und bestätigen Sie zuerst Ihre E-Mail.",
		"Échec de la connexion. Vérifiez vos informations et confirmez d’abord votre e-mail.",
		"Error de acceso. Compruebe sus datos y confirme primero su correo.",
		"Accesso non riuscito. Controlla i dati e conferma prima l’email."
	],
	[
		"Please check all required fields.",
		"Bitte prüfen Sie alle Pflichtfelder.",
		"Vérifiez tous les champs obligatoires.",
		"Compruebe todos los campos obligatorios.",
		"Controlla tutti i campi obbligatori."
	],
	[
		"This record changed. Refresh and try again.",
		"Dieser Datensatz wurde geändert. Aktualisieren Sie die Seite und versuchen Sie es erneut.",
		"Cet enregistrement a changé. Actualisez et réessayez.",
		"Este registro ha cambiado. Actualice e inténtelo de nuevo.",
		"Questo record è cambiato. Aggiorna e riprova."
	],
	[
		"Your company must be approved before trading.",
		"Ihr Unternehmen muss vor dem Handel freigegeben werden.",
		"Votre entreprise doit être approuvée avant de négocier.",
		"Su empresa debe estar aprobada antes de operar.",
		"La tua azienda deve essere approvata prima di operare."
	],
	[
		"Only your company administrator can make this change.",
		"Nur Ihr Unternehmensadministrator kann diese Änderung vornehmen.",
		"Seul l’administrateur de votre entreprise peut effectuer cette modification.",
		"Solo el administrador de su empresa puede realizar este cambio.",
		"Solo l’amministratore aziendale può apportare questa modifica."
	],
	[
		"This record already exists. Check your company details or existing inquiries.",
		"Dieser Datensatz existiert bereits. Prüfen Sie Ihre Unternehmensdaten oder vorhandenen Anfragen.",
		"Cet enregistrement existe déjà. Vérifiez les informations de l’entreprise ou les demandes existantes.",
		"Este registro ya existe. Compruebe los datos de su empresa o las consultas existentes.",
		"Questo record esiste già. Controlla i dati aziendali o le richieste esistenti."
	],
	[
		"Too many attempts. Please wait before trying again.",
		"Zu viele Versuche. Bitte warten Sie vor einem erneuten Versuch.",
		"Trop de tentatives. Patientez avant de réessayer.",
		"Demasiados intentos. Espere antes de reintentar.",
		"Troppi tentativi. Attendi prima di riprovare."
	],
	[
		"This record is unavailable.",
		"Dieser Datensatz ist nicht verfügbar.",
		"Cet enregistrement est indisponible.",
		"Este registro no está disponible.",
		"Questo record non è disponibile."
	],
	[
		"Only drafts can be edited. Create a new offer for different terms.",
		"Nur Entwürfe können bearbeitet werden. Erstellen Sie für andere Bedingungen ein neues Angebot.",
		"Seuls les brouillons sont modifiables. Créez une nouvelle offre pour d’autres conditions.",
		"Solo se pueden editar borradores. Cree una nueva oferta para condiciones diferentes.",
		"Solo le bozze possono essere modificate. Crea una nuova offerta per condizioni diverse."
	],
	[
		"Choose a current draft with a valid expiry date.",
		"Wählen Sie einen aktuellen Entwurf mit gültigem Ablaufdatum.",
		"Choisissez un brouillon actuel avec une date d’expiration valide.",
		"Elija un borrador actual con fecha de vencimiento válida.",
		"Scegli una bozza attuale con scadenza valida."
	],
	[
		"You cannot inquire about your own company offer.",
		"Sie können keine Anfrage zu Ihrem eigenen Unternehmensangebot senden.",
		"Vous ne pouvez pas demander des informations sur une offre de votre propre entreprise.",
		"No puede consultar una oferta de su propia empresa.",
		"Non puoi inviare una richiesta per un’offerta della tua azienda."
	],
	[
		"This inquiry is closed.",
		"Diese Anfrage ist geschlossen.",
		"Cette demande est close.",
		"Esta consulta está cerrada.",
		"Questa richiesta è chiusa."
	],
	[
		"Another reviewer must review your company.",
		"Ein anderer Prüfer muss Ihr Unternehmen prüfen.",
		"Un autre vérificateur doit examiner votre entreprise.",
		"Otro revisor debe revisar su empresa.",
		"Un altro revisore deve verificare la tua azienda."
	],
	[
		"The service is temporarily unavailable. Please refresh and try again.",
		"Der Dienst ist vorübergehend nicht verfügbar. Aktualisieren Sie die Seite und versuchen Sie es erneut.",
		"Le service est temporairement indisponible. Actualisez et réessayez.",
		"El servicio no está disponible temporalmente. Actualice e inténtelo de nuevo.",
		"Il servizio non è temporaneamente disponibile. Aggiorna e riprova."
	],
	[
		"SeedTrade — confirm your email address",
		"SeedTrade — E-Mail-Adresse bestätigen",
		"SeedTrade — confirmez votre adresse e-mail",
		"SeedTrade — confirme su correo electrónico",
		"SeedTrade — conferma il tuo indirizzo email"
	],
	[
		"Confirm your email address using this link (expires in 30 minutes):",
		"Bestätigen Sie Ihre E-Mail-Adresse über diesen Link (gültig für 30 Minuten):",
		"Confirmez votre adresse e-mail avec ce lien (expire dans 30 minutes) :",
		"Confirme su correo mediante este enlace (caduca en 30 minutos):",
		"Conferma l’indirizzo email con questo link (scade tra 30 minuti):"
	],
	[
		"If you did not request this, ignore this email.",
		"Wenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.",
		"Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.",
		"Si no lo ha solicitado, ignore este correo.",
		"Se non hai richiesto questa operazione, ignora questa email."
	]
];
//#endregion
//#region src/i18n/messages.js
var rows = [
	[
		"Personal data is processed only for stated platform purposes and subject to applicable data-protection rights. Non-essential analytics is disabled. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"Personenbezogene Daten werden nur für die angegebenen Plattformzwecke und unter Wahrung der geltenden Datenschutzrechte verarbeitet. Nicht erforderliche Analysen sind deaktiviert. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"Les données personnelles ne sont traitées qu’aux fins déclarées de la plateforme, dans le respect des droits applicables en matière de protection des données. L’analyse d’audience non essentielle est désactivée. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"Los datos personales solo se tratan para los fines declarados de la plataforma y conforme a los derechos de protección de datos aplicables. El análisis no esencial está desactivado. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"I dati personali sono trattati solo per le finalità dichiarate della piattaforma e nel rispetto dei diritti applicabili in materia di protezione dei dati. Le analisi non essenziali sono disattivate. REQUIRES_QUALIFIED_LEGAL_REVIEW."
	],
	[
		"Production evidence",
		"Produktionsnachweise",
		"Données de production",
		"Evidencia de producción",
		"Dati di produzione"
	],
	[
		"Production evidence — hybrid group, not an individual species",
		"Produktionsnachweise — Hybridgruppe, keine einzelne Art",
		"Données de production — groupe hybride, pas une espèce individuelle",
		"Evidencia de producción — grupo híbrido, no una especie individual",
		"Dati di produzione — gruppo ibrido, non una singola specie"
	],
	[
		"Only broader taxon evidence is available; not specific to this commercial form.",
		"Es liegen nur Daten zum übergeordneten Taxon vor; nicht spezifisch für diese Handelsform.",
		"Seules des données sur le taxon plus large sont disponibles ; elles ne sont pas propres à cette forme commerciale.",
		"Solo hay datos de un taxón más amplio; no son específicos de esta forma comercial.",
		"Sono disponibili solo dati sul taxon più ampio; non specifici per questa forma commerciale."
	],
	[
		"Share this evidence view",
		"Diese Evidenzansicht teilen",
		"Partager cette vue des données",
		"Compartir esta vista de evidencias",
		"Condividi questa vista delle evidenze"
	],
	[
		"Some shared filters were unavailable and were reset.",
		"Einige geteilte Filter waren nicht verfügbar und wurden zurückgesetzt.",
		"Certains filtres partagés étaient indisponibles et ont été réinitialisés.",
		"Algunos filtros compartidos no estaban disponibles y se han restablecido.",
		"Alcuni filtri condivisi non erano disponibili e sono stati reimpostati."
	],
	[
		"Search all seed types",
		"Alle Saatgutarten durchsuchen",
		"Rechercher parmi toutes les semences",
		"Buscar todos los tipos de semillas",
		"Cerca tutti i tipi di sementi"
	],
	[
		"Search results",
		"Suchergebnisse",
		"Résultats de recherche",
		"Resultados de búsqueda",
		"Risultati di ricerca"
	],
	[
		"Clear search",
		"Suche löschen",
		"Effacer la recherche",
		"Borrar búsqueda",
		"Cancella ricerca"
	],
	[
		"Original GATE AI illustration",
		"Originale GATE-KI-Illustration",
		"Illustration IA originale GATE",
		"Ilustración IA original de GATE",
		"Illustrazione IA originale GATE"
	],
	[
		"Category visual unavailable",
		"Kategorieabbildung nicht verfügbar",
		"Visuel de catégorie indisponible",
		"Imagen de categoría no disponible",
		"Immagine della categoria non disponibile"
	],
	[
		"Catalogue visual provenance",
		"Herkunft der Katalogabbildungen",
		"Provenance des visuels du catalogue",
		"Procedencia de las imágenes del catálogo",
		"Provenienza delle immagini del catalogo"
	],
	[
		"Original GATE-created AI illustrations; illustrative category visuals, not documentary evidence.",
		"Originale, von GATE erstellte KI-Illustrationen; illustrative Kategorieabbildungen, keine dokumentarischen Nachweise.",
		"Illustrations IA originales créées par GATE ; visuels illustratifs des catégories, pas des preuves documentaires.",
		"Ilustraciones IA originales creadas por GATE; imágenes ilustrativas de categorías, no pruebas documentales.",
		"Illustrazioni IA originali create da GATE; immagini illustrative delle categorie, non prove documentali."
	],
	[
		"Owner-approved restoration; resized and converted to WebP without cropping. No public reuse license is asserted.",
		"Vom Eigentümer genehmigte Wiederherstellung; ohne Beschnitt skaliert und in WebP konvertiert. Keine öffentliche Nachnutzungslizenz zugesichert.",
		"Restauration approuvée par le propriétaire ; redimensionnement et conversion WebP sans recadrage. Aucune licence publique de réutilisation déclarée.",
		"Restauración aprobada por el propietario; redimensionadas y convertidas a WebP sin recorte. No se declara una licencia pública de reutilización.",
		"Ripristino approvato dal proprietario; ridimensionamento e conversione WebP senza ritaglio. Nessuna licenza pubblica di riutilizzo dichiarata."
	],
	[
		"Seed offer",
		"Saatgutangebot",
		"Offre de semences",
		"Oferta de semillas",
		"Offerta di sementi"
	],
	[
		"Skip to main content",
		"Zum Hauptinhalt springen",
		"Aller au contenu principal",
		"Saltar al contenido principal",
		"Vai al contenuto principale"
	],
	[
		"Pause rotation",
		"Rotation pausieren",
		"Mettre la rotation en pause",
		"Pausar rotación",
		"Sospendi rotazione"
	],
	[
		"Resume rotation",
		"Rotation fortsetzen",
		"Reprendre la rotation",
		"Reanudar rotación",
		"Riprendi rotazione"
	],
	[
		"Catalogue photo credits",
		"Bildnachweise zum Katalog",
		"Crédits photographiques du catalogue",
		"Créditos fotográficos del catálogo",
		"Crediti fotografici del catalogo"
	],
	[
		"Illustrative crop photographs, not evidence of current conditions or every species in a category.",
		"Die Pflanzenfotos dienen der Illustration, nicht als Nachweis aktueller Bedingungen oder sämtlicher Arten einer Kategorie.",
		"Photographies de cultures à titre illustratif, sans représenter les conditions actuelles ni toutes les espèces d’une catégorie.",
		"Fotografías ilustrativas de cultivos; no documentan las condiciones actuales ni todas las especies de una categoría.",
		"Fotografie illustrative delle colture, non prove delle condizioni attuali o di tutte le specie di una categoria."
	],
	[
		"Cropped to 16:9, resized and converted to WebP.",
		"Auf 16:9 zugeschnitten, skaliert und in WebP konvertiert.",
		"Recadrée en 16:9, redimensionnée et convertie en WebP.",
		"Recortada a 16:9, redimensionada y convertida a WebP.",
		"Ritagliata in 16:9, ridimensionata e convertita in WebP."
	],
	[
		"Image derivatives retain the same license.",
		"Bildbearbeitungen behalten dieselbe Lizenz.",
		"Les images dérivées conservent la même licence.",
		"Las imágenes derivadas conservan la misma licencia.",
		"Le immagini derivate mantengono la stessa licenza."
	],
	[
		"Category photograph unavailable",
		"Kategoriefoto nicht verfügbar",
		"Photographie de catégorie indisponible",
		"Fotografía de categoría no disponible",
		"Fotografia della categoria non disponibile"
	],
	[
		"Wheat ears in a field; illustrative cereal photograph",
		"Weizenähren auf einem Feld; illustratives Getreidefoto",
		"Épis de blé dans un champ ; photographie illustrative de céréales",
		"Espigas de trigo en un campo; fotografía ilustrativa de cereales",
		"Spighe di grano in un campo; fotografia illustrativa di cereali"
	],
	[
		"Grassland near the Trubizh River; illustrative grass photograph",
		"Grünland am Fluss Trubisch; illustratives Grasfoto",
		"Prairie près de la rivière Troubij ; photographie illustrative de graminées",
		"Pradera junto al río Trubizh; fotografía ilustrativa de gramíneas",
		"Prato vicino al fiume Trubizh; fotografia illustrativa di graminacee"
	],
	[
		"Flowering phacelia field in Ehrenbach; illustrative cover crop photograph",
		"Blühendes Phaceliafeld in Ehrenbach; illustratives Zwischenfruchtfoto",
		"Champ de phacélie en fleurs à Ehrenbach ; photographie illustrative de culture intermédiaire",
		"Campo de facelia en flor en Ehrenbach; fotografía ilustrativa de cultivo de cobertura",
		"Campo di facelia in fiore a Ehrenbach; fotografia illustrativa di coltura di copertura"
	],
	[
		"Flowering rapeseed field in Ehrenbach; illustrative oilseed photograph",
		"Blühendes Rapsfeld in Ehrenbach; illustratives Ölsaatenfoto",
		"Champ de colza en fleurs à Ehrenbach ; photographie illustrative d’oléagineux",
		"Campo de colza en flor en Ehrenbach; fotografía ilustrativa de oleaginosas",
		"Campo di colza in fiore a Ehrenbach; fotografia illustrativa di oleaginose"
	],
	[
		"Rows of young maize at Simselwitz; illustrative maize photograph",
		"Junge Maisreihen in Simselwitz; illustratives Maisfoto",
		"Rangs de jeunes plants de maïs à Simselwitz ; photographie illustrative de maïs",
		"Hileras de maíz joven en Simselwitz; fotografía ilustrativa de maíz",
		"File di giovani piante di mais a Simselwitz; fotografia illustrativa di mais"
	],
	[
		"Rows of young white cabbage in Schülp; illustrative vegetable photograph",
		"Junge Weißkohlreihen in Schülp; illustratives Gemüsefoto",
		"Rangs de jeunes choux blancs à Schülp ; photographie illustrative de légumes",
		"Hileras de repollo blanco joven en Schülp; fotografía ilustrativa de hortalizas",
		"File di giovani cavoli cappucci bianchi a Schülp; fotografia illustrativa di ortaggi"
	],
	[
		"News archive",
		"Nachrichtenarchiv",
		"Archives des actualités",
		"Archivo de noticias",
		"Archivio notizie"
	],
	[
		"Sources & References",
		"Quellen & Referenzen",
		"Sources et références",
		"Fuentes y referencias",
		"Fonti e riferimenti"
	],
	[
		"Photo",
		"Foto",
		"Photo",
		"Foto",
		"Foto"
	],
	[
		"Photo credits",
		"Bildnachweise",
		"Crédits photo",
		"Créditos de la foto",
		"Crediti fotografici"
	],
	[
		"Image adapted for display.",
		"Bild für die Darstellung angepasst.",
		"Image adaptée à l’affichage.",
		"Imagen adaptada para su visualización.",
		"Immagine adattata per la visualizzazione."
	],
	[
		"Illustrative photograph; not evidence of the reported event.",
		"Symbolfoto; kein Nachweis des beschriebenen Ereignisses.",
		"Photographie illustrative ; elle ne documente pas l’événement rapporté.",
		"Fotografía ilustrativa; no documenta el acontecimiento descrito.",
		"Fotografia illustrativa; non documenta l’evento descritto."
	],
	[
		"Photograph unavailable",
		"Foto nicht verfügbar",
		"Photographie indisponible",
		"Fotografía no disponible",
		"Fotografia non disponibile"
	],
	[
		"Monthly trade volume",
		"Monatliches Handelsvolumen",
		"Volume mensuel des échanges",
		"Volumen comercial mensual",
		"Volume mensile degli scambi"
	],
	[
		"EU internal seed trade · {count} sowing CN codes · {period}",
		"EU-interner Saatguthandel · {count} Aussaat-KN-Codes · {period}",
		"Commerce intra-UE de semences · {count} codes NC pour semences · {period}",
		"Comercio interno de semillas de la UE · {count} códigos NC para siembra · {period}",
		"Commercio interno UE di sementi · {count} codici NC per la semina · {period}"
	],
	[
		"{value} tonnes",
		"{value} Tonnen",
		"{value} tonnes",
		"{value} toneladas",
		"{value} tonnellate"
	],
	[
		"EU-27 seed exports to EU and third-country destinations; representative customs-derived export unit value.",
		"Saatgutausfuhren der EU-27 in EU- und Drittländer; repräsentativer zollstatistischer Exportwert je kg.",
		"Exportations de semences de l’UE-27 vers l’UE et les pays tiers ; valeur unitaire représentative issue des statistiques douanières.",
		"Exportaciones de semillas de la UE-27 a la UE y terceros países; valor unitario representativo derivado de aduanas.",
		"Esportazioni di sementi UE-27 verso UE e paesi terzi; valore unitario rappresentativo derivato dalle dogane."
	],
	[
		"EU-27 seed exports to EU and third-country destinations; representative customs-derived export unit value. Lolium multiflorum includes Westerwolds; not a form-specific price.",
		"Saatgutausfuhren der EU-27 in EU- und Drittländer; repräsentativer zollstatistischer Exportwert je kg. Lolium multiflorum umfasst Westerwolds; kein formspezifischer Preis.",
		"Exportations de semences de l’UE-27 vers l’UE et les pays tiers ; valeur unitaire douanière représentative. Lolium multiflorum inclut les Westerwolds ; prix non spécifique à cette forme.",
		"Exportaciones de semillas de la UE-27 a la UE y terceros países; valor unitario aduanero representativo. Lolium multiflorum incluye Westerwolds; no es un precio específico de esa forma.",
		"Esportazioni di sementi UE-27 verso UE e paesi terzi; valore unitario doganale rappresentativo. Lolium multiflorum comprende Westerwolds; prezzo non specifico della forma."
	],
	[
		"EU internal trade volume — tonnes",
		"EU-internes Handelsvolumen — Tonnen",
		"Volume du commerce intra-UE — tonnes",
		"Volumen del comercio interno de la UE — toneladas",
		"Volume degli scambi interni UE — tonnellate"
	],
	[
		"Representative seed price history — €/kg",
		"Repräsentative Saatgutpreisentwicklung — €/kg",
		"Historique du prix représentatif des semences — €/kg",
		"Historial del precio representativo de semillas — €/kg",
		"Storico del prezzo rappresentativo delle sementi — €/kg"
	],
	[
		"Observed · {period}",
		"Beobachtet · {period}",
		"Observé · {period}",
		"Observado · {period}",
		"Osservato · {period}"
	],
	[
		"Completed · {period}",
		"Abgeschlossen · {period}",
		"Période complète · {period}",
		"Período completo · {period}",
		"Periodo completo · {period}"
	],
	[
		"Price observed {period}",
		"Preisbeobachtung {period}",
		"Prix observé {period}",
		"Precio observado {period}",
		"Prezzo osservato {period}"
	],
	[
		"Latest available: €{value}/kg · {period}",
		"Zuletzt verfügbar: €{value}/kg · {period}",
		"Dernière valeur disponible : €{value}/kg · {period}",
		"Último disponible: €{value}/kg · {period}",
		"Ultimo disponibile: €{value}/kg · {period}"
	],
	[
		"Representative price uses eligible evidence for this seed and its stated market scope; it is not an official EU average.",
		"Der repräsentative Preis nutzt geeignete Daten für dieses Saatgut und den angegebenen Marktumfang; er ist kein amtlicher EU-Durchschnitt.",
		"Le prix représentatif utilise des données admissibles pour cette semence et le périmètre indiqué ; ce n’est pas une moyenne officielle de l’UE.",
		"El precio representativo utiliza evidencia admisible para esta semilla y el ámbito indicado; no es una media oficial de la UE.",
		"Il prezzo rappresentativo usa dati ammissibili per questa semente e l’ambito indicato; non è una media ufficiale UE."
	],
	[
		"EU external trade",
		"EU-Außenhandel",
		"Commerce extérieur de l’UE",
		"Comercio exterior de la UE",
		"Commercio estero UE"
	],
	[
		"Exports outside EU",
		"Ausfuhren außerhalb der EU",
		"Exportations hors UE",
		"Exportaciones fuera de la UE",
		"Esportazioni fuori UE"
	],
	[
		"Imports from outside EU",
		"Einfuhren von außerhalb der EU",
		"Importations hors UE",
		"Importaciones desde fuera de la UE",
		"Importazioni da fuori UE"
	],
	[
		"Trade balance",
		"Handelsbilanz",
		"Balance commerciale",
		"Balanza comercial",
		"Bilancia commerciale"
	],
	[
		"EU-27 as a whole; reported third-country partners. Special territories excluded. Missing observations are not zero.",
		"EU-27 insgesamt; gemeldete Drittlandpartner. Sondergebiete ausgeschlossen. Fehlende Beobachtungen sind nicht null.",
		"Ensemble de l’UE-27 ; partenaires de pays tiers déclarés. Territoires spéciaux exclus. Les observations manquantes ne valent pas zéro.",
		"UE-27 en conjunto; socios de terceros países declarados. Territorios especiales excluidos. Las observaciones ausentes no equivalen a cero.",
		"UE-27 nel complesso; partner di paesi terzi dichiarati. Territori speciali esclusi. Le osservazioni mancanti non sono zero."
	],
	[
		"EU internal seed trade covered by {count} sowing CN codes · {period}",
		"EU-interner Saatguthandel über {count} Aussaat-CN-Codes · {period}",
		"Commerce intra-UE de semences couvert par {count} codes NC de semences à ensemencer · {period}",
		"Comercio interno de semillas de la UE cubierto por {count} códigos NC para siembra · {period}",
		"Commercio interno UE di sementi coperto da {count} codici NC per la semina · {period}"
	],
	[
		"Completed monthly trade volume history",
		"Historie des Handelsvolumens abgeschlossener Monate",
		"Historique des volumes commerciaux des mois complets",
		"Historial del volumen comercial de meses completos",
		"Storico dei volumi commerciali dei mesi completi"
	],
	[
		"Carrot",
		"Karotte",
		"Carotte",
		"Zanahoria",
		"Carota"
	],
	[
		"European Seed Market",
		"Europäischer Saatgutmarkt",
		"Marché européen des semences",
		"Mercado europeo de semillas",
		"Mercato europeo delle sementi"
	],
	[
		"EU market summary",
		"EU-Marktübersicht",
		"Résumé du marché de l’UE",
		"Resumen del mercado de la UE",
		"Riepilogo del mercato UE"
	],
	[
		"Seed species",
		"Saatgutarten",
		"Espèces semencières",
		"Especies de semillas",
		"Specie sementiere"
	],
	[
		"Commercial market entities",
		"Kommerzielle Markteinheiten",
		"Entités commerciales",
		"Entidades comerciales",
		"Entità commerciali"
	],
	[
		"Sowing CN codes",
		"KN-Codes für Saatgut",
		"Codes NC pour semences",
		"Códigos NC para siembra",
		"Codici NC per la semina"
	],
	[
		"Cereals & Pulses",
		"Getreide und Körnerleguminosen",
		"Céréales et légumineuses",
		"Cereales y leguminosas",
		"Cereali e leguminose"
	],
	[
		"Browse cereal, pseudocereal and grain legume seed markets.",
		"Entdecken Sie Saatgutmärkte für Getreide, Pseudogetreide und Körnerleguminosen.",
		"Explorez les marchés des semences de céréales, pseudo-céréales et légumineuses à grains.",
		"Explore semillas de cereales, pseudocereales y leguminosas de grano.",
		"Esplora sementi di cereali, pseudocereali e leguminose da granella."
	],
	[
		"Explore vegetable seeds, sugar beet seed and seed potatoes.",
		"Entdecken Sie Gemüsesaatgut, Zuckerrübensaatgut und Pflanzkartoffeln.",
		"Découvrez les semences potagères, de betterave sucrière et les plants de pommes de terre.",
		"Explore semillas hortícolas, de remolacha azucarera y patatas de siembra.",
		"Esplora sementi orticole, di barbabietola da zucchero e patate da seme."
	],
	[
		"Sugar beet",
		"Zuckerrübe",
		"Betterave sucrière",
		"Remolacha azucarera",
		"Barbabietola da zucchero"
	],
	[
		"Seed potatoes",
		"Pflanzkartoffeln",
		"Plants de pommes de terre",
		"Patatas de siembra",
		"Patate da seme"
	],
	[
		"Explore seed markets",
		"Saatgutmärkte entdecken",
		"Explorer les marchés des semences",
		"Explorar mercados de semillas",
		"Esplora i mercati delle sementi"
	],
	[
		"Choose a category to explore commercial seed types and market intelligence.",
		"Wählen Sie eine Kategorie für Saatgutarten und Marktinformationen.",
		"Choisissez une catégorie pour découvrir les semences et les informations de marché.",
		"Elija una categoría para explorar semillas e información de mercado.",
		"Scegli una categoria per esplorare sementi e informazioni di mercato."
	],
	[
		"Seed market categories",
		"Saatgutmarktkategorien",
		"Catégories du marché des semences",
		"Categorías del mercado de semillas",
		"Categorie del mercato delle sementi"
	],
	[
		"Pulses / Legumes",
		"Körnerleguminosen",
		"Protéagineux / Légumineuses",
		"Leguminosas",
		"Leguminose"
	],
	[
		"Oil & Fibre Seeds",
		"Öl- und Fasersaatgut",
		"Semences oléagineuses et à fibres",
		"Semillas oleaginosas y de fibra",
		"Sementi oleaginose e da fibra"
	],
	[
		"Maize & Sorghum",
		"Mais und Sorghum",
		"Maïs et sorgho",
		"Maíz y sorgo",
		"Mais e sorgo"
	],
	[
		"Fodder Plants & Amenity Grasses",
		"Futterpflanzen und Rasengräser",
		"Plantes fourragères et gazons",
		"Plantas forrajeras y céspedes",
		"Piante foraggere e tappeti erbosi"
	],
	[
		"Catch / Cover Crops",
		"Zwischenfrüchte / Begrünung",
		"Cultures dérobées / Couverts",
		"Cultivos intermedios / Cubiertas",
		"Colture intercalari / di copertura"
	],
	[
		"Browse cereal and pseudocereal seed markets.",
		"Saatgutmärkte für Getreide und Pseudogetreide entdecken.",
		"Explorez les semences de céréales et de pseudocéréales.",
		"Explore semillas de cereales y pseudocereales.",
		"Esplora sementi di cereali e pseudocereali."
	],
	[
		"Explore protein crops and grain legume seed markets.",
		"Saatgutmärkte für Eiweißpflanzen und Körnerleguminosen entdecken.",
		"Explorez les semences de protéagineux et de légumineuses à grains.",
		"Explore semillas de cultivos proteicos y leguminosas de grano.",
		"Esplora sementi di colture proteiche e leguminose da granella."
	],
	[
		"Discover vegetable and beet seed markets.",
		"Saatgutmärkte für Gemüse und Rüben entdecken.",
		"Découvrez les semences potagères et de betteraves.",
		"Descubra semillas de hortalizas y remolacha.",
		"Scopri sementi di ortaggi e barbabietole."
	],
	[
		"Explore oilseed, fibre and specialist seed markets.",
		"Saatgutmärkte für Öl-, Faser- und Spezialpflanzen entdecken.",
		"Explorez les semences oléagineuses, à fibres et spécialisées.",
		"Explore semillas oleaginosas, de fibra y especializadas.",
		"Esplora sementi oleaginose, da fibra e specializzate."
	],
	[
		"Browse maize and sorghum seed markets.",
		"Saatgutmärkte für Mais und Sorghum entdecken.",
		"Explorez les semences de maïs et de sorgho.",
		"Explore semillas de maíz y sorgo.",
		"Esplora sementi di mais e sorgo."
	],
	[
		"Find forage, pasture and grass seed markets.",
		"Saatgutmärkte für Futter, Weiden und Gräser finden.",
		"Découvrez les semences fourragères, de pâturage et de graminées.",
		"Descubra semillas de forraje, pastos y gramíneas.",
		"Scopri sementi foraggere, da pascolo e di graminacee."
	],
	[
		"Discover component seed types for cover and green manure crops.",
		"Saatgutkomponenten für Begrünung und Gründüngung entdecken.",
		"Découvrez les semences pour couverts et engrais verts.",
		"Descubra semillas para cubiertas y abonos verdes.",
		"Scopri sementi per coperture e sovesci."
	],
	[
		"{count} seed types",
		"{count} Saatgutarten",
		"{count} types de semences",
		"{count} tipos de semillas",
		"{count} tipi di sementi"
	],
	[
		"Seed types",
		"Saatgutarten",
		"Types de semences",
		"Tipos de semillas",
		"Tipi di sementi"
	],
	[
		"Browse seed types →",
		"Saatgutarten entdecken →",
		"Explorer les semences →",
		"Explorar semillas →",
		"Esplora sementi →"
	],
	[
		"Explore EU Seed Trade Pulse →",
		"EU Seed Trade Pulse entdecken →",
		"Explorer EU Seed Trade Pulse →",
		"Explorar EU Seed Trade Pulse →",
		"Esplora EU Seed Trade Pulse →"
	],
	[
		"← All categories",
		"← Alle Kategorien",
		"← Toutes les catégories",
		"← Todas las categorías",
		"← Tutte le categorie"
	],
	[
		"EU trade aggregate developing",
		"EU-Handelsgesamtwert in Entwicklung",
		"Agrégat commercial UE en préparation",
		"Agregado comercial de la UE en desarrollo",
		"Aggregato commerciale UE in sviluppo"
	],
	[
		"Find a seed type",
		"Saatgutart finden",
		"Rechercher une semence",
		"Buscar una semilla",
		"Trova una semente"
	],
	[
		"Common or botanical name",
		"Üblicher oder botanischer Name",
		"Nom courant ou botanique",
		"Nombre común o botánico",
		"Nome comune o botanico"
	],
	[
		"Seed market cards",
		"Saatgutmarktkarten",
		"Fiches de marché des semences",
		"Fichas del mercado de semillas",
		"Schede del mercato delle sementi"
	],
	[
		"No seed types match your search.",
		"Keine Saatgutart entspricht Ihrer Suche.",
		"Aucune semence ne correspond à votre recherche.",
		"Ninguna semilla coincide con su búsqueda.",
		"Nessuna semente corrisponde alla ricerca."
	],
	[
		"Market data developing",
		"Marktdaten in Entwicklung",
		"Données de marché en préparation",
		"Datos de mercado en desarrollo",
		"Dati di mercato in sviluppo"
	],
	[
		"Production data available",
		"Produktionsdaten verfügbar",
		"Données de production disponibles",
		"Datos de producción disponibles",
		"Dati di produzione disponibili"
	],
	[
		"Trade data available",
		"Handelsdaten verfügbar",
		"Données commerciales disponibles",
		"Datos comerciales disponibles",
		"Dati commerciali disponibili"
	],
	[
		"Group-level customs scope",
		"Zollumfang auf Gruppenebene",
		"Portée douanière au niveau du groupe",
		"Alcance aduanero a nivel de grupo",
		"Ambito doganale a livello di gruppo"
	],
	[
		"Volume YoY",
		"Menge im Jahresvergleich",
		"Volume sur un an",
		"Volumen interanual",
		"Volume su base annua"
	],
	[
		"Price YoY",
		"Preis im Jahresvergleich",
		"Prix sur un an",
		"Precio interanual",
		"Prezzo su base annua"
	],
	[
		"Seed market",
		"Saatgutmarkt",
		"Marché des semences",
		"Mercado de semillas",
		"Mercato delle sementi"
	],
	[
		"Observed intra-EU dispatches. YoY compares the same completed month one year earlier.",
		"Beobachtete Versendungen innerhalb der EU. Jahresvergleich mit demselben abgeschlossenen Monat des Vorjahres.",
		"Expéditions intra-UE observées. Comparaison avec le même mois complet un an auparavant.",
		"Envíos intra-UE observados. Comparación con el mismo mes completo del año anterior.",
		"Spedizioni intra-UE osservate. Confronto con lo stesso mese completo dell’anno precedente."
	],
	[
		"This customs scope covers only part of the seed market.",
		"Dieser Zollumfang erfasst nur einen Teil des Saatgutmarktes.",
		"Cette portée douanière ne couvre qu’une partie du marché des semences.",
		"Este alcance aduanero cubre solo parte del mercado de semillas.",
		"Questo ambito doganale copre solo parte del mercato delle sementi."
	],
	[
		"Comparable price evidence is developing.",
		"Vergleichbare Preisnachweise in Entwicklung.",
		"Données de prix comparables en préparation.",
		"Evidencia de precios comparables en desarrollo.",
		"Evidenze di prezzo comparabili in sviluppo."
	],
	[
		"Trade data not yet species-specific",
		"Handelsdaten noch nicht artspezifisch",
		"Données commerciales pas encore spécifiques à l’espèce",
		"Datos comerciales aún no específicos de la especie",
		"Dati commerciali non ancora specifici per specie"
	],
	[
		"Seed production evidence",
		"Nachweise zur Saatgutproduktion",
		"Données de production de semences",
		"Evidencia de producción de semillas",
		"Evidenze di produzione delle sementi"
	],
	[
		"Official seed-production evidence available.",
		"Amtliche Nachweise zur Saatgutproduktion verfügbar.",
		"Données officielles de production de semences disponibles.",
		"Evidencia oficial de producción de semillas disponible.",
		"Evidenze ufficiali di produzione delle sementi disponibili."
	],
	[
		"Years covered",
		"Erfasste Jahre",
		"Années couvertes",
		"Años cubiertos",
		"Anni coperti"
	],
	[
		"Reported metrics",
		"Gemeldete Kennzahlen",
		"Indicateurs déclarés",
		"Indicadores declarados",
		"Indicatori dichiarati"
	],
	[
		"Official seed evidence",
		"Amtliche Saatgutnachweise",
		"Données officielles sur les semences",
		"Evidencia oficial de semillas",
		"Evidenze ufficiali sulle sementi"
	],
	[
		"National definitions remain separate; no combined EU production total is inferred.",
		"Nationale Definitionen bleiben getrennt; kein EU-Produktionsgesamtwert wird abgeleitet.",
		"Les définitions nationales restent distinctes ; aucun total UE n’est déduit.",
		"Las definiciones nacionales permanecen separadas; no se infiere un total de producción de la UE.",
		"Le definizioni nazionali restano separate; non viene dedotto un totale di produzione UE."
	],
	[
		"Explore production evidence →",
		"Produktionsnachweise entdecken →",
		"Explorer les données de production →",
		"Explorar evidencia de producción →",
		"Esplora le evidenze di produzione →"
	],
	[
		"Production evidence for this commercial seed type is developing.",
		"Produktionsnachweise für diese Saatgutform in Entwicklung.",
		"Données de production pour ce type de semences en préparation.",
		"Evidencia de producción de este tipo de semilla en desarrollo.",
		"Evidenze di produzione per questo tipo di semente in sviluppo."
	],
	[
		"Customs scope, coverage & sources",
		"Zollumfang, Abdeckung und Quellen",
		"Portée douanière, couverture et sources",
		"Alcance aduanero, cobertura y fuentes",
		"Ambito doganale, copertura e fonti"
	],
	[
		"CN / TARIC customs scope",
		"CN-/TARIC-Zollumfang",
		"Portée douanière NC / TARIC",
		"Alcance aduanero NC / TARIC",
		"Ambito doganale NC / TARIC"
	],
	[
		"Customs precision varies by commercial seed type.",
		"Zollgenauigkeit variiert je Saatgutform.",
		"La précision douanière varie selon le type de semences.",
		"La precisión aduanera varía según el tipo de semilla.",
		"La precisione doganale varia per tipo di semente."
	],
	[
		"Customs-group and parent-taxon quantities are not assigned to individual commercial forms.",
		"Mengen von Zollgruppen und übergeordneten Taxa werden nicht einzelnen Handelsformen zugeteilt.",
		"Les quantités des groupes douaniers et taxons parents ne sont pas attribuées aux formes commerciales individuelles.",
		"Las cantidades de grupos aduaneros y taxones parentales no se asignan a formas comerciales individuales.",
		"Le quantità dei gruppi doganali e dei taxa parentali non sono attribuite alle singole forme commerciali."
	],
	[
		"Customs attribution remains under review; no trade amount is shown.",
		"Zollzuordnung bleibt in Prüfung; keine Handelsmenge wird angezeigt.",
		"Attribution douanière en cours de vérification ; aucun montant commercial affiché.",
		"La atribución aduanera sigue en revisión; no se muestra ningún importe comercial.",
		"Attribuzione doganale in revisione; nessun importo commerciale mostrato."
	],
	[
		"Sources / provenance",
		"Quellen / Herkunft",
		"Sources / provenance",
		"Fuentes / procedencia",
		"Fonti / provenienza"
	],
	[
		"Additional source coverage is developing.",
		"Weitere Quellenabdeckung in Entwicklung.",
		"Couverture complémentaire des sources en préparation.",
		"Cobertura adicional de fuentes en desarrollo.",
		"Copertura aggiuntiva delle fonti in sviluppo."
	],
	[
		"Missing evidence is not zero. No interpolation or customs-group allocation.",
		"Fehlende Nachweise sind keine Nullwerte. Keine Interpolation oder Zollgruppenverteilung.",
		"L’absence de données n’est pas un zéro. Aucune interpolation ni répartition des groupes douaniers.",
		"La ausencia de evidencia no es cero. Sin interpolación ni asignación de grupos aduaneros.",
		"L’assenza di evidenze non è zero. Nessuna interpolazione o ripartizione dei gruppi doganali."
	],
	[
		"internal seed trade",
		"interner Saatguthandel",
		"commerce interne de semences",
		"comercio interno de semillas",
		"commercio interno di sementi"
	],
	[
		"Official seed-for-sowing trade across 40 CN codes.",
		"Amtlicher Handel mit Saatgut zur Aussaat über 40 CN-Codes.",
		"Commerce officiel de semences destinées à l’ensemencement : 40 codes NC.",
		"Comercio oficial de semillas para siembra: 40 códigos NC.",
		"Commercio ufficiale di sementi da semina: 40 codici NC."
	],
	[
		"Monthly seed-for-sowing trade",
		"Monatlicher Handel mit Saatgut zur Aussaat",
		"Commerce mensuel de semences à ensemencer",
		"Comercio mensual de semillas para siembra",
		"Commercio mensile di sementi da semina"
	],
	[
		"40 CN codes",
		"40 CN-Codes",
		"40 codes NC",
		"40 códigos NC",
		"40 codici NC"
	],
	[
		"Direct species scope",
		"Direkter Artenumfang",
		"Portée directe par espèce",
		"Alcance directo por especie",
		"Ambito diretto per specie"
	],
	[
		"Partial species scope",
		"Teilweiser Artenumfang",
		"Portée partielle par espèce",
		"Alcance parcial por especie",
		"Ambito parziale per specie"
	],
	[
		"Group-level evidence",
		"Nachweise auf Gruppenebene",
		"Données au niveau du groupe",
		"Evidencia a nivel de grupo",
		"Evidenza a livello di gruppo"
	],
	[
		"Contributing CN codes",
		"Beitragende CN-Codes",
		"Codes NC contributeurs",
		"Códigos NC contribuyentes",
		"Codici NC contributori"
	],
	[
		"Unallocated customs scope",
		"Nicht zugeordneter Zollumfang",
		"Portée douanière non attribuée",
		"Alcance aduanero no asignado",
		"Ambito doganale non attribuito"
	],
	[
		"Included in the headline, not assigned to one commercial category.",
		"Im Gesamtwert enthalten, keiner einzelnen Handelskategorie zugeordnet.",
		"Inclus dans le total, sans attribution à une seule catégorie commerciale.",
		"Incluido en el total, sin asignación a una sola categoría comercial.",
		"Incluso nel totale, non attribuito a una sola categoria commerciale."
	],
	[
		"Monthly category totals use compatible CN scopes only. Cross-category groups and beet crop types remain unallocated.",
		"Monatliche Kategoriewerte verwenden nur kompatible CN-Umfänge. Kategorienübergreifende Gruppen und Rübennutzungen bleiben unzugeordnet.",
		"Les totaux mensuels utilisent seulement des portées NC compatibles. Les groupes transversaux et types de betteraves restent non attribués.",
		"Los totales mensuales usan solo alcances NC compatibles. Los grupos entre categorías y tipos de remolacha quedan sin asignar.",
		"I totali mensili usano solo ambiti NC compatibili. Gruppi trasversali e tipi di barbabietola restano non attribuiti."
	],
	[
		"40 seed-for-sowing CN codes. Monthly gross intra-EU dispatches; customs precision varies. Group evidence is not allocated to species. Missing evidence is not zero; no interpolation.",
		"40 CN-Codes für Saatgut zur Aussaat. Monatliche Brutto-Versendungen innerhalb der EU; unterschiedlicher Zollumfang. Gruppendaten werden nicht auf Arten verteilt. Fehlende Nachweise sind keine Nullwerte; keine Interpolation.",
		"40 codes NC de semences à ensemencer. Expéditions brutes mensuelles intra-UE ; précision douanière variable. Pas de répartition des groupes entre espèces. Données absentes ne valent pas zéro ; aucune interpolation.",
		"40 códigos NC de semillas para siembra. Envíos brutos mensuales intra-UE; precisión aduanera variable. Sin asignación de grupos a especies. La ausencia no es cero; sin interpolación.",
		"40 codici NC di sementi da semina. Spedizioni lorde mensili intra-UE; precisione doganale variabile. Nessuna ripartizione dei gruppi tra specie. Dati assenti non equivalgono a zero; nessuna interpolazione."
	],
	[
		"40 verified sowing CN8 codes. Unique reporter-partner-flow-month grain. No species allocation. Comparable 2024–2026 definitions confirmed by official yearly nomenclature evidence.",
		"40 verifizierte CN8-Codes für Saatgut. Eindeutige Meldeland-Partner-Handelsstrom-Monatsdaten ohne Artenzuordnung. Vergleichbare Definitionen für 2024–2026 durch amtliche Jahresnomenklaturen bestätigt.",
		"40 codes CN8 vérifiés pour les semences. Observations uniques déclarant-partenaire-flux-mois sans répartition par espèce. Définitions 2024–2026 confirmées par les nomenclatures officielles.",
		"40 códigos CN8 verificados para siembra. Observaciones únicas declarante-socio-flujo-mes sin asignación por especie. Definiciones 2024–2026 confirmadas por nomenclaturas oficiales.",
		"40 codici CN8 verificati per la semina. Osservazioni uniche dichiarante-partner-flusso-mese senza ripartizione tra specie. Definizioni 2024–2026 confermate da nomenclature ufficiali."
	],
	[
		"Category-level aggregate for the same completed month; at least 100 tonnes and 2 verified observations with positive net weight and trade value. Review-only, ambiguous and partial-period rows are excluded. Species-specific customs scope only; broad groups excluded. Expanded codes withheld pending established representative-price engine validation.",
		"Statistischer Wert je Gewicht desselben abgeschlossenen Monats: mindestens 100 Tonnen, zwei verifizierte Beobachtungen und positive Werte. Prüffälle, mehrdeutige und Teilperioden ausgeschlossen. Nur artspezifischer Zollumfang; breite Gruppen ausgeschlossen. Neue repräsentative Preise bleiben bis zur bestehenden Preisvalidierung zurückgehalten.",
		"Valeur statistique par poids du même mois complet : au moins 100 tonnes, deux observations vérifiées et valeurs positives. Cas à revoir, ambigus et périodes partielles exclus. Portée douanière spécifique seulement ; groupes larges exclus. Nouveaux prix représentatifs retenus jusqu’à validation.",
		"Valor estadístico por peso del mismo mes completo: al menos 100 toneladas, dos observaciones verificadas y valores positivos. Se excluyen casos en revisión, ambiguos y períodos parciales. Solo alcance aduanero específico; grupos amplios excluidos. Nuevos precios representativos pendientes de validación.",
		"Valore statistico per peso dello stesso mese completo: almeno 100 tonnellate, due osservazioni verificate e valori positivi. Casi da rivedere, ambigui e periodi parziali esclusi. Solo ambito doganale specifico; gruppi ampi esclusi. Nuovi prezzi rappresentativi in attesa di validazione."
	],
	[
		"Top verified customs trade entities",
		"Führende verifizierte Zoll-Handelsobjekte",
		"Principales entités douanières vérifiées",
		"Principales entidades aduaneras verificadas",
		"Principali entità doganali verificate"
	],
	[
		"Trade-value YoY uses declared official values. Customs-group volume is not allocated to individual species.",
		"Der jährliche Handelswertvergleich verwendet amtliche Werte. Zollgruppenmengen werden nicht auf einzelne Arten verteilt.",
		"La comparaison annuelle utilise les valeurs officielles déclarées. Les volumes des groupes douaniers ne sont pas répartis entre espèces.",
		"La comparación anual usa valores oficiales declarados. El volumen de los grupos aduaneros no se reparte entre especies.",
		"Il confronto annuale usa valori ufficiali dichiarati. Il volume dei gruppi doganali non viene ripartito tra specie."
	],
	[
		"Market entities",
		"Marktobjekte",
		"Entités de marché",
		"Entidades de mercado",
		"Entità di mercato"
	],
	[
		"Reporting country",
		"Meldeland",
		"Pays déclarant",
		"País declarante",
		"Paese dichiarante"
	],
	[
		"European Union",
		"Europäische Union",
		"Union européenne",
		"Unión Europea",
		"Unione europea"
	],
	[
		"Trade flow",
		"Handelsstrom",
		"Flux commercial",
		"Flujo comercial",
		"Flusso commerciale"
	],
	[
		"Official country-partner observations are deduplicated. Missing records are absent, not zero.",
		"Offizielle Länder-Partner-Daten werden dedupliziert. Fehlende Einträge sind keine Nullwerte.",
		"Les observations officielles pays-partenaire sont dédupliquées. Les données absentes ne sont pas des zéros.",
		"Las observaciones oficiales país-socio se deduplican. Los datos ausentes no son ceros.",
		"Le osservazioni ufficiali paese-partner sono deduplicate. I dati assenti non sono zeri."
	],
	[
		"EU internal trade counts dispatches once. Extra-EU imports and exports remain separate. Special territories are excluded.",
		"EU-Binnenhandel zählt Versendungen einmal. Extra-EU-Importe und -Exporte bleiben getrennt. Sondergebiete sind ausgeschlossen.",
		"Le commerce intra-UE compte les expéditions une fois. Importations et exportations extra-UE restent distinctes. Territoires spéciaux exclus.",
		"El comercio intra-UE cuenta los envíos una vez. Importaciones y exportaciones extra-UE permanecen separadas. Territorios especiales excluidos.",
		"Il commercio intra-UE conta le spedizioni una volta. Importazioni ed esportazioni extra-UE restano separate. Territori speciali esclusi."
	],
	[
		"European seed market",
		"Europäischer Saatgutmarkt",
		"Marché européen des semences",
		"Mercado europeo de semillas",
		"Mercato europeo delle sementi"
	],
	[
		"10 seed categories",
		"10 Saatgutkategorien",
		"10 catégories de semences",
		"10 categorías de semillas",
		"10 categorie di sementi"
	],
	[
		"Choose a seed category. Use tags are secondary filters; customs groups are never allocated to individual species.",
		"Wählen Sie eine Saatgutkategorie. Nutzungen sind Zusatzfilter; Zollgruppen werden nie einzelnen Arten zugeteilt.",
		"Choisissez une catégorie. Les usages sont des filtres secondaires ; les groupes douaniers ne sont jamais répartis entre espèces.",
		"Seleccione una categoría. Los usos son filtros secundarios; los grupos aduaneros nunca se reparten entre especies.",
		"Scegli una categoria. Gli usi sono filtri secondari; i gruppi doganali non vengono mai ripartiti tra specie."
	],
	[
		"Trade Market Entities",
		"Zollmarktgruppen",
		"Entités de marché douanières",
		"Entidades comerciales aduaneras",
		"Entità di mercato doganali"
	],
	[
		"Use tag",
		"Nutzungsmerkmal",
		"Usage",
		"Uso",
		"Uso"
	],
	[
		"All uses",
		"Alle Nutzungen",
		"Tous les usages",
		"Todos los usos",
		"Tutti gli usi"
	],
	[
		"GROUP-LEVEL TRADE DATA — INCLUDES MULTIPLE SPECIES",
		"HANDELSDATEN AUF GRUPPENEBENE — MEHRERE ARTEN",
		"DONNÉES COMMERCIALES DE GROUPE — PLUSIEURS ESPÈCES",
		"DATOS COMERCIALES DE GRUPO — VARIAS ESPECIES",
		"DATI COMMERCIALI DI GRUPPO — PIÙ SPECIE"
	],
	[
		"Trade evidence gap",
		"Handelsdatenlücke",
		"Lacune de données commerciales",
		"Falta de evidencia comercial",
		"Lacuna di dati commerciali"
	],
	[
		"Category links indicate customs scope, not a measured contribution. Category trade totals are withheld where groups span categories.",
		"Kategorien verweisen auf den Zollumfang, nicht auf gemessene Anteile. Kategorienübergreifende Gruppen werden nicht aufgeteilt.",
		"Les liens indiquent le périmètre douanier, pas une contribution mesurée. Aucun total par catégorie pour les groupes transversaux.",
		"Los enlaces indican el ámbito aduanero, no una contribución medida. Se retienen los totales por categoría de grupos compartidos.",
		"I collegamenti indicano l’ambito doganale, non quote misurate. Nessun totale per categoria per gruppi condivisi."
	],
	[
		"No true-seed species in this selection. Vegetative propagation remains separate.",
		"Keine echten Saatgutarten in dieser Auswahl. Vegetative Vermehrung bleibt getrennt.",
		"Aucune espèce de semence dans cette sélection. La multiplication végétative reste distincte.",
		"No hay especies de semilla en esta selección. La propagación vegetativa permanece separada.",
		"Nessuna specie da seme in questa selezione. La propagazione vegetativa resta separata."
	],
	[
		"Grain legumes and protein crops",
		"Körnerleguminosen und Eiweißpflanzen",
		"Légumineuses à graines et cultures protéagineuses",
		"Leguminosas de grano y cultivos proteicos",
		"Leguminose da granella e colture proteiche"
	],
	[
		"Oilseed and fibre crops",
		"Öl- und Faserpflanzen",
		"Oléagineux et cultures à fibres",
		"Oleaginosas y cultivos de fibra",
		"Colture oleaginose e da fibra"
	],
	[
		"Mustard and radish seeds",
		"Senf- und Rettichsaatgut",
		"Semences de moutarde et de radis",
		"Semillas de mostaza y rábano",
		"Sementi di senape e ravanello"
	],
	[
		"Herbs and specialty flowering crops",
		"Kräuter und spezielle Blühpflanzen",
		"Herbes et cultures florales spécialisées",
		"Hierbas y cultivos florales especializados",
		"Erbe e colture floricole specializzate"
	],
	[
		"Seed potatoes",
		"Pflanzkartoffeln",
		"Plants de pommes de terre",
		"Patatas de siembra",
		"Patate da seme"
	],
	[
		"Other propagation material",
		"Sonstiges Vermehrungsmaterial",
		"Autres matériels de multiplication",
		"Otros materiales de propagación",
		"Altro materiale di propagazione"
	],
	[
		"CATCH_CROP",
		"Zwischenfrucht",
		"Culture dérobée",
		"Cultivo intermedio",
		"Coltura intercalare"
	],
	[
		"COVER_CROP",
		"Bodenbedeckung",
		"Couvert végétal",
		"Cultivo de cobertura",
		"Coltura di copertura"
	],
	[
		"FORAGE",
		"Futter",
		"Fourrage",
		"Forraje",
		"Foraggio"
	],
	[
		"GREEN_MANURE",
		"Gründüngung",
		"Engrais vert",
		"Abono verde",
		"Sovescio"
	],
	[
		"POLLINATOR",
		"Bestäuber",
		"Pollinisateurs",
		"Polinizadores",
		"Impollinatori"
	],
	[
		"Seed category",
		"Saatgutkategorie",
		"Catégorie de semences",
		"Categoría de semillas",
		"Categoria di sementi"
	],
	[
		"All seed categories",
		"Alle Saatgutkategorien",
		"Toutes les catégories de semences",
		"Todas las categorías de semillas",
		"Tutte le categorie di sementi"
	],
	[
		"Forage legumes",
		"Futterleguminosen",
		"Légumineuses fourragères",
		"Leguminosas forrajeras",
		"Leguminose foraggere"
	],
	[
		"Grass seeds",
		"Grassaatgut",
		"Semences de graminées",
		"Semillas de gramíneas",
		"Sementi di graminacee"
	],
	[
		"Grain legumes",
		"Körnerleguminosen",
		"Légumineuses à graines",
		"Leguminosas de grano",
		"Leguminose da granella"
	],
	[
		"Oilseeds and fibre crops",
		"Öl- und Faserpflanzen",
		"Oléagineux et plantes à fibres",
		"Oleaginosas y cultivos de fibra",
		"Oleaginose e colture da fibra"
	],
	[
		"Cereals and pseudocereals",
		"Getreide und Pseudogetreide",
		"Céréales et pseudocéréales",
		"Cereales y pseudocereales",
		"Cereali e pseudocereali"
	],
	[
		"Brassica seeds",
		"Kreuzblütlersaatgut",
		"Semences de brassicacées",
		"Semillas de brasicáceas",
		"Sementi di brassicacee"
	],
	[
		"Herbs and specialty seeds",
		"Kräuter und Spezialsaatgut",
		"Semences d’herbes et espèces spécialisées",
		"Semillas de hierbas y especies especiales",
		"Sementi di erbe e specie speciali"
	],
	[
		"Existing entities open their original validated market pages. New observations cover targeted corridors only.",
		"Bestehende Einheiten öffnen ihre ursprünglichen validierten Marktseiten. Neue Beobachtungen betreffen nur ausgewählte Korridore.",
		"Les entités existantes ouvrent leurs pages de marché validées. Les nouvelles observations couvrent uniquement les corridors ciblés.",
		"Las entidades existentes abren sus páginas de mercado validadas. Las nuevas observaciones cubren solo corredores seleccionados.",
		"Le entità esistenti aprono le pagine di mercato validate. Le nuove osservazioni coprono solo i corridoi selezionati."
	],
	[
		"Verified customs trade coverage",
		"Verifizierte Zollhandelsdaten",
		"Couverture douanière vérifiée",
		"Cobertura aduanera verificada",
		"Copertura doganale verificata"
	],
	[
		"Species and trade groups",
		"Arten und Handelsgruppen",
		"Espèces et groupes commerciaux",
		"Especies y grupos comerciales",
		"Specie e gruppi commerciali"
	],
	[
		"A customs group includes multiple species. Its trade is never allocated to individual species.",
		"Eine Zollgruppe umfasst mehrere Arten. Ihr Handel wird niemals einzelnen Arten zugeteilt.",
		"Un groupe douanier comprend plusieurs espèces. Son commerce n’est jamais réparti entre espèces.",
		"Un grupo aduanero incluye varias especies. Su comercio nunca se reparte entre especies.",
		"Un gruppo doganale comprende più specie. Il commercio non viene ripartito tra le specie."
	],
	[
		"Evidence type",
		"Nachweistyp",
		"Type de preuve",
		"Tipo de evidencia",
		"Tipo di evidenza"
	],
	[
		"All trade entities",
		"Alle Handelseinheiten",
		"Toutes les entités commerciales",
		"Todas las entidades comerciales",
		"Tutte le entità commerciali"
	],
	[
		"Species or partial species scope",
		"Art oder begrenzter Artenumfang",
		"Espèce ou périmètre partiel",
		"Especie o alcance parcial",
		"Specie o ambito parziale"
	],
	[
		"Trade groups",
		"Handelsgruppen",
		"Groupes commerciaux",
		"Grupos comerciales",
		"Gruppi commerciali"
	],
	[
		"Trade Market Entity",
		"Zoll-Handelseinheit",
		"Entité douanière commerciale",
		"Entidad comercial aduanera",
		"Entità commerciale doganale"
	],
	[
		"Origin country",
		"Ursprungsland",
		"Pays d’origine",
		"País de origen",
		"Paese di origine"
	],
	[
		"Destination country",
		"Zielland",
		"Pays de destination",
		"País de destino",
		"Paese di destinazione"
	],
	[
		"Trade group",
		"Handelsgruppe",
		"Groupe commercial",
		"Grupo comercial",
		"Gruppo commerciale"
	],
	[
		"Trade group · includes multiple species",
		"Handelsgruppe · umfasst mehrere Arten",
		"Groupe commercial · comprend plusieurs espèces",
		"Grupo comercial · incluye varias especies",
		"Gruppo commerciale · comprende più specie"
	],
	[
		"Targeted bilateral dispatches only: DE→PL, FR→PL, NL→PL, PL→DE. Not country totals or an EU total.",
		"Nur ausgewählte bilaterale Versendungen: DE→PL, FR→PL, NL→PL, PL→DE. Keine Landes- oder EU-Gesamtsummen.",
		"Expéditions bilatérales ciblées uniquement : DE→PL, FR→PL, NL→PL, PL→DE. Pas de totaux nationaux ou européens.",
		"Solo expediciones bilaterales seleccionadas: DE→PL, FR→PL, NL→PL, PL→DE. No son totales nacionales ni de la UE.",
		"Solo spedizioni bilaterali selezionate: DE→PL, FR→PL, NL→PL, PL→DE. Non sono totali nazionali o UE."
	],
	[
		"No compatible observation for these filters. Missing data is not zero.",
		"Keine passende Beobachtung für diese Filter. Fehlende Daten sind nicht null.",
		"Aucune observation compatible avec ces filtres. Une donnée manquante n’est pas zéro.",
		"No hay observación compatible con estos filtros. Los datos ausentes no son cero.",
		"Nessuna osservazione compatibile con questi filtri. I dati mancanti non sono zero."
	],
	[
		"Representative prices for new observations are withheld pending the established price validation.",
		"Repräsentative Preise für neue Beobachtungen bleiben bis zur etablierten Preisprüfung zurückgehalten.",
		"Les prix représentatifs des nouvelles observations restent non publiés en attendant la validation établie.",
		"Los precios representativos de las nuevas observaciones se retienen hasta completar la validación establecida.",
		"I prezzi rappresentativi delle nuove osservazioni restano sospesi fino alla validazione prevista."
	],
	[
		"Linked species are scope candidates, not measured contributors to a customs group.",
		"Verknüpfte Arten gehören zum möglichen Umfang, ihr Anteil an der Zollgruppe ist nicht gemessen.",
		"Les espèces liées relèvent du périmètre possible ; leur contribution au groupe douanier n’est pas mesurée.",
		"Las especies vinculadas indican el alcance posible; su contribución al grupo aduanero no está medida.",
		"Le specie collegate indicano l’ambito possibile, non un contributo misurato al gruppo doganale."
	],
	[
		"Download Trade/CN audit",
		"Handels-/KN-Prüfung herunterladen",
		"Télécharger l’audit Commerce/NC",
		"Descargar auditoría Comercio/NC",
		"Scarica verifica Commercio/NC"
	],
	[
		"Download species data coverage audit",
		"Audit zur Arten-Datenabdeckung herunterladen",
		"Télécharger l’audit de couverture des espèces",
		"Descargar la auditoría de cobertura de especies",
		"Scarica la verifica della copertura delle specie"
	],
	[
		"seed species",
		"Saatgutarten",
		"espèces de semences",
		"especies de semillas",
		"specie da seme"
	],
	[
		"Identified seed species; analytical coverage varies by species.",
		"Identifizierte Saatgutarten; die analytische Abdeckung variiert je nach Art.",
		"Espèces identifiées ; la couverture analytique varie selon l’espèce.",
		"Especies identificadas; la cobertura analítica varía según la especie.",
		"Specie identificate; la copertura analitica varia per specie."
	],
	[
		"Crop Master and coverage",
		"Artenverzeichnis und Abdeckung",
		"Référentiel des espèces et couverture",
		"Catálogo de especies y cobertura",
		"Catalogo delle specie e copertura"
	],
	[
		"The species count covers identified biological species, not customs groups. Analytical coverage varies; seed potatoes and vegetative material are separate.",
		"Die Artenzahl umfasst identifizierte biologische Arten, keine Zollgruppen. Die analytische Abdeckung variiert; Pflanzkartoffeln und vegetatives Material werden getrennt erfasst.",
		"Le nombre couvre les espèces biologiques identifiées, pas les groupes douaniers. La couverture analytique varie ; plants de pommes de terre et matériel végétatif sont distincts.",
		"El recuento incluye especies biológicas identificadas, no grupos aduaneros. La cobertura analítica varía; las patatas de siembra y el material vegetativo se separan.",
		"Il conteggio comprende specie biologiche identificate, non gruppi doganali. La copertura analitica varia; patate da seme e materiale vegetativo sono separati."
	],
	[
		"Download Crop Master and coverage",
		"Artenverzeichnis und Abdeckung herunterladen",
		"Télécharger le référentiel et la couverture",
		"Descargar el catálogo y la cobertura",
		"Scarica il catalogo e la copertura"
	],
	[
		"Menu",
		"Menü",
		"Menu",
		"Menú",
		"Menu"
	],
	[
		"Market Intelligence",
		"Marktinformationen",
		"Analyse du marché",
		"Inteligencia de mercado",
		"Intelligence di mercato"
	],
	[
		"News",
		"Nachrichten",
		"Actualités",
		"Noticias",
		"Notizie"
	],
	[
		"Insights",
		"Einblicke",
		"Analyses",
		"Análisis",
		"Approfondimenti"
	],
	[
		"Methodology",
		"Methodik",
		"Méthodologie",
		"Metodología",
		"Metodologia"
	],
	[
		"About",
		"Über uns",
		"À propos",
		"Quiénes somos",
		"Chi siamo"
	],
	[
		"Contact",
		"Kontakt",
		"Contact",
		"Contacto",
		"Contatti"
	],
	[
		"Marketplace",
		"Marktplatz",
		"Place de marché",
		"Mercado",
		"Mercato"
	],
	[
		"Platform",
		"Plattform",
		"Plateforme",
		"Plataforma",
		"Piattaforma"
	],
	[
		"Intelligence",
		"Marktanalyse",
		"Analyse",
		"Análisis",
		"Analisi"
	],
	[
		"Research",
		"Forschung",
		"Recherche",
		"Investigación",
		"Ricerca"
	],
	[
		"Partner Insights",
		"Partneranalysen",
		"Analyses partenaires",
		"Análisis de socios",
		"Analisi dei partner"
	],
	[
		"Privacy",
		"Datenschutz",
		"Confidentialité",
		"Privacidad",
		"Privacy"
	],
	[
		"Confidentiality",
		"Vertraulichkeit",
		"Confidentialité commerciale",
		"Confidencialidad",
		"Riservatezza"
	],
	[
		"Buying Requests",
		"Kaufgesuche",
		"Demandes d’achat",
		"Solicitudes de compra",
		"Richieste di acquisto"
	],
	[
		"European seed market intelligence",
		"Europäische Saatgutmarktinformationen",
		"Analyse du marché européen des semences",
		"Inteligencia del mercado europeo de semillas",
		"Intelligence del mercato europeo delle sementi"
	],
	[
		"for better decisions.",
		"für bessere Entscheidungen.",
		"pour mieux décider.",
		"para tomar mejores decisiones.",
		"per decisioni migliori."
	],
	[
		"Trade data, supply evidence, representative prices, weather exposure and verified B2B opportunities in one professional platform.",
		"Handelsdaten, Angebotsnachweise, repräsentative Preise, Wetterexposition und verifizierte B2B-Chancen auf einer professionellen Plattform.",
		"Données commerciales, éléments sur l’offre, prix représentatifs, exposition météorologique et opportunités B2B vérifiées sur une seule plateforme professionnelle.",
		"Datos comerciales, información sobre la oferta, precios representativos, exposición meteorológica y oportunidades B2B verificadas en una sola plataforma profesional.",
		"Dati commerciali, evidenze sull’offerta, prezzi rappresentativi, esposizione meteorologica e opportunità B2B verificate in un’unica piattaforma professionale."
	],
	[
		"Explore market",
		"Markt erkunden",
		"Explorer le marché",
		"Explorar el mercado",
		"Esplora il mercato"
	],
	[
		"Buying requests",
		"Kaufgesuche",
		"Demandes d’achat",
		"Solicitudes de compra",
		"Richieste di acquisto"
	],
	[
		"seed categories",
		"Saatgutkategorien",
		"catégories de semences",
		"categorías de semillas",
		"categorie di sementi"
	],
	[
		"PUBLIC_SAFE EU trade observations",
		"PUBLIC_SAFE-EU-Handelsbeobachtungen",
		"observations PUBLIC_SAFE du commerce de l’UE",
		"observaciones PUBLIC_SAFE del comercio de la UE",
		"osservazioni PUBLIC_SAFE sul commercio UE"
	],
	[
		"EU trade",
		"EU-Handel",
		"Commerce de l’UE",
		"Comercio de la UE",
		"Commercio UE"
	],
	[
		"coverage",
		"Abdeckung",
		"couverture",
		"cobertura",
		"copertura"
	],
	[
		"weather regions",
		"Wetterregionen",
		"régions météorologiques",
		"regiones meteorológicas",
		"regioni meteorologiche"
	],
	[
		"latest completed period",
		"letzter abgeschlossener Zeitraum",
		"dernière période complète",
		"último período completo",
		"ultimo periodo completo"
	],
	[
		"Market Signal",
		"Marktsignal",
		"Signal de marché",
		"Señal de mercado",
		"Segnale di mercato"
	],
	[
		"Verified data available · monthly",
		"Verifizierte Daten verfügbar · monatlich",
		"Données vérifiées disponibles · mensuelles",
		"Datos verificados disponibles · mensuales",
		"Dati verificati disponibili · mensili"
	],
	[
		"EU Seed Trade Pulse",
		"EU-Saatguthandelsindikator",
		"Indicateur du commerce de semences de l’UE",
		"Pulso del comercio de semillas de la UE",
		"Indicatore del commercio di sementi UE"
	],
	[
		"Volume",
		"Volumen",
		"Volume",
		"Volumen",
		"Volume"
	],
	[
		"Volume YoY",
		"Volumen ggü. Vorjahr",
		"Volume sur un an",
		"Volumen interanual",
		"Volume su base annua"
	],
	[
		"Trade value",
		"Handelswert",
		"Valeur commerciale",
		"Valor comercial",
		"Valore commerciale"
	],
	[
		"Trade value YoY",
		"Handelswert ggü. Vorjahr",
		"Valeur commerciale sur un an",
		"Valor comercial interanual",
		"Valore commerciale su base annua"
	],
	[
		"Unit value range",
		"Spanne der Einheitswerte",
		"Fourchette des valeurs unitaires",
		"Intervalo de valores unitarios",
		"Intervallo dei valori unitari"
	],
	[
		"Top News",
		"Wichtige Nachrichten",
		"À la une",
		"Noticias destacadas",
		"Notizie in primo piano"
	],
	[
		"What is changing now",
		"Was sich jetzt verändert",
		"Ce qui change actuellement",
		"Qué está cambiando",
		"Cosa sta cambiando"
	],
	[
		"View all →",
		"Alle anzeigen →",
		"Tout voir →",
		"Ver todo →",
		"Vedi tutti →"
	],
	[
		"Current market numbers",
		"Aktuelle Marktzahlen",
		"Chiffres actuels du marché",
		"Cifras actuales del mercado",
		"Dati attuali del mercato"
	],
	[
		"European Seed Market Snapshot",
		"Überblick über den europäischen Saatgutmarkt",
		"Aperçu du marché européen des semences",
		"Panorama del mercado europeo de semillas",
		"Panoramica del mercato europeo delle sementi"
	],
	[
		"All categories →",
		"Alle Kategorien →",
		"Toutes les catégories →",
		"Todas las categorías →",
		"Tutte le categorie →"
	],
	[
		"Research & Partner Insights / Events",
		"Forschung, Partneranalysen und Veranstaltungen",
		"Recherche, analyses partenaires et événements",
		"Investigación, análisis de socios y eventos",
		"Ricerca, analisi dei partner ed eventi"
	],
	[
		"Context beyond the numbers",
		"Kontext hinter den Zahlen",
		"Le contexte au-delà des chiffres",
		"Contexto más allá de las cifras",
		"Il contesto oltre i numeri"
	],
	[
		"Representative price",
		"Repräsentativer Preis",
		"Prix représentatif",
		"Precio representativo",
		"Prezzo rappresentativo"
	],
	[
		"Trade volume",
		"Handelsvolumen",
		"Volume des échanges",
		"Volumen comercial",
		"Volume degli scambi"
	],
	[
		"Explore market →",
		"Markt erkunden →",
		"Explorer le marché →",
		"Explorar el mercado →",
		"Esplora il mercato →"
	],
	[
		"Price evidence",
		"Preisbelege",
		"Éléments de prix",
		"Datos de precios",
		"Evidenze sui prezzi"
	],
	[
		"Read insight →",
		"Analyse lesen →",
		"Lire l’analyse →",
		"Leer el análisis →",
		"Leggi l’analisi →"
	],
	[
		"Read more →",
		"Weiterlesen →",
		"Lire la suite →",
		"Leer más →",
		"Leggi di più →"
	],
	[
		"Why it matters:",
		"Warum das wichtig ist:",
		"Pourquoi c’est important :",
		"Por qué importa:",
		"Perché è importante:"
	],
	[
		"Why it matters",
		"Warum das wichtig ist",
		"Pourquoi c’est important",
		"Por qué importa",
		"Perché è importante"
	],
	[
		"Source:",
		"Quelle:",
		"Source :",
		"Fuente:",
		"Fonte:"
	],
	[
		"European B2B seed network",
		"Europäisches B2B-Saatgutnetzwerk",
		"Réseau B2B européen des semences",
		"Red B2B europea de semillas",
		"Rete B2B europea delle sementi"
	],
	[
		"Join the European seed market network",
		"Dem europäischen Saatgutmarktnetzwerk beitreten",
		"Rejoindre le réseau européen du marché des semences",
		"Únase a la red europea del mercado de semillas",
		"Entra nella rete europea del mercato delle sementi"
	],
	[
		"Register interest for future verified buyer/seller introductions.",
		"Interesse an künftigen verifizierten Kontakten zwischen Käufern und Verkäufern anmelden.",
		"Signalez votre intérêt pour de futures mises en relation vérifiées entre acheteurs et vendeurs.",
		"Registre su interés en futuras presentaciones verificadas entre compradores y vendedores.",
		"Registra il tuo interesse per futuri contatti verificati tra acquirenti e venditori."
	],
	[
		"Company name",
		"Firmenname",
		"Nom de l’entreprise",
		"Nombre de la empresa",
		"Nome dell’azienda"
	],
	[
		"Business email",
		"Geschäftliche E-Mail-Adresse",
		"Adresse e-mail professionnelle",
		"Correo electrónico profesional",
		"E-mail aziendale"
	],
	[
		"Role",
		"Rolle",
		"Rôle",
		"Función",
		"Ruolo"
	],
	[
		"Select a role",
		"Rolle auswählen",
		"Choisir un rôle",
		"Seleccione una función",
		"Seleziona un ruolo"
	],
	[
		"Buyer",
		"Käufer",
		"Acheteur",
		"Comprador",
		"Acquirente"
	],
	[
		"Seller",
		"Verkäufer",
		"Vendeur",
		"Vendedor",
		"Venditore"
	],
	[
		"Partner",
		"Partner",
		"Partenaire",
		"Socio",
		"Partner"
	],
	[
		"Country",
		"Land",
		"Pays",
		"País",
		"Paese"
	],
	[
		"Website",
		"Website",
		"Site web",
		"Sitio web",
		"Sito web"
	],
	[
		"Sending…",
		"Wird gesendet…",
		"Envoi en cours…",
		"Enviando…",
		"Invio in corso…"
	],
	[
		"Register interest",
		"Interesse anmelden",
		"Signaler mon intérêt",
		"Registrar interés",
		"Registra il tuo interesse"
	],
	[
		"Please complete all four fields with valid details.",
		"Bitte füllen Sie alle vier Felder mit gültigen Angaben aus.",
		"Veuillez renseigner les quatre champs avec des informations valides.",
		"Complete los cuatro campos con datos válidos.",
		"Compila tutti e quattro i campi con dati validi."
	],
	[
		"Thank you. Your interest has been registered.",
		"Vielen Dank. Ihr Interesse wurde registriert.",
		"Merci. Votre intérêt a été enregistré.",
		"Gracias. Hemos registrado su interés.",
		"Grazie. Abbiamo registrato il tuo interesse."
	],
	[
		"Unable to register your interest. Please try again later.",
		"Ihr Interesse konnte nicht registriert werden. Bitte versuchen Sie es später erneut.",
		"Impossible d’enregistrer votre intérêt. Veuillez réessayer plus tard.",
		"No se ha podido registrar su interés. Inténtelo de nuevo más tarde.",
		"Impossibile registrare il tuo interesse. Riprova più tardi."
	],
	[
		"Privacy notice",
		"Datenschutzhinweise",
		"Avis de confidentialité",
		"Aviso de privacidad",
		"Informativa sulla privacy"
	],
	[
		"We use your business details to respond to your network interest. See our",
		"Wir verwenden Ihre geschäftlichen Angaben, um auf Ihr Interesse am Netzwerk zu antworten. Lesen Sie unsere",
		"Nous utilisons vos coordonnées professionnelles pour répondre à votre intérêt pour le réseau. Consultez notre",
		"Utilizamos sus datos profesionales para responder a su interés en la red. Consulte nuestro",
		"Utilizziamo i tuoi dati aziendali per rispondere al tuo interesse per la rete. Consulta la nostra"
	],
	[
		". No account is created.",
		". Es wird kein Konto erstellt.",
		". Aucun compte n’est créé.",
		". No se crea ninguna cuenta.",
		". Non viene creato alcun account."
	],
	[
		"About SeedTrade",
		"Über SeedTrade",
		"À propos de SeedTrade",
		"Acerca de SeedTrade",
		"Informazioni su SeedTrade"
	],
	[
		"European seed market intelligence for better commercial decisions.",
		"Europäische Saatgutmarktinformationen für bessere Geschäftsentscheidungen.",
		"L’analyse du marché européen des semences au service de meilleures décisions commerciales.",
		"Inteligencia del mercado europeo de semillas para mejores decisiones comerciales.",
		"Intelligence del mercato europeo delle sementi per decisioni commerciali migliori."
	],
	[
		"SeedTrade.eu is an independent European seed-market intelligence and B2B marketplace platform. It brings fragmented trade, supply, crop and opportunity evidence into one clear professional context.",
		"SeedTrade.eu ist eine unabhängige europäische Plattform für Saatgutmarktinformationen und einen B2B-Marktplatz. Sie führt verstreute Daten zu Handel, Angebot, Kulturen und Geschäftschancen in einem klaren fachlichen Zusammenhang zusammen.",
		"SeedTrade.eu est une plateforme européenne indépendante d’analyse du marché des semences et de mise en relation B2B. Elle rassemble des informations dispersées sur le commerce, l’offre, les cultures et les opportunités dans un cadre professionnel clair.",
		"SeedTrade.eu es una plataforma europea independiente de inteligencia del mercado de semillas y mercado B2B. Reúne información dispersa sobre comercio, oferta, cultivos y oportunidades en un contexto profesional claro.",
		"SeedTrade.eu è una piattaforma europea indipendente di intelligence del mercato delle sementi e di incontro B2B. Riunisce informazioni frammentate su scambi, offerta, colture e opportunità in un quadro professionale chiaro."
	],
	[
		"The objective is practical: understand what is moving, where activity is changing and what verified evidence may matter for supply, demand and commercial decisions.",
		"Das Ziel ist praktisch: erkennen, was sich bewegt, wo sich die Aktivität verändert und welche verifizierten Daten für Angebot, Nachfrage und Geschäftsentscheidungen relevant sein können.",
		"L’objectif est concret : comprendre les mouvements du marché, les évolutions de l’activité et les données vérifiées utiles aux décisions relatives à l’offre, à la demande et aux échanges commerciaux.",
		"El objetivo es práctico: comprender qué se mueve, dónde cambia la actividad y qué datos verificados pueden importar para la oferta, la demanda y las decisiones comerciales.",
		"L’obiettivo è pratico: capire cosa si muove, dove cambia l’attività e quali evidenze verificate possono contare per offerta, domanda e decisioni commerciali."
	],
	[
		"Why SeedTrade",
		"Warum SeedTrade",
		"Pourquoi SeedTrade",
		"Por qué SeedTrade",
		"Perché SeedTrade"
	],
	[
		"From scattered evidence to commercial context",
		"Aus verstreuten Daten wird Geschäftskontext",
		"Des données dispersées au contexte commercial",
		"De datos dispersos a contexto comercial",
		"Dalle evidenze frammentate al contesto commerciale"
	],
	[
		"See market movement",
		"Marktbewegungen erkennen",
		"Observer les mouvements du marché",
		"Ver los movimientos del mercado",
		"Osservare i movimenti del mercato"
	],
	[
		"Understand verified trade volumes, values and completed-period changes across European seed markets.",
		"Verifizierte Handelsvolumina, Werte und Veränderungen abgeschlossener Zeiträume auf europäischen Saatgutmärkten verstehen.",
		"Comprendre les volumes et valeurs vérifiés des échanges ainsi que leur évolution sur des périodes complètes dans les marchés européens des semences.",
		"Comprender los volúmenes y valores comerciales verificados y los cambios entre períodos completos en los mercados europeos de semillas.",
		"Comprendere volumi e valori degli scambi verificati e le variazioni nei periodi completi sui mercati europei delle sementi."
	],
	[
		"Connect trade and supply",
		"Handel und Angebot verbinden",
		"Relier commerce et offre",
		"Relacionar comercio y oferta",
		"Collegare scambi e offerta"
	],
	[
		"Bring trade evidence, verified supply information and crop conditions into one professional view.",
		"Handelsdaten, verifizierte Angebotsinformationen und Anbaubedingungen in einer fachlichen Übersicht zusammenführen.",
		"Réunir les données commerciales, les informations vérifiées sur l’offre et les conditions de culture dans une vue professionnelle unique.",
		"Reunir datos comerciales, información verificada sobre la oferta y condiciones de cultivo en una sola visión profesional.",
		"Riunire dati sugli scambi, informazioni verificate sull’offerta e condizioni delle colture in un’unica visione professionale."
	],
	[
		"Identify market timing",
		"Marktzeitpunkte erkennen",
		"Repérer le bon moment sur le marché",
		"Identificar los momentos del mercado",
		"Individuare i tempi del mercato"
	],
	[
		"Make periods of increasing or decreasing activity easier to identify without presenting forecasts as facts.",
		"Phasen steigender oder sinkender Aktivität leichter erkennen, ohne Prognosen als Tatsachen darzustellen.",
		"Repérer plus facilement les périodes de hausse ou de baisse de l’activité sans présenter des prévisions comme des faits.",
		"Facilitar la identificación de períodos de mayor o menor actividad sin presentar previsiones como hechos.",
		"Rendere più semplice individuare periodi di attività in aumento o in calo, senza presentare le previsioni come fatti."
	],
	[
		"Discover B2B opportunities",
		"B2B-Chancen entdecken",
		"Découvrir les opportunités B2B",
		"Descubrir oportunidades B2B",
		"Scoprire opportunità B2B"
	],
	[
		"Connect market intelligence with verified seed offers and future buying requests while sensitive details remain private.",
		"Marktinformationen mit verifizierten Saatgutangeboten und künftigen Kaufgesuchen verbinden; sensible Angaben bleiben vertraulich.",
		"Relier l’analyse du marché aux offres de semences vérifiées et aux futures demandes d’achat, tout en préservant la confidentialité des informations sensibles.",
		"Relacionar la inteligencia de mercado con ofertas de semillas verificadas y futuras solicitudes de compra, manteniendo privados los datos sensibles.",
		"Collegare l’intelligence di mercato alle offerte verificate di sementi e alle future richieste di acquisto, mantenendo riservati i dati sensibili."
	],
	[
		"General enquiries",
		"Allgemeine Anfragen",
		"Demandes générales",
		"Consultas generales",
		"Richieste generali"
	],
	[
		"General enquiries:",
		"Allgemeine Anfragen:",
		"Demandes générales :",
		"Consultas generales:",
		"Richieste generali:"
	],
	[
		"Contact SeedTrade",
		"SeedTrade kontaktieren",
		"Contacter SeedTrade",
		"Contactar con SeedTrade",
		"Contatta SeedTrade"
	],
	[
		"Questions about SeedTrade, market intelligence, partnerships or cooperation? Send us a message.",
		"Fragen zu SeedTrade, Marktinformationen, Partnerschaften oder Zusammenarbeit? Schreiben Sie uns.",
		"Des questions sur SeedTrade, l’analyse du marché, les partenariats ou la coopération ? Envoyez-nous un message.",
		"¿Tiene preguntas sobre SeedTrade, inteligencia de mercado, asociaciones o colaboración? Envíenos un mensaje.",
		"Hai domande su SeedTrade, intelligence di mercato, partnership o collaborazioni? Scrivici."
	],
	[
		"Contact form activation coming next.",
		"Das Kontaktformular wird demnächst aktiviert.",
		"Le formulaire de contact sera bientôt activé.",
		"El formulario de contacto se activará próximamente.",
		"Il modulo di contatto sarà attivato prossimamente."
	],
	[
		"No information entered here is submitted or stored.",
		"Hier eingegebene Daten werden weder gesendet noch gespeichert.",
		"Les informations saisies ici ne sont ni envoyées ni enregistrées.",
		"Los datos introducidos aquí no se envían ni se almacenan.",
		"I dati inseriti qui non vengono inviati né archiviati."
	],
	[
		"Name",
		"Name",
		"Nom",
		"Nombre",
		"Nome"
	],
	[
		"Company",
		"Unternehmen",
		"Entreprise",
		"Empresa",
		"Azienda"
	],
	[
		"Subject",
		"Betreff",
		"Objet",
		"Asunto",
		"Oggetto"
	],
	[
		"Select a subject",
		"Betreff auswählen",
		"Choisir un objet",
		"Seleccione un asunto",
		"Seleziona un oggetto"
	],
	[
		"Data & Methodology",
		"Daten und Methodik",
		"Données et méthodologie",
		"Datos y metodología",
		"Dati e metodologia"
	],
	[
		"Partnership",
		"Partnerschaft",
		"Partenariat",
		"Colaboración",
		"Partnership"
	],
	[
		"Media & General Enquiry",
		"Presse und allgemeine Anfrage",
		"Médias et demande générale",
		"Prensa y consulta general",
		"Media e richieste generali"
	],
	[
		"Other",
		"Sonstiges",
		"Autre",
		"Otro",
		"Altro"
	],
	[
		"Message",
		"Nachricht",
		"Message",
		"Mensaje",
		"Messaggio"
	],
	[
		"Send message",
		"Nachricht senden",
		"Envoyer le message",
		"Enviar mensaje",
		"Invia messaggio"
	],
	[
		"Optional analytics",
		"Optionale Analyse",
		"Analyse d’audience facultative",
		"Análisis opcional",
		"Analisi facoltative"
	],
	[
		"Country-level aggregate usage helps improve SeedTrade. No analytics loads before consent.",
		"Aggregierte Nutzungsdaten auf Länderebene helfen, SeedTrade zu verbessern. Analysedienste werden erst nach Einwilligung geladen.",
		"Les données d’utilisation agrégées par pays contribuent à améliorer SeedTrade. Aucun outil d’analyse n’est chargé avant votre consentement.",
		"Los datos agregados de uso por país ayudan a mejorar SeedTrade. No se carga ningún análisis antes del consentimiento.",
		"I dati d’uso aggregati per paese aiutano a migliorare SeedTrade. Nessuna analisi viene caricata prima del consenso."
	],
	[
		"Decline",
		"Ablehnen",
		"Refuser",
		"Rechazar",
		"Rifiuta"
	],
	[
		"Allow analytics",
		"Analyse erlauben",
		"Autoriser l’analyse",
		"Permitir análisis",
		"Consenti analisi"
	],
	[
		"Page not found",
		"Seite nicht gefunden",
		"Page introuvable",
		"Página no encontrada",
		"Pagina non trovata"
	],
	[
		"Return home",
		"Zur Startseite",
		"Retour à l’accueil",
		"Volver al inicio",
		"Torna alla pagina iniziale"
	],
	[
		"© 2026 SeedTrade.eu · European Seed Market Intelligence",
		"© 2026 SeedTrade.eu · Europäische Saatgutmarktinformationen",
		"© 2026 SeedTrade.eu · Analyse du marché européen des semences",
		"© 2026 SeedTrade.eu · Inteligencia del mercado europeo de semillas",
		"© 2026 SeedTrade.eu · Intelligence del mercato europeo delle sementi"
	],
	[
		"ACTIVE",
		"AKTIV",
		"ACTIF",
		"ACTIVO",
		"ATTIVO"
	],
	[
		"Active Marketplace Listings",
		"Aktive Marktplatzangebote",
		"Annonces actives de la place de marché",
		"Anuncios activos del mercado",
		"Annunci attivi del mercato"
	],
	[
		"All",
		"Alle",
		"Tous",
		"Todos",
		"Tutti"
	],
	[
		"All certifications",
		"Alle Zertifizierungen",
		"Toutes les certifications",
		"Todas las certificaciones",
		"Tutte le certificazioni"
	],
	[
		"All countries",
		"Alle Länder",
		"Tous les pays",
		"Todos los países",
		"Tutti i paesi"
	],
	[
		"All dates",
		"Alle Daten",
		"Toutes les dates",
		"Todas las fechas",
		"Tutte le date"
	],
	[
		"B2B opportunity discovery",
		"B2B-Chancen entdecken",
		"Découvrir les opportunités B2B",
		"Descubrir oportunidades B2B",
		"Scoprire opportunità B2B"
	],
	[
		"Balance",
		"Saldo",
		"Solde",
		"Saldo",
		"Saldo"
	],
	[
		"Biggest verified volume movers",
		"Stärkste verifizierte Volumenänderungen",
		"Plus fortes variations vérifiées des volumes",
		"Mayores variaciones verificadas de volumen",
		"Maggiori variazioni verificate dei volumi"
	],
	[
		"Category",
		"Kategorie",
		"Catégorie",
		"Categoría",
		"Categoria"
	],
	[
		"Certified seed ≠ commodity area",
		"Zertifiziertes Saatgut ≠ Anbaufläche von Marktfrüchten",
		"Semences certifiées ≠ surfaces de cultures de consommation",
		"Semilla certificada ≠ superficie de cultivos comerciales",
		"Sementi certificate ≠ superficie delle colture da consumo"
	],
	[
		"Conditions worth monitoring",
		"Bedingungen, die Beobachtung verdienen",
		"Des conditions à suivre",
		"Condiciones que conviene vigilar",
		"Condizioni da monitorare"
	],
	[
		"DEMO DATA below — not market demand or supply",
		"DEMO-DATEN unten — keine tatsächliche Nachfrage oder Angebot",
		"DONNÉES DE DÉMONSTRATION ci-dessous — ni demande ni offre réelles",
		"DATOS DE DEMOSTRACIÓN abajo — no son demanda ni oferta reales",
		"DATI DIMOSTRATIVI sotto — non rappresentano domanda né offerta reali"
	],
	[
		"DEMO — NOT REAL DEMAND",
		"DEMO — KEINE ECHTE NACHFRAGE",
		"DÉMONSTRATION — AUCUNE DEMANDE RÉELLE",
		"DEMO — NO ES DEMANDA REAL",
		"DEMO — NON È DOMANDA REALE"
	],
	[
		"Daily Seed Market News",
		"Aktuelle Nachrichten zum Saatgutmarkt",
		"Actualités du marché des semences",
		"Noticias del mercado de semillas",
		"Notizie sul mercato delle sementi"
	],
	[
		"Data and Market Intelligence Methodology",
		"Methodik für Daten und Marktinformationen",
		"Méthodologie des données et de l’analyse du marché",
		"Metodología de datos e inteligencia de mercado",
		"Metodologia dei dati e dell’intelligence di mercato"
	],
	[
		"Delivery",
		"Lieferung",
		"Livraison",
		"Entrega",
		"Consegna"
	],
	[
		"Destination",
		"Bestimmungsort",
		"Destination",
		"Destino",
		"Destinazione"
	],
	[
		"EU Exports:",
		"EU-Ausfuhren:",
		"Exportations de l’UE :",
		"Exportaciones de la UE:",
		"Esportazioni UE:"
	],
	[
		"EU Imports:",
		"EU-Einfuhren:",
		"Importations de l’UE :",
		"Importaciones de la UE:",
		"Importazioni UE:"
	],
	[
		"EU Internal Trade:",
		"EU-Binnenhandel:",
		"Commerce intra-UE :",
		"Comercio intra-UE:",
		"Commercio intra-UE:"
	],
	[
		"EU Market Pulse",
		"EU-Marktindikator",
		"Indicateur du marché de l’UE",
		"Pulso del mercado de la UE",
		"Indicatore del mercato UE"
	],
	[
		"EU Seed Trade Pulse definitions",
		"Definitionen des EU-Saatguthandelsindikators",
		"Définitions de l’indicateur du commerce de semences de l’UE",
		"Definiciones del pulso del comercio de semillas de la UE",
		"Definizioni dell’indicatore del commercio di sementi UE"
	],
	[
		"EU · TRADE FLOWS",
		"EU · HANDELSSTRÖME",
		"UE · FLUX COMMERCIAUX",
		"UE · FLUJOS COMERCIALES",
		"UE · FLUSSI COMMERCIALI"
	],
	[
		"EUROPE · WEATHER EXPOSURE",
		"EUROPA · WETTEREXPOSITION",
		"EUROPE · EXPOSITION MÉTÉOROLOGIQUE",
		"EUROPA · EXPOSICIÓN METEOROLÓGICA",
		"EUROPA · ESPOSIZIONE METEOROLOGICA"
	],
	[
		"European Seed Market Intelligence",
		"Europäische Saatgutmarktinformationen",
		"Analyse du marché européen des semences",
		"Inteligencia del mercado europeo de semillas",
		"Intelligence del mercato europeo delle sementi"
	],
	[
		"Evidence for commercial seed decisions",
		"Daten für geschäftliche Entscheidungen im Saatguthandel",
		"Des données pour les décisions commerciales sur les semences",
		"Datos para decisiones comerciales sobre semillas",
		"Evidenze per le decisioni commerciali sulle sementi"
	],
	[
		"Evidence insufficient for a robust seasonality claim.",
		"Die Daten reichen für eine belastbare Aussage zur Saisonalität nicht aus.",
		"Les données ne permettent pas d’établir une saisonnalité robuste.",
		"Los datos no permiten afirmar una estacionalidad sólida.",
		"Le evidenze non consentono di confermare una stagionalità robusta."
	],
	[
		"Explore Trade Pulse →",
		"Handelsindikator erkunden →",
		"Explorer l’indicateur commercial →",
		"Explorar el pulso comercial →",
		"Esplora l’indicatore commerciale →"
	],
	[
		"Explore verified seed categories",
		"Verifizierte Saatgutkategorien erkunden",
		"Explorer les catégories de semences vérifiées",
		"Explorar categorías de semillas verificadas",
		"Esplora le categorie di sementi verificate"
	],
	[
		"Exports",
		"Ausfuhren",
		"Exportations",
		"Exportaciones",
		"Esportazioni"
	],
	[
		"Extra-EU trade balance",
		"Extra-EU-Handelssaldo",
		"Solde commercial extra-UE",
		"Saldo comercial extra-UE",
		"Saldo commerciale extra-UE"
	],
	[
		"Full methodology →",
		"Vollständige Methodik →",
		"Méthodologie complète →",
		"Metodología completa →",
		"Metodologia completa →"
	],
	[
		"I want to buy",
		"Ich möchte kaufen",
		"Je souhaite acheter",
		"Quiero comprar",
		"Voglio acquistare"
	],
	[
		"I want to sell",
		"Ich möchte verkaufen",
		"Je souhaite vendre",
		"Quiero vender",
		"Voglio vendere"
	],
	[
		"Illustrative TEST card",
		"Beispielhafte TEST-Anzeige",
		"Fiche TEST illustrative",
		"Ficha de PRUEBA ilustrativa",
		"Scheda TEST illustrativa"
	],
	[
		"Imports",
		"Einfuhren",
		"Importations",
		"Importaciones",
		"Importazioni"
	],
	[
		"Internal · imports · exports",
		"Binnenhandel · Einfuhren · Ausfuhren",
		"Commerce interne · importations · exportations",
		"Comercio interno · importaciones · exportaciones",
		"Commercio interno · importazioni · esportazioni"
	],
	[
		"Is supply tightening or expanding?",
		"Wird das Angebot knapper oder größer?",
		"L’offre se resserre-t-elle ou s’accroît-elle ?",
		"¿Se reduce o aumenta la oferta?",
		"L’offerta si contrae o si espande?"
	],
	[
		"Latest available:",
		"Zuletzt verfügbar:",
		"Dernière période disponible :",
		"Último disponible:",
		"Ultimo dato disponibile:"
	],
	[
		"Latest completed month",
		"Letzter abgeschlossener Monat",
		"Dernier mois complet",
		"Último mes completo",
		"Ultimo mese completo"
	],
	[
		"Leading exporters",
		"Führende Ausfuhrländer",
		"Principaux exportateurs",
		"Principales exportadores",
		"Principali esportatori"
	],
	[
		"Major corridors",
		"Wichtige Handelsrouten",
		"Principaux corridors",
		"Principales corredores comerciales",
		"Principali corridoi commerciali"
	],
	[
		"Market context",
		"Marktkontext",
		"Contexte du marché",
		"Contexto de mercado",
		"Contesto di mercato"
	],
	[
		"Market observations",
		"Marktbeobachtungen",
		"Observations du marché",
		"Observaciones del mercado",
		"Osservazioni di mercato"
	],
	[
		"Methodology in brief",
		"Methodik im Überblick",
		"Méthodologie en bref",
		"Metodología resumida",
		"Metodologia in breve"
	],
	[
		"Metrics and evidence",
		"Kennzahlen und Datengrundlage",
		"Indicateurs et données probantes",
		"Indicadores y datos",
		"Metriche ed evidenze"
	],
	[
		"Monthly trade value, EUR",
		"Monatlicher Handelswert, EUR",
		"Valeur mensuelle des échanges, EUR",
		"Valor comercial mensual, EUR",
		"Valore mensile degli scambi, EUR"
	],
	[
		"Monthly volume, tonnes",
		"Monatliches Volumen, Tonnen",
		"Volume mensuel, tonnes",
		"Volumen mensual, toneladas",
		"Volume mensile, tonnellate"
	],
	[
		"No matching listings",
		"Keine passenden Angebote",
		"Aucune annonce correspondante",
		"No hay anuncios coincidentes",
		"Nessun annuncio corrispondente"
	],
	[
		"No matching market category",
		"Keine passende Marktkategorie",
		"Aucune catégorie de marché correspondante",
		"No hay categorías de mercado coincidentes",
		"Nessuna categoria di mercato corrispondente"
	],
	[
		"Offer — coming next",
		"Angebot — in Vorbereitung",
		"Offre — prochainement",
		"Oferta — próximamente",
		"Offerta — prossimamente"
	],
	[
		"Offers",
		"Angebote",
		"Offres",
		"Ofertas",
		"Offerte"
	],
	[
		"Open full Trade Pulse →",
		"Vollständigen Handelsindikator öffnen →",
		"Ouvrir l’indicateur commercial complet →",
		"Abrir el pulso comercial completo →",
		"Apri l’indicatore commerciale completo →"
	],
	[
		"Open intelligence →",
		"Marktanalyse öffnen →",
		"Ouvrir l’analyse →",
		"Abrir inteligencia de mercado →",
		"Apri l’analisi →"
	],
	[
		"Organic",
		"Ökologisch",
		"Biologique",
		"Ecológico",
		"Biologico"
	],
	[
		"Origin",
		"Herkunft",
		"Origine",
		"Origen",
		"Origine"
	],
	[
		"Packaging",
		"Verpackung",
		"Conditionnement",
		"Envase",
		"Confezionamento"
	],
	[
		"Peak activity",
		"Höchste Aktivität",
		"Pic d’activité",
		"Actividad máxima",
		"Picco di attività"
	],
	[
		"Permanent PUBLIC_SAFE archive",
		"Dauerhaftes PUBLIC_SAFE-Archiv",
		"Archives PUBLIC_SAFE permanentes",
		"Archivo PUBLIC_SAFE permanente",
		"Archivio PUBLIC_SAFE permanente"
	],
	[
		"Price",
		"Preis",
		"Prix",
		"Precio",
		"Prezzo"
	],
	[
		"Private marketplace · disabled at public MVP",
		"Privater Marktplatz · im öffentlichen MVP deaktiviert",
		"Place de marché privée · désactivée dans le MVP public",
		"Mercado privado · desactivado en la versión pública inicial",
		"Mercato privato · disattivato nell’MVP pubblico"
	],
	[
		"Quantity",
		"Menge",
		"Quantité",
		"Cantidad",
		"Quantità"
	],
	[
		"RFQ — coming next",
		"Kaufanfrage — in Vorbereitung",
		"Demande de prix — prochainement",
		"Solicitud de oferta — próximamente",
		"Richiesta di offerta — prossimamente"
	],
	[
		"Representative price history",
		"Verlauf der repräsentativen Preise",
		"Historique des prix représentatifs",
		"Historial de precios representativos",
		"Storico dei prezzi rappresentativi"
	],
	[
		"Research & Partner Insights",
		"Forschung und Partneranalysen",
		"Recherche et analyses partenaires",
		"Investigación y análisis de socios",
		"Ricerca e analisi dei partner"
	],
	[
		"Rolling 12-month trade activity",
		"Handelsaktivität über zwölf gleitende Monate",
		"Activité commerciale sur douze mois glissants",
		"Actividad comercial en doce meses móviles",
		"Attività commerciale su dodici mesi mobili"
	],
	[
		"SEED · PRODUCTION",
		"SAATGUT · PRODUKTION",
		"SEMENCES · PRODUCTION",
		"SEMILLAS · PRODUCCIÓN",
		"SEMENTI · PRODUZIONE"
	],
	[
		"Scope and publication gates",
		"Geltungsbereich und Veröffentlichungskriterien",
		"Périmètre et critères de publication",
		"Alcance y criterios de publicación",
		"Ambito e criteri di pubblicazione"
	],
	[
		"Search species or variety",
		"Art oder Sorte suchen",
		"Rechercher une espèce ou une variété",
		"Buscar especie o variedad",
		"Cerca specie o varietà"
	],
	[
		"Seasonality",
		"Saisonalität",
		"Saisonnalité",
		"Estacionalidad",
		"Stagionalità"
	],
	[
		"Seed Production",
		"Saatgutproduktion",
		"Production de semences",
		"Producción de semillas",
		"Produzione di sementi"
	],
	[
		"Seed marketplace discovery",
		"Saatgutangebote entdecken",
		"Découvrir la place de marché des semences",
		"Descubrir el mercado de semillas",
		"Esplorare il mercato delle sementi"
	],
	[
		"Editorial illustration",
		"Redaktionelle Illustration",
		"Illustration éditoriale",
		"Ilustración editorial",
		"Illustrazione editoriale"
	],
	[
		"Source and provenance",
		"Quelle und Herkunft",
		"Source et provenance",
		"Fuente y procedencia",
		"Fonte e provenienza"
	],
	[
		"Sources and provenance",
		"Quellen und Herkunft",
		"Sources et provenance",
		"Fuentes y procedencia",
		"Fonti e provenienza"
	],
	[
		"Submission unavailable in public MVP",
		"Übermittlung im öffentlichen MVP nicht verfügbar",
		"Soumission indisponible dans le MVP public",
		"Envío no disponible en la versión pública inicial",
		"Invio non disponibile nell’MVP pubblico"
	],
	[
		"Supply evidence",
		"Angebotsdaten",
		"Éléments sur l’offre",
		"Datos sobre la oferta",
		"Evidenze sull’offerta"
	],
	[
		"Top verified seed categories",
		"Führende verifizierte Saatgutkategorien",
		"Principales catégories de semences vérifiées",
		"Principales categorías de semillas verificadas",
		"Principali categorie di sementi verificate"
	],
	[
		"Trade activity over time",
		"Handelsaktivität im Zeitverlauf",
		"Évolution de l’activité commerciale",
		"Evolución de la actividad comercial",
		"Andamento dell’attività commerciale"
	],
	[
		"Trade balance:",
		"Handelssaldo:",
		"Solde commercial :",
		"Saldo comercial:",
		"Saldo commerciale:"
	],
	[
		"Trend basis:",
		"Trendgrundlage:",
		"Base de la tendance :",
		"Base de la tendencia:",
		"Base delle tendenze:"
	],
	[
		"Unit value",
		"Einheitswert",
		"Valeur unitaire",
		"Valor unitario",
		"Valore unitario"
	],
	[
		"Unit value range:",
		"Spanne der Einheitswerte:",
		"Fourchette des valeurs unitaires :",
		"Intervalo de valores unitarios:",
		"Intervallo dei valori unitari:"
	],
	[
		"Value YoY",
		"Wert ggü. Vorjahr",
		"Valeur sur un an",
		"Valor interanual",
		"Valore su base annua"
	],
	[
		"Variety:",
		"Sorte:",
		"Variété :",
		"Variedad:",
		"Varietà:"
	],
	[
		"View all active listings →",
		"Alle aktiven Angebote anzeigen →",
		"Voir toutes les annonces actives →",
		"Ver todos los anuncios activos →",
		"Vedi tutti gli annunci attivi →"
	],
	[
		"View production evidence →",
		"Produktionsdaten ansehen →",
		"Voir les données de production →",
		"Ver datos de producción →",
		"Vedi le evidenze sulla produzione →"
	],
	[
		"View weather evidence →",
		"Wetterdaten ansehen →",
		"Voir les données météorologiques →",
		"Ver datos meteorológicos →",
		"Vedi le evidenze meteorologiche →"
	],
	[
		"Weather/phenology",
		"Wetter/Phänologie",
		"Météo/phénologie",
		"Meteorología/fenología",
		"Meteo/fenologia"
	],
	[
		"What is moving, where and when?",
		"Was bewegt sich, wo und wann?",
		"Quels mouvements, où et quand ?",
		"¿Qué se mueve, dónde y cuándo?",
		"Cosa si muove, dove e quando?"
	],
	[
		"What the evidence supports",
		"Was die Daten belegen",
		"Ce que les données permettent d’affirmer",
		"Qué respaldan los datos",
		"Cosa sostengono le evidenze"
	],
	[
		"Why this level?",
		"Warum diese Einstufung?",
		"Pourquoi ce niveau ?",
		"¿Por qué este nivel?",
		"Perché questo livello?"
	],
	[
		"latest completed trade period",
		"letzter abgeschlossener Handelszeitraum",
		"dernière période commerciale complète",
		"último período comercial completo",
		"ultimo periodo commerciale completo"
	],
	[
		"show buying requests",
		"Kaufgesuche anzeigen",
		"afficher les demandes d’achat",
		"mostrar solicitudes de compra",
		"mostra richieste di acquisto"
	],
	[
		"show offers",
		"Angebote anzeigen",
		"afficher les offres",
		"mostrar ofertas",
		"mostra offerte"
	],
	[
		"← Active marketplace listings",
		"← Aktive Marktplatzangebote",
		"← Annonces actives",
		"← Anuncios activos",
		"← Annunci attivi"
	],
	[
		"← All insights",
		"← Alle Analysen",
		"← Toutes les analyses",
		"← Todos los análisis",
		"← Tutte le analisi"
	],
	[
		"← Daily Seed Market News",
		"← Nachrichten zum Saatgutmarkt",
		"← Actualités du marché des semences",
		"← Noticias del mercado de semillas",
		"← Notizie sul mercato delle sementi"
	],
	[
		"← Market dashboard",
		"← Marktübersicht",
		"← Tableau de bord du marché",
		"← Panel del mercado",
		"← Quadro del mercato"
	],
	[
		"Activity labels are evidence-gated descriptions of completed trade, not forecasts or trading advice. Individual species intelligence remains available in Market Intelligence.",
		"Aktivitätskennzeichnungen beschreiben abgeschlossene Handelszeiträume auf Basis geprüfter Daten; sie sind weder Prognosen noch Handelsempfehlungen. Informationen zu einzelnen Arten finden Sie weiterhin unter Marktinformationen.",
		"Les niveaux d’activité décrivent des échanges sur des périodes complètes, sous réserve de critères de preuve ; ils ne sont ni des prévisions ni des conseils commerciaux. Les informations par espèce restent disponibles dans l’analyse du marché.",
		"Las etiquetas de actividad describen comercio de períodos completos sujeto a criterios de evidencia; no son previsiones ni recomendaciones comerciales. La información por especie sigue disponible en inteligencia de mercado.",
		"Le etichette di attività descrivono scambi relativi a periodi completi sulla base di evidenze verificate; non sono previsioni né consigli commerciali. Le informazioni sulle singole specie restano disponibili nell’intelligence di mercato."
	],
	[
		"Cards advance one position approximately every 2–3 seconds. This is display rotation only.",
		"Die Karten rücken etwa alle 2–3 Sekunden um eine Position weiter. Dabei ändert sich nur die Anzeige.",
		"Les cartes avancent d’une position environ toutes les 2 à 3 secondes. Il s’agit uniquement d’une rotation visuelle.",
		"Las tarjetas avanzan una posición aproximadamente cada 2–3 segundos. Es solo una rotación visual.",
		"Le schede avanzano di una posizione circa ogni 2–3 secondi. È soltanto una rotazione visiva."
	],
	[
		"Certified-seed and multiplication evidence is kept separate from commodity crop area. Evidence is currently insufficient for an EU-wide supply direction.",
		"Daten zu zertifiziertem Saatgut und Vermehrung bleiben von der Anbaufläche für Marktfrüchte getrennt. Für eine Aussage zur Angebotsentwicklung in der gesamten EU reichen die Daten derzeit nicht aus.",
		"Les données sur les semences certifiées et la multiplication restent distinctes des surfaces de cultures de consommation. Les éléments disponibles ne permettent pas actuellement d’établir une tendance de l’offre à l’échelle de l’UE.",
		"Los datos de semilla certificada y multiplicación se mantienen separados de la superficie de cultivos comerciales. Los datos actuales no permiten establecer una dirección de la oferta para toda la UE.",
		"Le evidenze su sementi certificate e moltiplicazione restano separate dalle superfici delle colture da consumo. I dati attuali non bastano per definire la direzione dell’offerta nell’intera UE."
	],
	[
		"Company identity, direct contacts, commercial terms and supporting documents remain private by default. They may be disclosed with authorization, where necessary after a confirmed introduction, or where legally required. GDPR and commercial confidentiality are separate controls.",
		"Unternehmensidentität, direkte Kontaktdaten, Geschäftsbedingungen und Nachweise bleiben grundsätzlich vertraulich. Eine Offenlegung kann mit Genehmigung, bei Bedarf nach einer bestätigten Kontaktvermittlung oder aufgrund gesetzlicher Pflichten erfolgen. DSGVO und geschäftliche Vertraulichkeit sind getrennte Schutzmaßnahmen.",
		"L’identité des entreprises, les coordonnées directes, les conditions commerciales et les justificatifs restent confidentiels par défaut. Ils peuvent être communiqués avec autorisation, si nécessaire après une mise en relation confirmée, ou lorsque la loi l’exige. Le RGPD et la confidentialité commerciale constituent des protections distinctes.",
		"La identidad de las empresas, los contactos directos, las condiciones comerciales y los documentos justificativos permanecen privados por defecto. Pueden comunicarse con autorización, cuando sea necesario tras una presentación confirmada o por obligación legal. El RGPD y la confidencialidad comercial son controles separados.",
		"Identità aziendali, contatti diretti, condizioni commerciali e documenti di supporto restano riservati per impostazione predefinita. Possono essere divulgati con autorizzazione, se necessario dopo un contatto confermato o quando richiesto dalla legge. GDPR e riservatezza commerciale sono tutele distinte."
	],
	[
		"Editorial content does not influence Market Signal or quantitative calculations.",
		"Redaktionelle Inhalte beeinflussen weder das Marktsignal noch quantitative Berechnungen.",
		"Le contenu éditorial n’influence ni le signal de marché ni les calculs quantitatifs.",
		"El contenido editorial no influye en la señal de mercado ni en los cálculos cuantitativos.",
		"I contenuti editoriali non influenzano il segnale di mercato né i calcoli quantitativi."
	],
	[
		"Editorial content · isolated from Market Signal",
		"Redaktionelle Inhalte · vom Marktsignal getrennt",
		"Contenu éditorial · distinct du signal de marché",
		"Contenido editorial · separado de la señal de mercado",
		"Contenuti editoriali · separati dal segnale di mercato"
	],
	[
		"Industry events, research context and clearly disclosed partner perspectives for European seed professionals.",
		"Branchenveranstaltungen, Forschungskontext und klar gekennzeichnete Partnerperspektiven für Fachleute der europäischen Saatgutbranche.",
		"Événements du secteur, contexte scientifique et points de vue des partenaires clairement signalés pour les professionnels européens des semences.",
		"Eventos del sector, contexto de investigación y perspectivas de socios claramente identificadas para profesionales europeos de las semillas.",
		"Eventi del settore, contesto della ricerca e prospettive dei partner chiaramente dichiarate per i professionisti europei delle sementi."
	],
	[
		"News and editorial analysis remain isolated from Market Signal, Price, Trade, Supply and Weather/Phenology calculations.",
		"Nachrichten und redaktionelle Analysen bleiben von Berechnungen zu Marktsignal, Preis, Handel, Angebot und Wetter/Phänologie getrennt.",
		"Les actualités et les analyses éditoriales restent distinctes des calculs de signal de marché, de prix, de commerce, d’offre et de météo/phénologie.",
		"Las noticias y los análisis editoriales se mantienen separados de los cálculos de señal de mercado, precio, comercio, oferta y meteorología/fenología.",
		"Notizie e analisi editoriali restano separate dai calcoli su segnale di mercato, prezzi, scambi, offerta e meteo/fenologia."
	],
	[
		"Only approved discovery fields are public. Company identity, contacts and supporting documents remain private. SeedTrade is not a payment intermediary or contractual party.",
		"Nur freigegebene Angaben zur Suche sind öffentlich. Unternehmensidentität, Kontakte und Nachweise bleiben vertraulich. SeedTrade ist weder Zahlungsdienstleister noch Vertragspartei.",
		"Seuls les champs de recherche approuvés sont publics. L’identité des entreprises, les contacts et les justificatifs restent privés. SeedTrade n’est ni intermédiaire de paiement ni partie contractante.",
		"Solo se publican los campos de búsqueda aprobados. La identidad de la empresa, los contactos y los justificantes siguen siendo privados. SeedTrade no es intermediario de pago ni parte contractual.",
		"Sono pubblici soltanto i campi approvati per la ricerca. Identità aziendali, contatti e documenti di supporto restano riservati. SeedTrade non è intermediario di pagamento né parte contrattuale."
	],
	[
		"Only verified active listings and approved public fields appear here. Company identity, contacts and supporting documents remain private.",
		"Hier erscheinen nur verifizierte aktive Angebote und freigegebene öffentliche Angaben. Unternehmensidentität, Kontakte und Nachweise bleiben vertraulich.",
		"Seules les annonces actives vérifiées et les informations publiques approuvées figurent ici. L’identité des entreprises, les contacts et les justificatifs restent privés.",
		"Aquí solo aparecen anuncios activos verificados y campos públicos aprobados. La identidad de la empresa, los contactos y los documentos justificativos permanecen privados.",
		"Qui compaiono soltanto annunci attivi verificati e campi pubblici approvati. Identità aziendali, contatti e documenti di supporto restano riservati."
	],
	[
		"Search by common name or Latin botanical name. Representative trade unit values are not transaction quotes.",
		"Suchen Sie nach dem gebräuchlichen oder lateinischen botanischen Namen. Repräsentative Handels-Einheitswerte sind keine Transaktionsangebote.",
		"Recherchez par nom courant ou nom botanique latin. Les valeurs unitaires représentatives des échanges ne sont pas des prix de transaction.",
		"Busque por nombre común o nombre botánico latino. Los valores unitarios comerciales representativos no son cotizaciones de transacciones.",
		"Cerca per nome comune o nome botanico latino. I valori unitari rappresentativi degli scambi non sono quotazioni di transazioni."
	],
	[
		"Search by common or Latin botanical species name. Variety-level records appear when verified data becomes available.",
		"Suchen Sie nach dem gebräuchlichen oder lateinischen botanischen Artnamen. Sortendaten erscheinen, sobald verifizierte Daten verfügbar sind.",
		"Recherchez par nom courant ou nom botanique latin de l’espèce. Les données par variété apparaîtront lorsque des informations vérifiées seront disponibles.",
		"Busque por nombre común o botánico latino de la especie. Los registros por variedad aparecerán cuando haya datos verificados.",
		"Cerca per nome comune o botanico latino della specie. Le schede varietali compariranno quando saranno disponibili dati verificati."
	],
	[
		"See where verified seed trade volume and value are moving across completed periods.",
		"Sehen Sie, wie sich verifizierte Handelsvolumina und -werte für Saatgut über abgeschlossene Zeiträume verändern.",
		"Suivez l’évolution des volumes et valeurs vérifiés du commerce de semences sur des périodes complètes.",
		"Vea cómo evolucionan el volumen y el valor verificados del comercio de semillas entre períodos completos.",
		"Osserva come variano volumi e valori verificati degli scambi di sementi nei periodi completi."
	],
	[
		"Supply production/certification evidence remains separate from commodity crop area. Weather, supply, editorial content and Marketplace offers do not alter COMEXT calculations.",
		"Daten zur Saatgutproduktion und Zertifizierung bleiben von der Anbaufläche für Marktfrüchte getrennt. Wetter-, Angebots- und redaktionelle Daten sowie Marktplatzangebote verändern die COMEXT-Berechnungen nicht.",
		"Les données sur la production et la certification des semences restent distinctes des surfaces de cultures de consommation. La météo, l’offre, le contenu éditorial et les annonces ne modifient pas les calculs COMEXT.",
		"Los datos de producción y certificación de semillas se mantienen separados de la superficie de cultivos comerciales. El tiempo, la oferta, el contenido editorial y los anuncios no alteran los cálculos COMEXT.",
		"Le evidenze su produzione e certificazione delle sementi restano separate dalle superfici delle colture da consumo. Meteo, offerta, contenuti editoriali e annunci non modificano i calcoli COMEXT."
	],
	[
		"The verified Trade Pulse comparison contains 12 completed months. At least two comparable annual cycles are required before a seasonal pattern is published.",
		"Der verifizierte Handelsvergleich umfasst zwölf abgeschlossene Monate. Vor der Veröffentlichung eines saisonalen Musters sind mindestens zwei vergleichbare Jahreszyklen erforderlich.",
		"La comparaison vérifiée des échanges couvre douze mois complets. Il faut au moins deux cycles annuels comparables avant de publier un schéma saisonnier.",
		"La comparación verificada del comercio abarca doce meses completos. Se requieren al menos dos ciclos anuales comparables antes de publicar un patrón estacional.",
		"Il confronto verificato degli scambi copre dodici mesi completi. Servono almeno due cicli annuali comparabili prima di pubblicare uno schema stagionale."
	],
	[
		"This editorial content does not feed SeedTrade Market Signal, Price, Trade, Supply or Weather/Phenology calculations.",
		"Dieser redaktionelle Inhalt fließt nicht in SeedTrade-Berechnungen zu Marktsignal, Preis, Handel, Angebot oder Wetter/Phänologie ein.",
		"Ce contenu éditorial n’alimente pas les calculs SeedTrade relatifs au signal de marché, aux prix, au commerce, à l’offre ou à la météo/phénologie.",
		"Este contenido editorial no alimenta los cálculos de SeedTrade sobre señal de mercado, precios, comercio, oferta o meteorología/fenología.",
		"Questo contenuto editoriale non alimenta i calcoli SeedTrade relativi a segnale di mercato, prezzi, scambi, offerta o meteo/fenologia."
	],
	[
		"This news item is editorial context only. It does not feed Market Signal or any quantitative engine.",
		"Diese Nachricht dient nur dem redaktionellen Kontext. Sie fließt weder in das Marktsignal noch in quantitative Berechnungen ein.",
		"Cette actualité apporte uniquement un contexte éditorial. Elle n’alimente ni le signal de marché ni aucun calcul quantitatif.",
		"Esta noticia solo aporta contexto editorial. No alimenta la señal de mercado ni ningún cálculo cuantitativo.",
		"Questa notizia offre soltanto un contesto editoriale. Non alimenta il segnale di mercato né alcun calcolo quantitativo."
	],
	[
		"This workflow is built for controlled testing but is not activated for public submission until production authentication and managed private persistence are approved.",
		"Dieser Ablauf ist für kontrollierte Tests vorbereitet, wird aber erst nach Freigabe der produktiven Authentifizierung und der verwalteten privaten Speicherung öffentlich aktiviert.",
		"Ce parcours est conçu pour des tests contrôlés, mais les soumissions publiques resteront désactivées jusqu’à l’approbation de l’authentification en production et du stockage privé géré.",
		"Este flujo está preparado para pruebas controladas, pero los envíos públicos seguirán desactivados hasta que se aprueben la autenticación de producción y el almacenamiento privado gestionado.",
		"Questo flusso è predisposto per test controllati, ma gli invii pubblici resteranno disattivati fino all’approvazione dell’autenticazione in produzione e dell’archiviazione privata gestita."
	],
	[
		"Trade-value YoY is shown alongside each category and is derived from verified volume and aggregate unit value.",
		"Die jährliche Veränderung des Handelswerts wird für jede Kategorie angezeigt und aus verifiziertem Volumen und aggregiertem Einheitswert abgeleitet.",
		"La variation annuelle de la valeur commerciale est indiquée pour chaque catégorie et calculée à partir du volume vérifié et de la valeur unitaire agrégée.",
		"La variación interanual del valor comercial se muestra por categoría y se deriva del volumen verificado y del valor unitario agregado.",
		"La variazione annua del valore commerciale è mostrata per ogni categoria ed è derivata dal volume verificato e dal valore unitario aggregato."
	],
	[
		"Try a common species name, Latin botanical name or variety.",
		"Versuchen Sie es mit einem gebräuchlichen Artnamen, einem lateinischen botanischen Namen oder einer Sorte.",
		"Essayez un nom courant d’espèce, un nom botanique latin ou une variété.",
		"Pruebe con un nombre común de especie, un nombre botánico latino o una variedad.",
		"Prova con un nome comune della specie, un nome botanico latino o una varietà."
	],
	[
		"Volume is verified net weight in tonnes. Trade value is the declared euro value.",
		"Das Volumen ist das verifizierte Nettogewicht in Tonnen. Der Handelswert ist der deklarierte Eurobetrag.",
		"Le volume correspond au poids net vérifié en tonnes. La valeur commerciale est le montant déclaré en euros.",
		"El volumen es el peso neto verificado en toneladas. El valor comercial es el importe declarado en euros.",
		"Il volume è il peso netto verificato in tonnellate. Il valore commerciale è l’importo dichiarato in euro."
	],
	[
		"Weather exposure across European seed-production regions may matter for establishment, development, flowering, seed filling and harvest. Production effects remain unclaimed without supporting evidence.",
		"Wetterexposition in europäischen Saatgutproduktionsregionen kann für Auflaufen, Entwicklung, Blüte, Samenfüllung und Ernte relevant sein. Auswirkungen auf die Produktion werden ohne Belege nicht behauptet.",
		"L’exposition météorologique dans les régions européennes de production de semences peut compter pour l’implantation, le développement, la floraison, le remplissage des graines et la récolte. Aucun effet sur la production n’est affirmé sans preuve.",
		"La exposición meteorológica en las regiones europeas de producción de semillas puede influir en el establecimiento, desarrollo, floración, llenado de semillas y cosecha. No se atribuyen efectos sobre la producción sin pruebas.",
		"L’esposizione meteorologica nelle regioni europee di produzione sementiera può incidere su insediamento, sviluppo, fioritura, riempimento del seme e raccolta. Non si affermano effetti sulla produzione senza evidenze a supporto."
	],
	[
		"is aggregate trade value divided by aggregate net weight in EUR/kg. Unit value is trade value ÷ net weight, not a market price or transaction quote. YoY compares the completed month with the same month one year earlier.",
		"ist der aggregierte Handelswert geteilt durch das aggregierte Nettogewicht in EUR/kg. Der Einheitswert ist Handelswert ÷ Nettogewicht, kein Marktpreis oder Transaktionsangebot. Die Veränderung zum Vorjahr vergleicht den abgeschlossenen Monat mit demselben Monat des Vorjahres.",
		"est la valeur commerciale agrégée divisée par le poids net agrégé en EUR/kg. La valeur unitaire correspond à la valeur ÷ le poids net ; ce n’est ni un prix de marché ni une offre de transaction. La comparaison annuelle porte sur le mois complet et le même mois de l’année précédente.",
		"es el valor comercial agregado dividido por el peso neto agregado en EUR/kg. El valor unitario es valor ÷ peso neto, no un precio de mercado ni una cotización de transacción. La comparación interanual enfrenta el mes completo con el mismo mes del año anterior.",
		"è il valore commerciale aggregato diviso per il peso netto aggregato in EUR/kg. Il valore unitario è valore ÷ peso netto, non un prezzo di mercato né una quotazione di transazione. Il confronto annuo riguarda il mese completo e lo stesso mese dell’anno precedente."
	],
	[
		"Language",
		"Sprache",
		"Langue",
		"Idioma",
		"Lingua"
	],
	[
		"Primary navigation",
		"Hauptnavigation",
		"Navigation principale",
		"Navegación principal",
		"Navigazione principale"
	],
	[
		"European B2B Seed Network registration",
		"Anmeldung beim europäischen B2B-Saatgutnetzwerk",
		"Inscription au réseau B2B européen des semences",
		"Registro en la red B2B europea de semillas",
		"Registrazione alla rete B2B europea delle sementi"
	],
	[
		"SeedTrade.eu home",
		"SeedTrade.eu Startseite",
		"Accueil de SeedTrade.eu",
		"Inicio de SeedTrade.eu",
		"Pagina iniziale di SeedTrade.eu"
	],
	[
		"SeedTrade.eu — European Seed Trading & Market Intelligence",
		"SeedTrade.eu — Europäischer Saatguthandel und Marktinformationen",
		"SeedTrade.eu — Commerce européen des semences et analyse du marché",
		"SeedTrade.eu — Comercio europeo de semillas e inteligencia de mercado",
		"SeedTrade.eu — Commercio europeo di sementi e intelligence di mercato"
	],
	[
		"Eligible",
		"Zulässig",
		"Admissible",
		"Apto",
		"Ammissibile"
	],
	[
		"Limited",
		"Begrenzt",
		"Limité",
		"Limitado",
		"Limitato"
	],
	[
		"The published trade observations passed the existing representative unit-value eligibility checks. Category-level unit values are derived indicators, not market prices.",
		"Die veröffentlichten Handelsbeobachtungen erfüllen die bestehenden Kriterien für repräsentative Einheitswerte. Einheitswerte auf Kategorieebene sind abgeleitete Indikatoren, keine Marktpreise.",
		"Les observations commerciales publiées satisfont aux critères existants d’admissibilité des valeurs unitaires représentatives. Les valeurs unitaires par catégorie sont des indicateurs dérivés, pas des prix de marché.",
		"Las observaciones comerciales publicadas cumplen los criterios existentes de admisibilidad de valores unitarios representativos. Los valores unitarios por categoría son indicadores derivados, no precios de mercado.",
		"Le osservazioni commerciali pubblicate superano i controlli di ammissibilità esistenti per i valori unitari rappresentativi. I valori unitari per categoria sono indicatori derivati, non prezzi di mercato."
	],
	[
		"Available observations do not meet the existing representative unit-value eligibility checks. Official trade observations may still be valid; a representative price interpretation is withheld.",
		"Die verfügbaren Beobachtungen erfüllen die bestehenden Kriterien für repräsentative Einheitswerte nicht. Amtliche Handelsbeobachtungen können dennoch gültig sein; eine repräsentative Preisinterpretation wird nicht veröffentlicht.",
		"Les observations disponibles ne satisfont pas aux critères existants d’admissibilité des valeurs unitaires représentatives. Les données commerciales officielles peuvent néanmoins être valides ; aucune interprétation de prix représentatif n’est publiée.",
		"Las observaciones disponibles no cumplen los criterios existentes para valores unitarios representativos. Los datos comerciales oficiales pueden seguir siendo válidos; no se publica una interpretación de precio representativo.",
		"Le osservazioni disponibili non soddisfano i controlli di ammissibilità esistenti per i valori unitari rappresentativi. Le osservazioni ufficiali possono comunque essere valide; non viene pubblicata un’interpretazione del prezzo rappresentativo."
	],
	[
		"The existing combined-evidence gate permits this Market Signal. It remains descriptive, not a forecast.",
		"Die bestehenden Kriterien für kombinierte Daten erlauben dieses Marktsignal. Es bleibt beschreibend und ist keine Prognose.",
		"Les critères existants relatifs aux données combinées permettent ce signal de marché. Il reste descriptif, sans valeur de prévision.",
		"Los criterios existentes de evidencia combinada permiten esta señal de mercado. Es descriptiva, no una previsión.",
		"I criteri esistenti per le evidenze combinate consentono questo segnale di mercato. Resta descrittivo, non è una previsione."
	],
	[
		"{period}, the latest completed period.",
		"{period}, der letzte abgeschlossene Zeitraum.",
		"{period}, la dernière période complète.",
		"{period}, el último período completo.",
		"{period}, l’ultimo periodo completo."
	],
	[
		"{period}, partial/unconfirmed and excluded from trend calculations.",
		"{period}, vorläufig/unbestätigt und aus Trendberechnungen ausgeschlossen.",
		"{period}, partielle/non confirmée et exclue des calculs de tendance.",
		"{period}, parcial/no confirmado y excluido de los cálculos de tendencia.",
		"{period}, parziale/non confermato ed escluso dai calcoli delle tendenze."
	],
	[
		"Completed {period}",
		"Abgeschlossen {period}",
		"Période complète {period}",
		"Período completo {period}",
		"Periodo completo {period}"
	],
	[
		"{state} activity",
		"Aktivität: {state}",
		"Activité : {state}",
		"Actividad: {state}",
		"Attività: {state}"
	],
	[
		"Latest completed period: {period}",
		"Letzter abgeschlossener Zeitraum: {period}",
		"Dernière période complète : {period}",
		"Último período completo: {period}",
		"Ultimo periodo completo: {period}"
	],
	[
		"Category-level unit values are derived indicators, not market prices.",
		"Einheitswerte auf Kategorieebene sind abgeleitete Indikatoren, keine Marktpreise.",
		"Les valeurs unitaires par catégorie sont des indicateurs dérivés, pas des prix de marché.",
		"Los valores unitarios por categoría son indicadores derivados, no precios de mercado.",
		"I valori unitari per categoria sono indicatori derivati, non prezzi di mercato."
	],
	[
		"YoY compares the latest completed month with the same month one year earlier. Partial {period} is excluded from trends.",
		"Die Veränderung zum Vorjahr vergleicht den letzten abgeschlossenen Monat mit demselben Monat des Vorjahres. Der vorläufige Zeitraum {period} wird nicht in Trends berücksichtigt.",
		"La comparaison annuelle porte sur le dernier mois complet et le même mois de l’année précédente. La période partielle {period} est exclue des tendances.",
		"La comparación interanual enfrenta el último mes completo con el mismo mes del año anterior. El período parcial {period} se excluye de las tendencias.",
		"Il confronto annuo riguarda l’ultimo mese completo e lo stesso mese dell’anno precedente. Il periodo parziale {period} è escluso dalle tendenze."
	],
	[
		"price history",
		"Preisverlauf",
		"historique des prix",
		"historial de precios",
		"storico dei prezzi"
	],
	[
		"Range withheld · limited coverage",
		"Spanne nicht veröffentlicht · begrenzte Abdeckung",
		"Fourchette non publiée · couverture limitée",
		"Intervalo no publicado · cobertura limitada",
		"Intervallo non pubblicato · copertura limitata"
	],
	[
		"EU-wide direction unavailable",
		"EU-weite Entwicklung nicht verfügbar",
		"Tendance à l’échelle de l’UE indisponible",
		"Tendencia para toda la UE no disponible",
		"Tendenza a livello UE non disponibile"
	],
	[
		"Exposure only · impact unverified",
		"Nur Exposition · Auswirkungen unbestätigt",
		"Exposition seule · impact non vérifié",
		"Solo exposición · impacto no verificado",
		"Solo esposizione · impatto non verificato"
	],
	[
		"Impact evidence unavailable",
		"Keine Daten zu Auswirkungen verfügbar",
		"Données d’impact indisponibles",
		"No hay datos sobre el impacto",
		"Evidenze sull’impatto non disponibili"
	],
	[
		"Fewer than 12 completed months available",
		"Weniger als zwölf abgeschlossene Monate verfügbar",
		"Moins de douze mois complets disponibles",
		"Hay menos de doce meses completos disponibles",
		"Disponibili meno di dodici mesi completi"
	],
	[
		"Rolling chart: Fewer than 12 completed months available",
		"Gleitendes Diagramm: weniger als zwölf abgeschlossene Monate verfügbar",
		"Graphique glissant : moins de douze mois complets disponibles",
		"Gráfico móvil: hay menos de doce meses completos disponibles",
		"Grafico mobile: disponibili meno di dodici mesi completi"
	],
	[
		"No directional Market Signal is published.",
		"Es wird kein richtungsweisendes Marktsignal veröffentlicht.",
		"Aucun signal de tendance du marché n’est publié.",
		"No se publica ninguna señal direccional de mercado.",
		"Non viene pubblicato alcun segnale direzionale di mercato."
	],
	[
		"EU-wide seed-production evidence is incomplete",
		"EU-weite Daten zur Saatgutproduktion sind unvollständig",
		"les données sur la production de semences à l’échelle de l’UE sont incomplètes",
		"los datos sobre producción de semillas en toda la UE son incompletos",
		"le evidenze sulla produzione sementiera a livello UE sono incomplete"
	],
	[
		"weather exposure has no validated production impact",
		"für die Wetterexposition ist keine Auswirkung auf die Produktion validiert",
		"aucun impact sur la production n’est validé pour l’exposition météorologique",
		"no se ha validado un impacto de la exposición meteorológica en la producción",
		"non è validato alcun impatto dell’esposizione meteorologica sulla produzione"
	],
	[
		"The existing combined-evidence gate is not met.",
		"Die bestehenden Kriterien für kombinierte Daten sind nicht erfüllt.",
		"Les critères existants relatifs aux données combinées ne sont pas remplis.",
		"No se cumplen los criterios existentes de evidencia combinada.",
		"I criteri esistenti per le evidenze combinate non sono soddisfatti."
	],
	[
		"Verified trade observations remain available.",
		"Verifizierte Handelsbeobachtungen bleiben verfügbar.",
		"Les observations commerciales vérifiées restent disponibles.",
		"Las observaciones comerciales verificadas siguen disponibles.",
		"Le osservazioni commerciali verificate restano disponibili."
	],
	[
		"PUBLIC_SAFE · Eurostat COMEXT DS-045409",
		"PUBLIC_SAFE · Eurostat COMEXT DS-045409",
		"PUBLIC_SAFE · Eurostat COMEXT DS-045409",
		"PUBLIC_SAFE · Eurostat COMEXT DS-045409",
		"PUBLIC_SAFE · Eurostat COMEXT DS-045409"
	],
	[
		"PUBLIC_SAFE discovery only",
		"Nur PUBLIC_SAFE-Suche",
		"Recherche PUBLIC_SAFE uniquement",
		"Solo búsqueda PUBLIC_SAFE",
		"Solo ricerca PUBLIC_SAFE"
	],
	[
		"PUBLIC_SAFE methodology",
		"PUBLIC_SAFE-Methodik",
		"Méthodologie PUBLIC_SAFE",
		"Metodología PUBLIC_SAFE",
		"Metodologia PUBLIC_SAFE"
	],
	[
		"Commercial Confidentiality",
		"Geschäftliche Vertraulichkeit",
		"Confidentialité commerciale",
		"Confidencialidad comercial",
		"Riservatezza commerciale"
	],
	[
		"Commercially sensitive listing details and verification documents remain private by default. Limited information may be disclosed when the user authorizes it, after a confirmed introduction where necessary, or where legally required.",
		"Geschäftlich sensible Angebotsdetails und Prüfdokumente bleiben grundsätzlich vertraulich. Begrenzte Informationen können mit Zustimmung des Nutzers, bei Bedarf nach einer bestätigten Kontaktvermittlung oder aufgrund gesetzlicher Pflichten offengelegt werden.",
		"Les détails commerciaux sensibles des annonces et les justificatifs restent privés par défaut. Des informations limitées peuvent être communiquées avec l’autorisation de l’utilisateur, si nécessaire après une mise en relation confirmée, ou lorsque la loi l’exige.",
		"Los detalles comerciales sensibles de los anuncios y los documentos de verificación son privados por defecto. Puede divulgarse información limitada con autorización del usuario, cuando sea necesario tras una presentación confirmada o por obligación legal.",
		"I dettagli commerciali sensibili degli annunci e i documenti di verifica restano riservati per impostazione predefinita. Informazioni limitate possono essere divulgate con autorizzazione dell’utente, se necessario dopo un contatto confermato o quando richiesto dalla legge."
	],
	[
		"Privacy Policy (draft)",
		"Datenschutzerklärung (Entwurf)",
		"Politique de confidentialité (projet)",
		"Política de privacidad (borrador)",
		"Informativa sulla privacy (bozza)"
	],
	[
		"Personal data is processed only for stated platform purposes and subject to applicable data-protection rights. Analytics remains off until consent. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"Personenbezogene Daten werden nur für die angegebenen Plattformzwecke und unter Wahrung der geltenden Datenschutzrechte verarbeitet. Analysen bleiben bis zur Einwilligung deaktiviert. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"Les données personnelles ne sont traitées qu’aux fins déclarées de la plateforme, dans le respect des droits applicables en matière de protection des données. L’analyse d’audience reste désactivée jusqu’au consentement. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"Los datos personales solo se tratan para los fines declarados de la plataforma y conforme a los derechos de protección de datos aplicables. El análisis permanece desactivado hasta obtener consentimiento. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"I dati personali sono trattati solo per le finalità dichiarate della piattaforma e nel rispetto dei diritti applicabili in materia di protezione dei dati. Le analisi restano disattivate fino al consenso. REQUIRES_QUALIFIED_LEGAL_REVIEW."
	],
	[
		"Terms of Use (draft)",
		"Nutzungsbedingungen (Entwurf)",
		"Conditions d’utilisation (projet)",
		"Condiciones de uso (borrador)",
		"Condizioni d’uso (bozza)"
	],
	[
		"SeedTrade provides market intelligence and may facilitate introductions. It does not automatically become buyer, seller, payment intermediary or contractual party. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"SeedTrade bietet Marktinformationen und kann Kontakte vermitteln. Dadurch wird SeedTrade nicht automatisch Käufer, Verkäufer, Zahlungsdienstleister oder Vertragspartei. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"SeedTrade fournit des analyses du marché et peut faciliter les mises en relation. Il ne devient pas automatiquement acheteur, vendeur, intermédiaire de paiement ou partie contractante. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"SeedTrade ofrece inteligencia de mercado y puede facilitar contactos. No pasa automáticamente a ser comprador, vendedor, intermediario de pago ni parte contractual. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"SeedTrade fornisce intelligence di mercato e può facilitare i contatti. Non diventa automaticamente acquirente, venditore, intermediario di pagamento o parte contrattuale. REQUIRES_QUALIFIED_LEGAL_REVIEW."
	],
	[
		"Market Intelligence Disclaimer",
		"Haftungshinweis zu Marktinformationen",
		"Avertissement relatif à l’analyse du marché",
		"Aviso sobre inteligencia de mercado",
		"Avvertenza sull’intelligence di mercato"
	],
	[
		"Representative trade unit values are derived indicators, not quotes or guarantees. Evidence gaps and partial periods are shown explicitly. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"Repräsentative Handels-Einheitswerte sind abgeleitete Indikatoren, keine Angebote oder Garantien. Datenlücken und unvollständige Zeiträume werden ausdrücklich gekennzeichnet. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"Les valeurs unitaires représentatives des échanges sont des indicateurs dérivés, non des offres ni des garanties. Les lacunes de données et les périodes partielles sont clairement signalées. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"Los valores unitarios representativos del comercio son indicadores derivados, no cotizaciones ni garantías. Las lagunas de datos y los períodos parciales se indican expresamente. REQUIRES_QUALIFIED_LEGAL_REVIEW.",
		"I valori unitari rappresentativi degli scambi sono indicatori derivati, non quotazioni o garanzie. Lacune nelle evidenze e periodi parziali sono indicati esplicitamente. REQUIRES_QUALIFIED_LEGAL_REVIEW."
	],
	[
		"Latest completed month versus the same month one year earlier; categories below 100 tonnes are excluded from movers.",
		"Letzter abgeschlossener Monat gegenüber demselben Monat des Vorjahres; Kategorien unter 100 Tonnen sind von den stärksten Veränderungen ausgeschlossen.",
		"Dernier mois complet comparé au même mois de l’année précédente ; les catégories de moins de 100 tonnes sont exclues des plus fortes variations.",
		"Último mes completo frente al mismo mes del año anterior; se excluyen las categorías de menos de 100 toneladas de las mayores variaciones.",
		"Ultimo mese completo rispetto allo stesso mese dell’anno precedente; le categorie sotto le 100 tonnellate sono escluse dalle maggiori variazioni."
	],
	[
		"Data:",
		"Daten:",
		"Données :",
		"Datos:",
		"Dati:"
	],
	[
		"EU Internal Trade uses exporter-reported intra-EU dispatches; imports and exports are extra-EU flows. Unit-value ranges require at least 100 t and two verified observations per category.",
		"Für den EU-Binnenhandel werden die von Exporteuren gemeldeten innergemeinschaftlichen Versendungen verwendet; Ein- und Ausfuhren sind Extra-EU-Ströme. Spannen der Einheitswerte erfordern mindestens 100 t und zwei verifizierte Beobachtungen je Kategorie.",
		"Le commerce intra-UE utilise les expéditions déclarées par les exportateurs ; importations et exportations désignent les flux extra-UE. Les fourchettes de valeurs unitaires nécessitent au moins 100 t et deux observations vérifiées par catégorie.",
		"El comercio intra-UE utiliza los envíos declarados por los exportadores; importaciones y exportaciones son flujos extra-UE. Los intervalos de valores unitarios requieren al menos 100 t y dos observaciones verificadas por categoría.",
		"Il commercio intra-UE utilizza le spedizioni dichiarate dagli esportatori; importazioni ed esportazioni indicano flussi extra-UE. Gli intervalli dei valori unitari richiedono almeno 100 t e due osservazioni verificate per categoria."
	],
	[
		"Value",
		"Wert",
		"Valeur",
		"Valor",
		"Valore"
	],
	[
		"Rolling 12 completed months: {start} → {end}",
		"Zwölf gleitende abgeschlossene Monate: {start} → {end}",
		"Douze mois complets glissants : {start} → {end}",
		"Doce meses completos móviles: {start} → {end}",
		"Dodici mesi completi mobili: {start} → {end}"
	],
	[
		"YoY compares each completed month with the same month one year earlier. Partial {period} is excluded from this chart, trends and activity labels.",
		"Die jährliche Veränderung vergleicht jeden abgeschlossenen Monat mit demselben Monat des Vorjahres. Der vorläufige Zeitraum {period} ist aus diesem Diagramm, den Trends und Aktivitätskennzeichnungen ausgeschlossen.",
		"La comparaison annuelle porte sur chaque mois complet et le même mois de l’année précédente. La période partielle {period} est exclue de ce graphique, des tendances et des niveaux d’activité.",
		"La comparación interanual enfrenta cada mes completo con el mismo mes del año anterior. El período parcial {period} queda excluido del gráfico, las tendencias y las etiquetas de actividad.",
		"Il confronto annuo riguarda ogni mese completo e lo stesso mese dell’anno precedente. Il periodo parziale {period} è escluso dal grafico, dalle tendenze e dalle etichette di attività."
	],
	[
		"{period} is partial and excluded from trends.",
		"{period} ist vorläufig und aus Trends ausgeschlossen.",
		"{period} est partielle et exclue des tendances.",
		"{period} es parcial y se excluye de las tendencias.",
		"{period} è parziale ed escluso dalle tendenze."
	],
	[
		"{count} eligible categories",
		"{count} zulässige Kategorien",
		"{count} catégories admissibles",
		"{count} categorías aptas",
		"{count} categorie ammissibili"
	],
	[
		"Only completed months enter trends; partial {period} is excluded.",
		"Nur abgeschlossene Monate fließen in Trends ein; der vorläufige Zeitraum {period} ist ausgeschlossen.",
		"Seuls les mois complets entrent dans les tendances ; la période partielle {period} est exclue.",
		"Solo los meses completos entran en las tendencias; se excluye el período parcial {period}.",
		"Solo i mesi completi entrano nelle tendenze; il periodo parziale {period} è escluso."
	],
	[
		"EU Internal Trade",
		"EU-Binnenhandel",
		"Commerce intra-UE",
		"Comercio intra-UE",
		"Commercio intra-UE"
	],
	[
		"EU Imports",
		"EU-Einfuhren",
		"Importations de l’UE",
		"Importaciones de la UE",
		"Importazioni UE"
	],
	[
		"EU Exports",
		"EU-Ausfuhren",
		"Exportations de l’UE",
		"Exportaciones de la UE",
		"Esportazioni UE"
	],
	[
		"By volume",
		"Nach Volumen",
		"Par volume",
		"Por volumen",
		"Per volume"
	],
	[
		"By trade value",
		"Nach Handelswert",
		"Par valeur commerciale",
		"Por valor comercial",
		"Per valore commerciale"
	],
	[
		"Largest increases",
		"Stärkste Zunahmen",
		"Plus fortes hausses",
		"Mayores aumentos",
		"Maggiori aumenti"
	],
	[
		"Largest decreases",
		"Stärkste Rückgänge",
		"Plus fortes baisses",
		"Mayores descensos",
		"Maggiori cali"
	],
	[
		"FOR SALE · OFFER",
		"ZUM VERKAUF · ANGEBOT",
		"À VENDRE · OFFRE",
		"EN VENTA · OFERTA",
		"IN VENDITA · OFFERTA"
	],
	[
		"BUYING REQUEST",
		"KAUFGESUCH",
		"DEMANDE D’ACHAT",
		"SOLICITUD DE COMPRA",
		"RICHIESTA DI ACQUISTO"
	],
	[
		"View offer →",
		"Angebot ansehen →",
		"Voir l’offre →",
		"Ver oferta →",
		"Vedi l’offerta →"
	],
	[
		"View request →",
		"Gesuch ansehen →",
		"Voir la demande →",
		"Ver solicitud →",
		"Vedi la richiesta →"
	],
	[
		"Only verified ACTIVE, PUBLIC_SAFE, unexpired real listings are shown.",
		"Es werden nur verifizierte, aktive, nicht abgelaufene echte PUBLIC_SAFE-Angebote angezeigt.",
		"Seules les annonces réelles, vérifiées, actives, non expirées et PUBLIC_SAFE sont affichées.",
		"Solo se muestran anuncios reales, verificados, activos, no caducados y PUBLIC_SAFE.",
		"Sono mostrati soltanto annunci reali, verificati, attivi, non scaduti e PUBLIC_SAFE."
	],
	[
		"DEMO visualization only — these cards are not actual demand.",
		"Nur DEMO-Ansicht — diese Karten stellen keine tatsächliche Nachfrage dar.",
		"Visualisation de DÉMONSTRATION uniquement — ces fiches ne représentent aucune demande réelle.",
		"Solo visualización de DEMOSTRACIÓN — estas fichas no representan demanda real.",
		"Solo visualizzazione DIMOSTRATIVA — queste schede non rappresentano domanda reale."
	],
	[
		"Cards advance visually every 2–3 seconds; underlying listing data does not refresh every 2–3 seconds.",
		"Die Karten wechseln visuell alle 2–3 Sekunden; die zugrunde liegenden Angebotsdaten werden dabei nicht aktualisiert.",
		"Les fiches défilent visuellement toutes les 2 à 3 secondes ; les données des annonces ne sont pas actualisées à ce rythme.",
		"Las fichas avanzan visualmente cada 2–3 segundos; los datos de los anuncios no se actualizan con esa frecuencia.",
		"Le schede scorrono visivamente ogni 2–3 secondi; i dati degli annunci non vengono aggiornati a tale frequenza."
	],
	[
		"{count} ALL ACTIVE · real active listings only",
		"{count} INSGESAMT AKTIV · nur echte aktive Angebote",
		"{count} ACTIVES AU TOTAL · annonces réelles uniquement",
		"{count} ACTIVOS EN TOTAL · solo anuncios reales",
		"{count} ATTIVI IN TOTALE · solo annunci reali"
	],
	[
		"{count} BUYING REQUESTS",
		"{count} KAUFGESUCHE",
		"{count} DEMANDES D’ACHAT",
		"{count} SOLICITUDES DE COMPRA",
		"{count} RICHIESTE DI ACQUISTO"
	],
	[
		"{count} OFFERS",
		"{count} ANGEBOTE",
		"{count} OFFRES",
		"{count} OFERTAS",
		"{count} OFFERTE"
	],
	[
		"No verified production listings are active; the cards below demonstrate the architecture only.",
		"Derzeit sind keine verifizierten produktiven Angebote aktiv; die folgenden Karten zeigen nur die Funktionsweise.",
		"Aucune annonce vérifiée en production n’est active ; les fiches ci-dessous illustrent uniquement le fonctionnement.",
		"No hay anuncios de producción verificados activos; las fichas siguientes solo ilustran el funcionamiento.",
		"Non sono attivi annunci di produzione verificati; le schede sottostanti illustrano soltanto il funzionamento."
	],
	[
		"Use verified trade movement, supply evidence and crop exposure to identify commercially relevant changes. Evidence limits remain visible; unsupported conclusions stay withheld.",
		"Nutzen Sie verifizierte Handelsbewegungen, Angebotsdaten und Anbauexposition, um geschäftlich relevante Veränderungen zu erkennen. Grenzen der Daten bleiben sichtbar; unbelegte Schlussfolgerungen werden nicht veröffentlicht.",
		"Utilisez les mouvements commerciaux vérifiés, les données sur l’offre et l’exposition des cultures pour repérer les évolutions commercialement pertinentes. Les limites des données restent visibles ; aucune conclusion non étayée n’est publiée.",
		"Utilice movimientos comerciales verificados, datos sobre la oferta y exposición de los cultivos para detectar cambios de interés comercial. Las limitaciones de los datos siguen visibles; no se publican conclusiones sin respaldo.",
		"Utilizza movimenti commerciali verificati, dati sull’offerta ed esposizione delle colture per individuare variazioni rilevanti sul piano commerciale. I limiti delle evidenze restano visibili; non si pubblicano conclusioni prive di supporto."
	],
	[
		"Trade observations and representative unit-value evidence are available. Supply and validated weather-impact evidence remain incomplete; no directional Market Signal is published.",
		"Handelsbeobachtungen und repräsentative Einheitswerte sind verfügbar. Angebotsdaten und validierte Daten zu Wetterauswirkungen sind weiterhin unvollständig; es wird kein richtungsweisendes Marktsignal veröffentlicht.",
		"Les observations commerciales et les valeurs unitaires représentatives sont disponibles. Les données sur l’offre et les impacts météorologiques validés restent incomplètes ; aucun signal de tendance du marché n’est publié.",
		"Hay observaciones comerciales y valores unitarios representativos. Los datos sobre la oferta y los impactos meteorológicos validados siguen incompletos; no se publica ninguna señal direccional de mercado.",
		"Sono disponibili osservazioni commerciali e valori unitari rappresentativi. Le evidenze sull’offerta e sugli impatti meteorologici validati restano incomplete; non viene pubblicato alcun segnale direzionale di mercato."
	],
	[
		"Verified, source-linked developments for European seed professionals. Quality over quantity; dates are publication dates, not a promise of daily volume. New editorial releases are normally prepared in complete batches of four; verified history remains permanently available.",
		"Verifizierte, mit Quellen belegte Entwicklungen für Fachleute der europäischen Saatgutbranche. Qualität vor Quantität: Die Daten sind Veröffentlichungsdaten, keine Zusage täglicher Meldungen. Neue redaktionelle Veröffentlichungen werden üblicherweise in vollständigen Vierergruppen vorbereitet; verifizierte ältere Meldungen bleiben dauerhaft verfügbar.",
		"Des évolutions vérifiées et sourcées pour les professionnels européens des semences. La qualité prime sur la quantité : les dates sont celles des publications, sans engagement de volume quotidien. Les nouvelles publications sont généralement préparées par lots complets de quatre ; les archives vérifiées restent disponibles durablement.",
		"Novedades verificadas y vinculadas a sus fuentes para profesionales europeos de las semillas. Calidad antes que cantidad: las fechas son de publicación, no una promesa de noticias diarias. Las nuevas publicaciones suelen prepararse en lotes completos de cuatro; el historial verificado permanece disponible.",
		"Novità verificate e collegate alle fonti per i professionisti europei delle sementi. Qualità prima della quantità: le date sono quelle di pubblicazione, non una promessa di notizie quotidiane. Le nuove uscite sono normalmente preparate in gruppi completi di quattro; l’archivio verificato resta disponibile."
	],
	[
		"ALL",
		"ALLE",
		"TOUT",
		"TODOS",
		"TUTTI"
	],
	[
		"EVENTS",
		"VERANSTALTUNGEN",
		"ÉVÉNEMENTS",
		"EVENTOS",
		"EVENTI"
	],
	[
		"POTATOES",
		"KARTOFFELN",
		"POMMES DE TERRE",
		"PATATAS",
		"PATATE"
	],
	[
		"REGULATION",
		"REGULIERUNG",
		"RÉGLEMENTATION",
		"NORMATIVA",
		"NORMATIVA"
	],
	[
		"RESEARCH",
		"FORSCHUNG",
		"RECHERCHE",
		"INVESTIGACIÓN",
		"RICERCA"
	],
	[
		"EVENT",
		"VERANSTALTUNG",
		"ÉVÉNEMENT",
		"EVENTO",
		"EVENTO"
	],
	[
		"PARTNER INSIGHT",
		"PARTNERANALYSE",
		"ANALYSE PARTENAIRE",
		"ANÁLISIS DE SOCIO",
		"ANALISI DEL PARTNER"
	],
	[
		"SEED MARKET BRIEF",
		"SAATGUTMARKT-ÜBERBLICK",
		"POINT SUR LE MARCHÉ DES SEMENCES",
		"RESUMEN DEL MERCADO DE SEMILLAS",
		"AGGIORNAMENTO SUL MERCATO DELLE SEMENTI"
	],
	[
		"Read {title}",
		"{title} lesen",
		"Lire {title}",
		"Leer {title}",
		"Leggi {title}"
	],
	[
		"{category} editorial visual",
		"Redaktionelle Abbildung: {category}",
		"Visuel éditorial : {category}",
		"Imagen editorial: {category}",
		"Immagine editoriale: {category}"
	],
	[
		"Published",
		"Veröffentlicht",
		"Publié",
		"Publicado",
		"Pubblicato"
	],
	[
		"Partner Insight disclosure:",
		"Hinweis zur Partneranalyse:",
		"Mention relative à l’analyse partenaire :",
		"Aviso sobre el análisis de socio:",
		"Informativa sull’analisi del partner:"
	],
	[
		"source tier",
		"Quellenstufe",
		"niveau de source",
		"nivel de fuente",
		"livello della fonte"
	],
	[
		"Completed months only.",
		"Nur abgeschlossene Monate.",
		"Mois complets uniquement.",
		"Solo meses completos.",
		"Solo mesi completi."
	],
	[
		"Terms",
		"Bedingungen",
		"Conditions",
		"Condiciones",
		"Condizioni"
	],
	[
		"Species",
		"Art",
		"Espèce",
		"Especie",
		"Specie"
	],
	[
		"Seed listing",
		"Saatgutanzeige",
		"Annonce de semences",
		"Anuncio de semillas",
		"Annuncio di sementi"
	],
	[
		"Request seed",
		"Saatgut anfragen",
		"Demander des semences",
		"Solicitar semillas",
		"Richiedi sementi"
	],
	[
		"Offer seed",
		"Saatgut anbieten",
		"Proposer des semences",
		"Ofrecer semillas",
		"Offri sementi"
	],
	[
		"Filter news by crop",
		"Nach Kultur filtern",
		"Filtrer les actualités par culture",
		"Filtrar noticias por cultivo",
		"Filtra notizie per coltura"
	],
	[
		"Filter news by country or region",
		"Nach Land oder Region filtern",
		"Filtrer les actualités par pays ou région",
		"Filtrar noticias por país o región",
		"Filtra notizie per paese o regione"
	],
	[
		"Filter news by date",
		"Nach Datum filtern",
		"Filtrer les actualités par date",
		"Filtrar noticias por fecha",
		"Filtra notizie per data"
	],
	[
		"News categories",
		"Nachrichtenkategorien",
		"Catégories d’actualités",
		"Categorías de noticias",
		"Categorie delle notizie"
	],
	[
		"Species, Latin botanical name or variety",
		"Art, lateinischer botanischer Name oder Sorte",
		"Espèce, nom botanique latin ou variété",
		"Especie, nombre botánico latino o variedad",
		"Specie, nome botanico latino o varietà"
	],
	[
		"e.g. Flax, Linum usitatissimum, LS Riviera",
		"z. B. Flachs, Linum usitatissimum, LS Riviera",
		"p. ex. lin, Linum usitatissimum, LS Riviera",
		"p. ej., lino, Linum usitatissimum, LS Riviera",
		"ad es. lino, Linum usitatissimum, LS Riviera"
	],
	[
		"Price history chart",
		"Diagramm des Preisverlaufs",
		"Graphique de l’historique des prix",
		"Gráfico del historial de precios",
		"Grafico dello storico dei prezzi"
	],
	[
		"Previous market category",
		"Vorherige Marktkategorie",
		"Catégorie de marché précédente",
		"Categoría de mercado anterior",
		"Categoria di mercato precedente"
	],
	[
		"Next market category",
		"Nächste Marktkategorie",
		"Catégorie de marché suivante",
		"Categoría de mercado siguiente",
		"Categoria di mercato successiva"
	],
	[
		"Previous marketplace listing",
		"Vorheriges Marktplatzangebot",
		"Annonce précédente",
		"Anuncio anterior",
		"Annuncio precedente"
	],
	[
		"Next marketplace listing",
		"Nächstes Marktplatzangebot",
		"Annonce suivante",
		"Anuncio siguiente",
		"Annuncio successivo"
	],
	[
		"Country filter",
		"Länderfilter",
		"Filtre par pays",
		"Filtro por país",
		"Filtro per paese"
	],
	[
		"Certification filter",
		"Zertifizierungsfilter",
		"Filtre par certification",
		"Filtro por certificación",
		"Filtro per certificazione"
	],
	[
		"Status filter",
		"Statusfilter",
		"Filtre par statut",
		"Filtro por estado",
		"Filtro per stato"
	],
	[
		"Marketplace intent",
		"Marktplatzabsicht",
		"Intention sur la place de marché",
		"Interés en el mercado",
		"Finalità sul mercato"
	],
	[
		"Request contact",
		"Kontakt anfragen",
		"Demander un contact",
		"Solicitar contacto",
		"Richiedi contatto"
	],
	[
		"I'm interested",
		"Ich bin interessiert",
		"Je suis intéressé",
		"Me interesa",
		"Sono interessato"
	],
	[
		"coming next",
		"in Vorbereitung",
		"prochainement",
		"próximamente",
		"prossimamente"
	],
	[
		"Weather & Seed Risk · PUBLIC_SAFE",
		"Wetter und Saatgutrisiko · PUBLIC_SAFE",
		"Météo et risque semencier · PUBLIC_SAFE",
		"Meteorología y riesgo para las semillas · PUBLIC_SAFE",
		"Meteo e rischio sementiero · PUBLIC_SAFE"
	],
	[
		"Where SeedTrade monitors weather exposure",
		"Wo SeedTrade Wetterexposition beobachtet",
		"Où SeedTrade suit l’exposition météorologique",
		"Dónde supervisa SeedTrade la exposición meteorológica",
		"Dove SeedTrade monitora l’esposizione meteorologica"
	],
	[
		"{regions} named regions across {countries} European countries. The map identifies countries containing monitored regions; shaded national territory does not mean every location in that country is monitored.",
		"{regions} benannte Regionen in {countries} europäischen Ländern. Die Karte markiert Länder mit beobachteten Regionen; die Schattierung bedeutet nicht, dass jeder Ort des Landes überwacht wird.",
		"{regions} régions nommées dans {countries} pays européens. La carte indique les pays comportant des régions suivies ; la coloration d’un pays ne signifie pas que chaque lieu y est suivi.",
		"{regions} regiones identificadas en {countries} países europeos. El mapa señala los países con regiones supervisadas; el sombreado nacional no implica que se vigile cada lugar del país.",
		"{regions} regioni identificate in {countries} paesi europei. La mappa indica i paesi con regioni monitorate; la colorazione nazionale non significa che ogni località del paese sia monitorata."
	],
	[
		"Weather monitoring coverage",
		"Abdeckung der Wetterbeobachtung",
		"Couverture du suivi météorologique",
		"Cobertura de la supervisión meteorológica",
		"Copertura del monitoraggio meteorologico"
	],
	[
		"European coverage",
		"Europäische Abdeckung",
		"Couverture européenne",
		"Cobertura europea",
		"Copertura europea"
	],
	[
		"Europe map: {regions} monitored regions in {countries} countries; full region names follow below",
		"Europakarte: {regions} beobachtete Regionen in {countries} Ländern; vollständige Regionsnamen folgen unten",
		"Carte d’Europe : {regions} régions suivies dans {countries} pays ; les noms complets figurent ci-dessous",
		"Mapa de Europa: {regions} regiones supervisadas en {countries} países; los nombres completos figuran abajo",
		"Mappa d’Europa: {regions} regioni monitorate in {countries} paesi; i nomi completi sono riportati sotto"
	],
	[
		"Countries with monitored regions · numbers show region counts, not risk severity",
		"Länder mit beobachteten Regionen · Zahlen geben die Anzahl der Regionen an, nicht die Schwere des Risikos",
		"Pays comportant des régions suivies · les chiffres indiquent leur nombre, pas la gravité du risque",
		"Países con regiones supervisadas · las cifras indican el número de regiones, no la gravedad del riesgo",
		"Paesi con regioni monitorate · i numeri indicano il conteggio delle regioni, non la gravità del rischio"
	],
	[
		"Cartography:",
		"Kartografie:",
		"Cartographie :",
		"Cartografía:",
		"Cartografia:"
	],
	[
		"public-domain country boundaries. The canonical SeedTrade region names have no published subregional polygons or observation-point coordinates, so the map intentionally does not claim exact within-country locations.",
		"gemeinfreie Ländergrenzen. Für die SeedTrade-Regionen sind keine subregionalen Polygone oder Koordinaten von Beobachtungspunkten veröffentlicht; die Karte behauptet daher keine genauen Orte innerhalb der Länder.",
		"frontières nationales du domaine public. Aucun polygone infranational ni aucune coordonnée de point d’observation n’est publié pour les régions SeedTrade ; la carte ne prétend donc pas localiser précisément les zones au sein des pays.",
		"fronteras nacionales de dominio público. No se han publicado polígonos subregionales ni coordenadas de puntos de observación para las regiones SeedTrade; por ello, el mapa no indica ubicaciones exactas dentro de cada país.",
		"confini nazionali di pubblico dominio. Per le regioni SeedTrade non sono pubblicati poligoni subregionali né coordinate dei punti di osservazione; la mappa non pretende quindi di indicare posizioni precise all’interno dei paesi."
	],
	[
		"What the coverage means",
		"Bedeutung der Abdeckung",
		"Signification de la couverture",
		"Qué significa la cobertura",
		"Cosa indica la copertura"
	],
	[
		"Monitored region",
		"Beobachtete Region",
		"Région suivie",
		"Región supervisada",
		"Regione monitorata"
	],
	[
		"A named geographic unit in the SeedTrade weather configuration; {count} are listed below.",
		"Eine benannte geografische Einheit in der SeedTrade-Wetterkonfiguration; {count} sind unten aufgeführt.",
		"Une unité géographique nommée dans la configuration météo de SeedTrade ; {count} sont répertoriées ci-dessous.",
		"Una unidad geográfica identificada en la configuración meteorológica de SeedTrade; se enumeran {count} abajo.",
		"Un’unità geografica identificata nella configurazione meteo di SeedTrade; {count} sono elencate sotto."
	],
	[
		"Weather observation",
		"Wetterbeobachtung",
		"Observation météorologique",
		"Observación meteorológica",
		"Osservazione meteorologica"
	],
	[
		"Open-Meteo descriptive weather snapshot dated",
		"Beschreibender Open-Meteo-Wetterstand vom",
		"Instantané météorologique descriptif Open-Meteo daté du",
		"Resumen meteorológico descriptivo de Open-Meteo del",
		"Riepilogo meteorologico descrittivo Open-Meteo del"
	],
	[
		"This is a shared dataset date, not a per-region update timestamp.",
		"Dies ist das Datum des gemeinsamen Datensatzes, kein Aktualisierungszeitpunkt je Region.",
		"Il s’agit de la date du jeu de données commun, pas d’un horodatage de mise à jour par région.",
		"Esta es la fecha del conjunto de datos común, no la fecha de actualización de cada región.",
		"Questa è la data del dataset condiviso, non la data di aggiornamento di ogni regione."
	],
	[
		"Validated seed-production impact",
		"Validierte Auswirkung auf die Saatgutproduktion",
		"Impact validé sur la production de semences",
		"Impacto validado en la producción de semillas",
		"Impatto validato sulla produzione sementiera"
	],
	[
		"Unavailable. Weather exposure and preliminary crop-stage context do not establish a change in certified-seed output or supply.",
		"Nicht verfügbar. Wetterexposition und vorläufige Informationen zum Entwicklungsstadium belegen keine Veränderung von Produktion oder Angebot zertifizierten Saatguts.",
		"Indisponible. L’exposition météorologique et les indications préliminaires sur le stade des cultures ne permettent pas d’établir une variation de la production ou de l’offre de semences certifiées.",
		"No disponible. La exposición meteorológica y el contexto preliminar de las fases del cultivo no prueban cambios en la producción u oferta de semilla certificada.",
		"Non disponibile. L’esposizione meteorologica e il contesto preliminare sugli stadi colturali non dimostrano variazioni nella produzione o nell’offerta di sementi certificate."
	],
	[
		"Model: preliminary rule-based; evidence status: limited. No region-level crop or phenology values are published in this PUBLIC_SAFE dataset.",
		"Modell: vorläufig, regelbasiert; Evidenzstatus: begrenzt. In diesem PUBLIC_SAFE-Datensatz werden keine regionalen Kultur- oder Phänologiewerte veröffentlicht.",
		"Modèle : préliminaire, fondé sur des règles ; niveau de preuve : limité. Aucune valeur culturale ou phénologique par région n’est publiée dans ce jeu de données PUBLIC_SAFE.",
		"Modelo: preliminar y basado en reglas; estado de la evidencia: limitado. Este conjunto PUBLIC_SAFE no publica valores de cultivo ni fenología por región.",
		"Modello: preliminare, basato su regole; stato delle evidenze: limitato. Questo dataset PUBLIC_SAFE non pubblica valori colturali o fenologici per regione."
	],
	[
		"Canonical monitored regions",
		"Festgelegte beobachtete Regionen",
		"Régions suivies de référence",
		"Regiones supervisadas de referencia",
		"Regioni monitorate di riferimento"
	],
	[
		"All {count} regions",
		"Alle {count} Regionen",
		"Les {count} régions",
		"Las {count} regiones",
		"Tutte le {count} regioni"
	],
	[
		"{date} shared weather snapshot",
		"Gemeinsamer Wetterstand vom {date}",
		"Instantané météo commun du {date}",
		"Resumen meteorológico común del {date}",
		"Riepilogo meteo condiviso del {date}"
	],
	[
		"Region names and countries: SeedTrade PUBLIC_SAFE weather configuration. Individual monitored crops, phenology stages and observation timestamps are not available in the published regional records.",
		"Regionsnamen und Länder: SeedTrade PUBLIC_SAFE-Wetterkonfiguration. Einzelne beobachtete Kulturen, phänologische Stadien und Beobachtungszeitpunkte sind in den veröffentlichten Regionsdatensätzen nicht verfügbar.",
		"Noms des régions et pays : configuration météo PUBLIC_SAFE de SeedTrade. Les cultures suivies, stades phénologiques et horodatages d’observation individuels ne figurent pas dans les données régionales publiées.",
		"Nombres de regiones y países: configuración meteorológica PUBLIC_SAFE de SeedTrade. Los registros regionales publicados no contienen cultivos supervisados, fases fenológicas ni fechas de observación individuales.",
		"Nomi delle regioni e paesi: configurazione meteo PUBLIC_SAFE di SeedTrade. Le colture monitorate, gli stadi fenologici e gli orari di osservazione individuali non sono disponibili nei dati regionali pubblicati."
	],
	[
		"Official Eurostat COMEXT DS-045409 observations are validated, normalized and published only after the SeedTrade evidence gates pass. The latest completed period is {completed}; the available {partial} partial period is excluded from trends.",
		"Amtliche Eurostat-COMEXT-Beobachtungen DS-045409 werden erst nach Validierung, Normalisierung und Bestehen der SeedTrade-Evidenzkriterien veröffentlicht. Der letzte abgeschlossene Zeitraum ist {completed}; der verfügbare vorläufige Zeitraum {partial} wird aus Trends ausgeschlossen.",
		"Les observations officielles Eurostat COMEXT DS-045409 ne sont validées, normalisées et publiées qu’après satisfaction des critères de preuve SeedTrade. La dernière période complète est {completed} ; la période partielle disponible {partial} est exclue des tendances.",
		"Las observaciones oficiales Eurostat COMEXT DS-045409 se validan, normalizan y publican solo tras superar los criterios de evidencia de SeedTrade. El último período completo es {completed}; el período parcial disponible {partial} se excluye de las tendencias.",
		"Le osservazioni ufficiali Eurostat COMEXT DS-045409 sono validate, normalizzate e pubblicate solo dopo il superamento dei criteri di evidenza SeedTrade. L’ultimo periodo completo è {completed}; il periodo parziale disponibile {partial} è escluso dalle tendenze."
	],
	[
		"The range is a category-level trade indicator, not a market price.",
		"Die Spanne ist ein Handelsindikator auf Kategorieebene, kein Marktpreis.",
		"La fourchette est un indicateur commercial par catégorie, pas un prix de marché.",
		"El intervalo es un indicador comercial por categoría, no un precio de mercado.",
		"L’intervallo è un indicatore commerciale per categoria, non un prezzo di mercato."
	],
	[
		"Trade Activity is deterministic: HIGH when volume YoY is at least +15%, LOW when it is at most −15%, and NORMAL otherwise. At least 20 observations and six eligible CN codes are required in both months; otherwise no activity label is published. Activity is descriptive, not a forecast, recommendation or trading advice.",
		"Die Handelsaktivität wird regelbasiert bestimmt: HOCH bei mindestens +15 % Volumenveränderung zum Vorjahr, NIEDRIG bei höchstens −15 %, sonst NORMAL. Für beide Monate sind mindestens 20 Beobachtungen und sechs zulässige KN-Codes erforderlich; andernfalls wird keine Aktivitätskennzeichnung veröffentlicht. Die Aktivität ist beschreibend, keine Prognose oder Handelsempfehlung.",
		"L’activité commerciale suit des règles déterministes : ÉLEVÉE si la variation annuelle du volume atteint au moins +15 %, FAIBLE si elle est au plus de −15 %, NORMALE sinon. Il faut au moins 20 observations et six codes NC admissibles pour chacun des deux mois ; sinon aucun niveau d’activité n’est publié. Cette description n’est ni une prévision ni un conseil commercial.",
		"La actividad comercial se determina por reglas: ALTA si el volumen interanual aumenta al menos un 15 %, BAJA si disminuye un 15 % o más y NORMAL en los demás casos. Se requieren al menos 20 observaciones y seis códigos NC aptos en ambos meses; de lo contrario no se publica etiqueta de actividad. Es descriptiva, no una previsión ni una recomendación comercial.",
		"L’attività commerciale segue regole deterministiche: ALTA con variazione annua del volume di almeno +15 %, BASSA con variazione di −15 % o inferiore, NORMALE negli altri casi. Servono almeno 20 osservazioni e sei codici NC ammissibili in entrambi i mesi; altrimenti non viene pubblicata un’etichetta di attività. È descrittiva, non una previsione né un consiglio commerciale."
	],
	[
		"EU internal trade uses exporter-reported dispatches only, preventing mirror import declarations from being counted a second time.",
		"Der EU-Binnenhandel verwendet nur von Exporteuren gemeldete Versendungen, sodass gespiegelte Einfuhrmeldungen nicht doppelt gezählt werden.",
		"Le commerce intra-UE utilise uniquement les expéditions déclarées par les exportateurs, évitant de compter une seconde fois les déclarations d’importation correspondantes.",
		"El comercio intra-UE utiliza solo los envíos declarados por los exportadores, evitando contar por segunda vez las declaraciones espejo de importación.",
		"Il commercio intra-UE utilizza soltanto le spedizioni dichiarate dagli esportatori, evitando di conteggiare una seconda volta le corrispondenti dichiarazioni d’importazione."
	],
	[
		"Representative species-level unit values retain the established outlier and low-volume controls. Marketplace context is shown only where one verified species mapping exists; ambiguous or unsupported categories fail closed.",
		"Repräsentative Einheitswerte auf Artebene behalten die bestehenden Ausreißer- und Mindestvolumenkontrollen bei. Marktplatzkontext wird nur bei einer eindeutigen verifizierten Artzuordnung angezeigt; mehrdeutige oder unbelegte Kategorien werden ausgeschlossen.",
		"Les valeurs unitaires représentatives par espèce conservent les contrôles existants sur les valeurs aberrantes et les faibles volumes. Le contexte de la place de marché n’est affiché que si une correspondance d’espèce vérifiée existe ; les catégories ambiguës ou non étayées sont exclues.",
		"Los valores unitarios representativos por especie mantienen los controles existentes de valores atípicos y bajo volumen. El contexto del mercado solo aparece cuando existe una asignación verificada a una especie; las categorías ambiguas o sin respaldo se excluyen.",
		"I valori unitari rappresentativi per specie mantengono i controlli esistenti su valori anomali e bassi volumi. Il contesto di mercato è mostrato solo con una corrispondenza verificata per una specie; categorie ambigue o non supportate vengono escluse."
	],
	[
		"normalized source SHA256",
		"normalisierte Quelle SHA256",
		"source normalisée SHA256",
		"fuente normalizada SHA256",
		"fonte normalizzata SHA256"
	],
	[
		"{count} eligible completed-period observations used.",
		"{count} zulässige Beobachtungen aus abgeschlossenen Zeiträumen verwendet.",
		"{count} observations admissibles de périodes complètes utilisées.",
		"Se utilizaron {count} observaciones aptas de períodos completos.",
		"Utilizzate {count} osservazioni ammissibili di periodi completi."
	],
	[
		"Exporter-reported dispatches where both reporter and partner are EU-27 members; each reported export flow is counted once and mirror import declarations are excluded.",
		"Von Exporteuren gemeldete Versendungen, bei denen Melder und Partner EU-27-Mitglieder sind; jeder Ausfuhrstrom wird einmal gezählt, gespiegelte Einfuhrmeldungen werden ausgeschlossen.",
		"Expéditions déclarées par les exportateurs lorsque le déclarant et le partenaire sont membres de l’UE-27 ; chaque flux d’exportation est compté une fois et les déclarations d’importation correspondantes sont exclues.",
		"Envíos declarados por exportadores cuando declarante y socio pertenecen a la UE-27; cada flujo de exportación se cuenta una vez y se excluyen las declaraciones espejo de importación.",
		"Spedizioni dichiarate dagli esportatori quando dichiarante e partner appartengono all’UE-27; ogni flusso di esportazione è contato una volta e le dichiarazioni d’importazione speculari sono escluse."
	],
	[
		"Reporter-declared EU-27 imports from partners outside the EU-27; EU internal movements and aggregate/special partner codes are excluded.",
		"Von Meldern deklarierte Einfuhren der EU-27 aus Ländern außerhalb der EU-27; innergemeinschaftliche Bewegungen sowie aggregierte und besondere Partnercodes sind ausgeschlossen.",
		"Importations de l’UE-27 déclarées par les pays déclarants en provenance de partenaires hors UE-27 ; les mouvements intra-UE et les codes de partenaires agrégés ou spéciaux sont exclus.",
		"Importaciones de la UE-27 declaradas por los países informantes desde socios externos a la UE-27; se excluyen movimientos intra-UE y códigos de socio agregados o especiales.",
		"Importazioni dell’UE-27 dichiarate dai paesi dichiaranti da partner esterni all’UE-27; sono esclusi i movimenti intra-UE e i codici partner aggregati o speciali."
	],
	[
		"Reporter-declared EU-27 exports to partners outside the EU-27; EU internal movements and aggregate/special partner codes are excluded.",
		"Von Meldern deklarierte Ausfuhren der EU-27 an Länder außerhalb der EU-27; innergemeinschaftliche Bewegungen sowie aggregierte und besondere Partnercodes sind ausgeschlossen.",
		"Exportations de l’UE-27 déclarées par les pays déclarants vers des partenaires hors UE-27 ; les mouvements intra-UE et les codes de partenaires agrégés ou spéciaux sont exclus.",
		"Exportaciones de la UE-27 declaradas por los países informantes hacia socios externos a la UE-27; se excluyen movimientos intra-UE y códigos de socio agregados o especiales.",
		"Esportazioni dell’UE-27 dichiarate dai paesi dichiaranti verso partner esterni all’UE-27; sono esclusi i movimenti intra-UE e i codici partner aggregati o speciali."
	],
	[
		"Extra-EU exports minus extra-EU imports for the same eligible seed CN scope and completed month.",
		"Extra-EU-Ausfuhren minus Extra-EU-Einfuhren für denselben zulässigen KN-Saatgutbereich und abgeschlossenen Monat.",
		"Exportations extra-UE moins importations extra-UE pour le même périmètre admissible de codes NC de semences et le même mois complet.",
		"Exportaciones extra-UE menos importaciones extra-UE para el mismo ámbito admisible de códigos NC de semillas y el mismo mes completo.",
		"Esportazioni extra-UE meno importazioni extra-UE per lo stesso ambito ammissibile di codici NC delle sementi e lo stesso mese completo."
	],
	[
		"Category-level aggregate for the same completed month; at least 100 tonnes and 2 verified observations with positive net weight and trade value. Review-only, ambiguous and partial-period rows are excluded.",
		"Aggregat auf Kategorieebene für denselben abgeschlossenen Monat; mindestens 100 Tonnen und zwei verifizierte Beobachtungen mit positivem Nettogewicht und Handelswert. Prüf-, mehrdeutige und vorläufige Datensätze sind ausgeschlossen.",
		"Agrégat par catégorie pour le même mois complet ; au moins 100 tonnes et deux observations vérifiées avec poids net et valeur commerciale positifs. Les lignes à examiner, ambiguës ou de périodes partielles sont exclues.",
		"Agregado por categoría para el mismo mes completo; al menos 100 toneladas y dos observaciones verificadas con peso neto y valor comercial positivos. Se excluyen registros sujetos a revisión, ambiguos o de períodos parciales.",
		"Aggregato per categoria per lo stesso mese completo; almeno 100 tonnellate e due osservazioni verificate con peso netto e valore commerciale positivi. Sono escluse le righe da verificare, ambigue o relative a periodi parziali."
	],
	[
		"Only CN codes already approved for the PUBLIC_SAFE market dataset and normalized rows marked VERIFIED are included; unresolved or review-only mappings are excluded.",
		"Enthalten sind nur bereits für den PUBLIC_SAFE-Marktdatensatz freigegebene KN-Codes und normalisierte, als VERIFIED markierte Datensätze; ungeklärte oder nur zur Prüfung vorgesehene Zuordnungen sind ausgeschlossen.",
		"Seuls les codes NC déjà approuvés pour le jeu de données PUBLIC_SAFE et les lignes normalisées marquées VERIFIED sont inclus ; les correspondances non résolues ou à examiner sont exclues.",
		"Solo se incluyen códigos NC ya aprobados para el conjunto de mercado PUBLIC_SAFE y registros normalizados marcados VERIFIED; se excluyen asignaciones sin resolver o sujetas a revisión.",
		"Sono inclusi solo codici NC già approvati per il dataset di mercato PUBLIC_SAFE e righe normalizzate contrassegnate VERIFIED; le corrispondenze irrisolte o da verificare sono escluse."
	],
	[
		"YoY",
		"ggü. Vorjahr",
		"sur un an",
		"interanual",
		"su base annua"
	],
	[
		"HIGH",
		"HOCH",
		"ÉLEVÉE",
		"ALTA",
		"ALTA"
	],
	[
		"LOW",
		"NIEDRIG",
		"FAIBLE",
		"BAJA",
		"BASSA"
	],
	[
		"NORMAL",
		"NORMAL",
		"NORMALE",
		"NORMAL",
		"NORMALE"
	],
	[
		"internal trade",
		"Binnenhandel",
		"commerce interne",
		"comercio interno",
		"commercio interno"
	],
	[
		"{count} named regions · not nationwide coverage",
		"{count} benannte Regionen · keine landesweite Abdeckung",
		"{count} régions nommées · pas de couverture nationale",
		"{count} regiones identificadas · sin cobertura nacional completa",
		"{count} regioni identificate · nessuna copertura nazionale completa"
	],
	[
		"Weather & Seed Risk",
		"Wetter und Saatgutrisiko",
		"Météo et risque semencier",
		"Meteorología y riesgo para las semillas",
		"Meteo e rischio sementiero"
	],
	[
		"EU internal trade context",
		"Kontext des EU-Binnenhandels",
		"Contexte du commerce intra-UE",
		"Contexto del comercio intra-UE",
		"Contesto del commercio intra-UE"
	],
	[
		"context only, not an offer valuation",
		"nur Kontext, keine Angebotsbewertung",
		"contexte uniquement, pas une évaluation de l’offre",
		"solo contexto, no valoración de la oferta",
		"solo contesto, non valutazione dell’offerta"
	],
	[
		"EU internal seed trade volume was {change} YoY in {period}.",
		"Das Volumen des EU-Saatgutbinnenhandels veränderte sich in {period} um {change} gegenüber dem Vorjahr.",
		"Le volume du commerce intra-UE de semences a varié de {change} sur un an en {period}.",
		"El volumen del comercio intra-UE de semillas varió un {change} interanual en {period}.",
		"Il volume del commercio intra-UE di sementi è variato del {change} su base annua in {period}."
	],
	[
		"Extra-EU imports were {volume} YoY by volume and {value} by value.",
		"Extra-EU-Einfuhren veränderten sich um {volume} beim Volumen und um {value} beim Wert gegenüber dem Vorjahr.",
		"Les importations extra-UE ont varié de {volume} en volume et de {value} en valeur sur un an.",
		"Las importaciones extra-UE variaron un {volume} en volumen y un {value} en valor interanual.",
		"Le importazioni extra-UE sono variate del {volume} in volume e del {value} in valore su base annua."
	],
	[
		"Extra-EU exports were {volume} YoY by volume and {value} by value.",
		"Extra-EU-Ausfuhren veränderten sich um {volume} beim Volumen und um {value} beim Wert gegenüber dem Vorjahr.",
		"Les exportations extra-UE ont varié de {volume} en volume et de {value} en valeur sur un an.",
		"Las exportaciones extra-UE variaron un {volume} en volumen y un {value} en valor interanual.",
		"Le esportazioni extra-UE sono variate del {volume} in volume e del {value} in valore su base annua."
	],
	[
		"The extra-EU trade balance was {value} (exports minus imports).",
		"Der Extra-EU-Handelssaldo betrug {value} (Ausfuhren minus Einfuhren).",
		"Le solde commercial extra-UE s’élevait à {value} (exportations moins importations).",
		"El saldo comercial extra-UE fue de {value} (exportaciones menos importaciones).",
		"Il saldo commerciale extra-UE è stato di {value} (esportazioni meno importazioni)."
	],
	[
		"Monthly seed trade volume by flow",
		"Monatliches Saatguthandelsvolumen nach Strom",
		"Volume mensuel du commerce de semences par flux",
		"Volumen mensual del comercio de semillas por flujo",
		"Volume mensile degli scambi di sementi per flusso"
	],
	[
		"Monthly seed trade value by flow",
		"Monatlicher Saatguthandelswert nach Strom",
		"Valeur mensuelle du commerce de semences par flux",
		"Valor mensual del comercio de semillas por flujo",
		"Valore mensile degli scambi di sementi per flusso"
	],
	[
		"SeedTrade platform coverage",
		"Abdeckung der SeedTrade-Plattform",
		"Couverture de la plateforme SeedTrade",
		"Cobertura de la plataforma SeedTrade",
		"Copertura della piattaforma SeedTrade"
	],
	[
		"{period} recorded the highest eligible combined trade volume in the displayed period: {volume} t{change}.",
		"{period} verzeichnete im dargestellten Zeitraum das höchste zulässige kombinierte Handelsvolumen: {volume} t{change}.",
		"{period} a enregistré le plus fort volume combiné admissible de la période affichée : {volume} t{change}.",
		"{period} registró el mayor volumen comercial combinado apto del período mostrado: {volume} t{change}.",
		"{period} ha registrato il massimo volume commerciale combinato ammissibile nel periodo mostrato: {volume} t{change}."
	],
	[
		"to",
		"bis",
		"à",
		"a",
		"a"
	],
	[
		"FOR SALE",
		"ZUM VERKAUF",
		"À VENDRE",
		"EN VENTA",
		"IN VENDITA"
	],
	[
		"OFFER",
		"ANGEBOT",
		"OFFRE",
		"OFERTA",
		"OFFERTA"
	],
	[
		"RFQ",
		"KAUFGESUCH",
		"DEMANDE DE PRIX",
		"SOLICITUD DE OFERTA",
		"RICHIESTA DI OFFERTA"
	],
	[
		"DEMO RFQ",
		"DEMO-KAUFGESUCH",
		"DEMANDE DE PRIX DÉMO",
		"SOLICITUD DE OFERTA DEMO",
		"RICHIESTA DI OFFERTA DEMO"
	],
	[
		"Organic / ECO",
		"Bio / Öko",
		"Biologique / ÉCO",
		"Ecológico / ECO",
		"Biologico / ECO"
	],
	[
		"Extra-EU seed trade recorded a EUR 750,826 deficit in 2026-06. Verified trade evidence confirms the balance and flow changes, but does not support a specific supply, price or weather explanation.",
		"Der Extra-EU-Saatguthandel verzeichnete 2026-06 ein Defizit von 750.826 EUR. Verifizierte Handelsdaten bestätigen Saldo und Veränderungen der Handelsströme, belegen aber keine bestimmte Erklärung durch Angebot, Preise oder Wetter.",
		"Le commerce extra-UE de semences a enregistré un déficit de 750 826 EUR en 2026-06. Les données vérifiées confirment le solde et l’évolution des flux, mais ne permettent pas d’attribuer une cause précise à l’offre, aux prix ou à la météo.",
		"El comercio extra-UE de semillas registró un déficit de 750.826 EUR en 2026-06. Los datos comerciales verificados confirman el saldo y los cambios de los flujos, pero no respaldan una explicación concreta basada en oferta, precios o meteorología.",
		"Il commercio extra-UE di sementi ha registrato un disavanzo di 750.826 EUR nel 2026-06. I dati verificati confermano il saldo e le variazioni dei flussi, ma non supportano una spiegazione specifica legata a offerta, prezzi o meteo."
	],
	[
		"Extra-EU seed trade recorded a EUR {amount} {direction} in {period}.",
		"Der Extra-EU-Saatguthandel verzeichnete in {period} einen {direction} von {amount} EUR.",
		"Le commerce extra-UE de semences a enregistré un {direction} de {amount} EUR en {period}.",
		"El comercio extra-UE de semillas registró un {direction} de {amount} EUR en {period}.",
		"Il commercio extra-UE di sementi ha registrato un {direction} di {amount} EUR in {period}."
	],
	[
		"deficit",
		"Fehlbetrag",
		"déficit",
		"déficit",
		"disavanzo"
	],
	[
		"surplus",
		"Überschuss",
		"excédent",
		"superávit",
		"avanzo"
	],
	[
		"Verified trade evidence confirms the balance and flow changes, but does not support a specific supply, price or weather explanation.",
		"Verifizierte Handelsdaten bestätigen den Saldo und die Veränderungen der Handelsströme, belegen aber keine bestimmte Erklärung durch Angebot, Preise oder Wetter.",
		"Les données commerciales vérifiées confirment le solde et l’évolution des flux, mais ne permettent pas de conclure à une cause précise liée à l’offre, aux prix ou à la météo.",
		"Los datos comerciales verificados confirman el saldo y los cambios de los flujos, pero no respaldan una explicación concreta basada en oferta, precios o meteorología.",
		"I dati commerciali verificati confermano il saldo e le variazioni dei flussi, ma non supportano una spiegazione specifica legata a offerta, prezzi o meteo."
	],
	[
		"{count} monitored regions",
		"{count} beobachtete Regionen",
		"{count} régions suivies",
		"{count} regiones supervisadas",
		"{count} regioni monitorate"
	],
	[
		"no monitored regions shown",
		"keine beobachteten Regionen angezeigt",
		"aucune région suivie indiquée",
		"no se muestran regiones supervisadas",
		"nessuna regione monitorata indicata"
	],
	[
		"(broad CN category; species not asserted)",
		"(breite KN-Kategorie; Art nicht bestätigt)",
		"(catégorie NC large ; espèce non confirmée)",
		"(categoría NC amplia; especie no confirmada)",
		"(categoria NC ampia; specie non confermata)"
	],
	[
		"{name} — {count} monitored regions",
		"{name} — {count} beobachtete Regionen",
		"{name} — {count} régions suivies",
		"{name} — {count} regiones supervisadas",
		"{name} — {count} regioni monitorate"
	],
	[
		"{name} — no monitored regions shown",
		"{name} — keine beobachteten Regionen angezeigt",
		"{name} — aucune région suivie indiquée",
		"{name} — no se muestran regiones supervisadas",
		"{name} — nessuna regione monitorata indicata"
	],
	[
		"EU internal seed trade rolling 12-month volume",
		"Saatguthandelsvolumen innerhalb der EU über die letzten zwölf abgeschlossenen Monate",
		"Volume du commerce de semences au sein de l’UE sur les douze derniers mois complets",
		"Volumen del comercio de semillas dentro de la UE durante los últimos doce meses completos",
		"Volume degli scambi di sementi all’interno dell’UE negli ultimi dodici mesi completi"
	],
	[
		"EU internal trade, imports and exports as distinct flows",
		"EU-Binnenhandel, Einfuhren und Ausfuhren als getrennte Handelsströme",
		"Commerce intra-UE, importations et exportations présentés comme des flux distincts",
		"Comercio intra-UE, importaciones y exportaciones como flujos separados",
		"Commercio intra-UE, importazioni ed esportazioni come flussi distinti"
	],
	[
		"European geographic context: {count} monitored regions in countries highlighted on the map; country shading does not mean nationwide monitoring",
		"Geografischer Kontext in Europa: {count} beobachtete Regionen in den auf der Karte hervorgehobenen Ländern; die Einfärbung bedeutet keine landesweite Überwachung",
		"Contexte géographique européen : {count} régions suivies dans les pays indiqués sur la carte ; la coloration d’un pays ne signifie pas que tout son territoire est suivi",
		"Contexto geográfico europeo: {count} regiones supervisadas en los países destacados en el mapa; el sombreado no implica seguimiento en todo el país",
		"Contesto geografico europeo: {count} regioni monitorate nei paesi evidenziati sulla mappa; la colorazione non indica un monitoraggio dell’intero paese"
	],
	[
		"Seed multiplication fields and certification evidence shown separately from commodity crop area",
		"Saatgutvermehrungsflächen und Zertifizierungsnachweise getrennt von Anbauflächen für Konsumware",
		"Surfaces de multiplication des semences et données de certification présentées séparément des surfaces de cultures commerciales",
		"Superficies de multiplicación de semillas y datos de certificación separados de la superficie de cultivos comerciales",
		"Superfici di moltiplicazione delle sementi e dati di certificazione distinti dalle superfici delle colture commerciali"
	],
	[
		"VERIFIED",
		"VERIFIZIERT",
		"VÉRIFIÉ",
		"VERIFICADO",
		"VERIFICATO"
	],
	[
		"n/a",
		"k. A.",
		"n. d.",
		"n. d.",
		"n. d."
	],
	[
		"Alfalfa / lucerne",
		"Luzerne",
		"Luzerne",
		"Alfalfa",
		"Erba medica"
	],
	[
		"Field peas",
		"Körnererbsen",
		"Pois protéagineux",
		"Guisantes proteaginosos",
		"Pisello proteico"
	],
	[
		"Flax",
		"Lein",
		"Lin",
		"Lino",
		"Lino"
	],
	[
		"Flax / linseed for sowing",
		"Leinsaat zur Aussaat",
		"Graines de lin destinées à l’ensemencement",
		"Semillas de lino para siembra",
		"Semi di lino da semina"
	],
	[
		"Italian ryegrass",
		"Welsches Weidelgras",
		"Ray-grass d’Italie",
		"Raigrás italiano",
		"Loietto italico"
	],
	[
		"Kentucky bluegrass",
		"Wiesenrispe",
		"Pâturin des prés",
		"Poa de los prados",
		"Poa pratense"
	],
	[
		"Lupins",
		"Lupinen",
		"Lupins",
		"Altramuces",
		"Lupini"
	],
	[
		"Meadow fescue",
		"Wiesenschwingel",
		"Fétuque des prés",
		"Festuca de los prados",
		"Festuca dei prati"
	],
	[
		"Mustard seed for sowing",
		"Senfsaat zur Aussaat",
		"Graines de moutarde destinées à l’ensemencement",
		"Semillas de mostaza para siembra",
		"Semi di senape da semina"
	],
	[
		"Perennial ryegrass",
		"Deutsches Weidelgras",
		"Ray-grass anglais",
		"Raigrás perenne",
		"Loietto perenne"
	],
	[
		"Red clover",
		"Rotklee",
		"Trèfle violet",
		"Trébol rojo",
		"Trifoglio violetto"
	],
	[
		"Red fescue",
		"Rotschwingel",
		"Fétuque rouge",
		"Festuca roja",
		"Festuca rossa"
	],
	[
		"Common vetch",
		"Saatwicke",
		"Vesce commune",
		"Veza común",
		"Veccia comune"
	],
	[
		"Winter vetch",
		"Winterwicke",
		"Vesce d’hiver",
		"Veza de invierno",
		"Veccia invernale"
	],
	[
		"Caraway",
		"Kümmel",
		"Carvi",
		"Alcaravea",
		"Carvi"
	],
	[
		"Winter wheat",
		"Winterweizen",
		"Blé d’hiver",
		"Trigo de invierno",
		"Frumento invernale"
	],
	[
		"Potato",
		"Kartoffel",
		"Pomme de terre",
		"Patata",
		"Patata"
	],
	[
		"Maize",
		"Mais",
		"Maïs",
		"Maíz",
		"Mais"
	],
	[
		"1,000 kg Big Bag",
		"Big Bag mit 1.000 kg",
		"Big Bag de 1 000 kg",
		"Big Bag de 1.000 kg",
		"Big Bag da 1.000 kg"
	],
	[
		"France",
		"Frankreich",
		"France",
		"Francia",
		"Francia"
	],
	[
		"Germany",
		"Deutschland",
		"Allemagne",
		"Alemania",
		"Germania"
	],
	[
		"Italy",
		"Italien",
		"Italie",
		"Italia",
		"Italia"
	],
	[
		"Lithuania",
		"Litauen",
		"Lituanie",
		"Lituania",
		"Lituania"
	],
	[
		"Poland",
		"Polen",
		"Pologne",
		"Polonia",
		"Polonia"
	],
	[
		"Spain",
		"Spanien",
		"Espagne",
		"España",
		"Spagna"
	],
	[
		"Europe",
		"Europa",
		"Europe",
		"Europa",
		"Europa"
	],
	[
		"Northern Ireland",
		"Nordirland",
		"Irlande du Nord",
		"Irlanda del Norte",
		"Irlanda del Nord"
	],
	[
		"VALENCIA",
		"VALENCIA",
		"VALENCE",
		"VALENCIA",
		"VALENCIA"
	],
	[
		"BELGIUM",
		"BELGIEN",
		"BELGIQUE",
		"BÉLGICA",
		"BELGIO"
	],
	[
		"LITHUANIA",
		"LITAUEN",
		"LITUANIE",
		"LITUANIA",
		"LITUANIA"
	],
	[
		"EUROPE",
		"EUROPA",
		"EUROPE",
		"EUROPA",
		"EUROPA"
	],
	[
		"Please enter a valid business email address.",
		"Bitte geben Sie eine gültige geschäftliche E-Mail-Adresse ein.",
		"Veuillez saisir une adresse e-mail professionnelle valide.",
		"Introduzca una dirección de correo electrónico profesional válida.",
		"Inserisci un indirizzo e-mail aziendale valido."
	],
	[
		"Please complete this required field.",
		"Bitte füllen Sie dieses Pflichtfeld aus.",
		"Veuillez remplir ce champ obligatoire.",
		"Complete este campo obligatorio.",
		"Compila questo campo obbligatorio."
	],
	[
		"Albania",
		"Albanien",
		"Albanie",
		"Albania",
		"Albania"
	],
	[
		"Algeria",
		"Algerien",
		"Algérie",
		"Argelia",
		"Algeria"
	],
	[
		"Austria",
		"Österreich",
		"Autriche",
		"Austria",
		"Austria"
	],
	[
		"Belarus",
		"Belarus",
		"Biélorussie",
		"Bielorrusia",
		"Bielorussia"
	],
	[
		"Belgium",
		"Belgien",
		"Belgique",
		"Bélgica",
		"Belgio"
	],
	[
		"Bosnia and Herzegovina",
		"Bosnien und Herzegowina",
		"Bosnie-Herzégovine",
		"Bosnia y Herzegovina",
		"Bosnia ed Erzegovina"
	],
	[
		"Bulgaria",
		"Bulgarien",
		"Bulgarie",
		"Bulgaria",
		"Bulgaria"
	],
	[
		"Croatia",
		"Kroatien",
		"Croatie",
		"Croacia",
		"Croazia"
	],
	[
		"Cyprus",
		"Zypern",
		"Chypre",
		"Chipre",
		"Cipro"
	],
	[
		"Czechia",
		"Tschechien",
		"Tchéquie",
		"Chequia",
		"Cechia"
	],
	[
		"Denmark",
		"Dänemark",
		"Danemark",
		"Dinamarca",
		"Danimarca"
	],
	[
		"Egypt",
		"Ägypten",
		"Égypte",
		"Egipto",
		"Egitto"
	],
	[
		"Estonia",
		"Estland",
		"Estonie",
		"Estonia",
		"Estonia"
	],
	[
		"Finland",
		"Finnland",
		"Finlande",
		"Finlandia",
		"Finlandia"
	],
	[
		"Georgia",
		"Georgien",
		"Géorgie",
		"Georgia",
		"Georgia"
	],
	[
		"Greece",
		"Griechenland",
		"Grèce",
		"Grecia",
		"Grecia"
	],
	[
		"Hungary",
		"Ungarn",
		"Hongrie",
		"Hungría",
		"Ungheria"
	],
	[
		"Iceland",
		"Island",
		"Islande",
		"Islandia",
		"Islanda"
	],
	[
		"Iraq",
		"Irak",
		"Irak",
		"Irak",
		"Iraq"
	],
	[
		"Ireland",
		"Irland",
		"Irlande",
		"Irlanda",
		"Irlanda"
	],
	[
		"Israel",
		"Israel",
		"Israël",
		"Israel",
		"Israele"
	],
	[
		"Jordan",
		"Jordanien",
		"Jordanie",
		"Jordania",
		"Giordania"
	],
	[
		"Kosovo",
		"Kosovo",
		"Kosovo",
		"Kosovo",
		"Kosovo"
	],
	[
		"Latvia",
		"Lettland",
		"Lettonie",
		"Letonia",
		"Lettonia"
	],
	[
		"Lebanon",
		"Libanon",
		"Liban",
		"Líbano",
		"Libano"
	],
	[
		"Libya",
		"Libyen",
		"Libye",
		"Libia",
		"Libia"
	],
	[
		"Luxembourg",
		"Luxemburg",
		"Luxembourg",
		"Luxemburgo",
		"Lussemburgo"
	],
	[
		"Moldova",
		"Moldau",
		"Moldavie",
		"Moldavia",
		"Moldavia"
	],
	[
		"Montenegro",
		"Montenegro",
		"Monténégro",
		"Montenegro",
		"Montenegro"
	],
	[
		"Morocco",
		"Marokko",
		"Maroc",
		"Marruecos",
		"Marocco"
	],
	[
		"Netherlands",
		"Niederlande",
		"Pays-Bas",
		"Países Bajos",
		"Paesi Bassi"
	],
	[
		"North Macedonia",
		"Nordmazedonien",
		"Macédoine du Nord",
		"Macedonia del Norte",
		"Macedonia del Nord"
	],
	[
		"Northern Cyprus",
		"Nordzypern",
		"Chypre du Nord",
		"Chipre del Norte",
		"Cipro del Nord"
	],
	[
		"Norway",
		"Norwegen",
		"Norvège",
		"Noruega",
		"Norvegia"
	],
	[
		"Palestine",
		"Palästina",
		"Palestine",
		"Palestina",
		"Palestina"
	],
	[
		"Portugal",
		"Portugal",
		"Portugal",
		"Portugal",
		"Portogallo"
	],
	[
		"Republic of Serbia",
		"Republik Serbien",
		"République de Serbie",
		"República de Serbia",
		"Repubblica di Serbia"
	],
	[
		"Romania",
		"Rumänien",
		"Roumanie",
		"Rumanía",
		"Romania"
	],
	[
		"Russia",
		"Russland",
		"Russie",
		"Rusia",
		"Russia"
	],
	[
		"Saudi Arabia",
		"Saudi-Arabien",
		"Arabie saoudite",
		"Arabia Saudí",
		"Arabia Saudita"
	],
	[
		"Slovakia",
		"Slowakei",
		"Slovaquie",
		"Eslovaquia",
		"Slovacchia"
	],
	[
		"Slovenia",
		"Slowenien",
		"Slovénie",
		"Eslovenia",
		"Slovenia"
	],
	[
		"Sweden",
		"Schweden",
		"Suède",
		"Suecia",
		"Svezia"
	],
	[
		"Switzerland",
		"Schweiz",
		"Suisse",
		"Suiza",
		"Svizzera"
	],
	[
		"Syria",
		"Syrien",
		"Syrie",
		"Siria",
		"Siria"
	],
	[
		"Tunisia",
		"Tunesien",
		"Tunisie",
		"Túnez",
		"Tunisia"
	],
	[
		"Turkey",
		"Türkei",
		"Turquie",
		"Turquía",
		"Turchia"
	],
	[
		"Ukraine",
		"Ukraine",
		"Ukraine",
		"Ucrania",
		"Ucraina"
	],
	[
		"United Kingdom",
		"Vereinigtes Königreich",
		"Royaume-Uni",
		"Reino Unido",
		"Regno Unito"
	],
	[
		"No new verified assessment",
		"Keine neue verifizierte Bewertung",
		"Aucune nouvelle analyse vérifiée",
		"No hay una nueva evaluación verificada",
		"Nessuna nuova valutazione verificata"
	],
	[
		"Four editorial streams, reviewed public evidence and a permanent archive. New articles are published when information changes meaningfully; daily checking does not imply daily publication.",
		"Vier redaktionelle Themenbereiche, geprüfte öffentliche Belege und ein dauerhaftes Archiv. Neue Beiträge erscheinen bei wesentlichen Änderungen; eine tägliche Prüfung bedeutet keine tägliche Veröffentlichung.",
		"Quatre rubriques éditoriales, des sources publiques vérifiées et des archives permanentes. De nouveaux articles paraissent lorsque les informations évoluent sensiblement ; une veille quotidienne ne signifie pas une publication quotidienne.",
		"Cuatro líneas editoriales, fuentes públicas verificadas y un archivo permanente. Se publican nuevos artículos cuando la información cambia de forma significativa; la revisión diaria no implica una publicación diaria.",
		"Quattro filoni editoriali, evidenze pubbliche verificate e un archivio permanente. I nuovi articoli vengono pubblicati quando le informazioni cambiano in modo significativo; il monitoraggio quotidiano non implica una pubblicazione quotidiana."
	],
	[
		"News streams",
		"Nachrichtenthemen",
		"Rubriques",
		"Líneas editoriales",
		"Filoni editoriali"
	],
	[
		"All history",
		"Gesamtes Archiv",
		"Toutes les archives",
		"Todo el archivo",
		"Archivio completo"
	],
	[
		"Recent (20 days)",
		"Aktuell (20 Tage)",
		"Récent (20 jours)",
		"Recientes (20 días)",
		"Recenti (20 giorni)"
	],
	[
		"Upcoming events",
		"Kommende Veranstaltungen",
		"Événements à venir",
		"Próximos eventos",
		"Prossimi eventi"
	],
	[
		"From date",
		"Ab Datum",
		"À partir du",
		"Desde",
		"Dal"
	],
	[
		"To date",
		"Bis Datum",
		"Jusqu’au",
		"Hasta",
		"Al"
	],
	[
		"No matching verified articles",
		"Keine passenden verifizierten Beiträge",
		"Aucun article vérifié correspondant",
		"No hay artículos verificados que coincidan",
		"Nessun articolo verificato corrispondente"
	],
	[
		"Observation period",
		"Beobachtungszeitraum",
		"Période d’observation",
		"Período de observación",
		"Periodo di osservazione"
	],
	[
		"Checked",
		"Geprüft",
		"Vérifié",
		"Verificado",
		"Verificato"
	],
	[
		"Evidence",
		"Evidenz",
		"Niveau de preuve",
		"Nivel de evidencia",
		"Livello di evidenza"
	],
	[
		"Related assessments",
		"Verwandte Bewertungen",
		"Analyses associées",
		"Evaluaciones relacionadas",
		"Valutazioni correlate"
	],
	[
		"Previous assessment",
		"Vorherige Bewertung",
		"Analyse précédente",
		"Evaluación anterior",
		"Valutazione precedente"
	],
	[
		"SUPPORTED",
		"Gestützt",
		"Étayé",
		"Respaldado",
		"Supportato"
	],
	[
		"INDICATIVE",
		"Hinweis",
		"Indicatif",
		"Indicativo",
		"Indicativo"
	],
	[
		"SCENARIO",
		"Szenario",
		"Scénario",
		"Escenario",
		"Scenario"
	],
	[
		"INSUFFICIENT",
		"Unzureichende Evidenz",
		"Preuves insuffisantes",
		"Evidencia insuficiente",
		"Evidenze insufficienti"
	],
	[
		"OFFICIAL_DATA",
		"Amtliche Daten",
		"Données officielles",
		"Datos oficiales",
		"Dati ufficiali"
	],
	[
		"RESEARCH_ADVISORY",
		"Forschung / Beratung",
		"Recherche / conseil",
		"Investigación / asesoramiento",
		"Ricerca / consulenza"
	],
	[
		"INDUSTRY_SIGNAL",
		"Branchensignal",
		"Signal de la filière",
		"Señal del sector",
		"Segnale del settore"
	],
	[
		"COMPANY_SIGNAL",
		"Unternehmenssignal",
		"Signal d’entreprise",
		"Señal de empresa",
		"Segnale aziendale"
	],
	[
		"SPECIALIST_MEDIA",
		"Fachmedien",
		"Presse spécialisée",
		"Medios especializados",
		"Media specializzati"
	],
	[
		"CONFIRMED",
		"Bestätigt",
		"Confirmé",
		"Confirmado",
		"Confermato"
	],
	[
		"ANNOUNCED",
		"Angekündigt",
		"Annoncé",
		"Anunciado",
		"Annunciato"
	],
	[
		"CHANGED",
		"Geändert",
		"Modifié",
		"Modificado",
		"Modificato"
	],
	[
		"CANCELLED",
		"Abgesagt",
		"Annulé",
		"Cancelado",
		"Annullato"
	],
	[
		"COMPLETED",
		"Abgeschlossen",
		"Terminé",
		"Finalizado",
		"Concluso"
	],
	[
		"PUBLIC_SOURCE",
		"Öffentliche Quelle",
		"Source publique",
		"Fuente pública",
		"Fonte pubblica"
	],
	[
		"OFFICIAL_SOURCE",
		"Amtliche Quelle",
		"Source officielle",
		"Fuente oficial",
		"Fonte ufficiale"
	],
	[
		"AGRONOMY",
		"Agronomie",
		"Agronomie",
		"Agronomía",
		"Agronomia"
	],
	[
		"CERTIFICATION",
		"Zertifizierung",
		"Certification",
		"Certificación",
		"Certificazione"
	],
	[
		"EU Weather",
		"EU Weather",
		"EU Weather",
		"EU Weather",
		"EU Weather"
	],
	[
		"EU Agronomist",
		"EU Agronomist",
		"EU Agronomist",
		"EU Agronomist",
		"EU Agronomist"
	],
	[
		"EU Trade Market",
		"EU Trade Market",
		"EU Trade Market",
		"EU Trade Market",
		"EU Trade Market"
	],
	[
		"EU Events",
		"EU Events",
		"EU Events",
		"EU Events",
		"EU Events"
	],
	[
		"Seed Production Intelligence",
		"Saatgutproduktionsanalyse",
		"Analyse de la production de semences",
		"Inteligencia de producción de semillas",
		"Intelligence della produzione sementiera"
	],
	[
		"Official seed multiplication and certification evidence by species, country, metric and year. Seed-production area is distinct from commodity crop area.",
		"Amtliche Vermehrungs- und Zertifizierungsdaten nach Art, Land, Kennzahl und Jahr. Saatgutflächen sind von allgemeinen Anbauflächen getrennt.",
		"Données officielles de multiplication et de certification par espèce, pays, indicateur et année. Les surfaces semencières sont distinctes des surfaces agricoles ordinaires.",
		"Datos oficiales de multiplicación y certificación por especie, país, indicador y año. La superficie semillera es distinta de la superficie agrícola general.",
		"Dati ufficiali di moltiplicazione e certificazione per specie, paese, indicatore e anno. Le superfici sementiere sono distinte dalle superfici agricole ordinarie."
	],
	[
		"Production evidence filters",
		"Filter für Produktionsnachweise",
		"Filtres des données de production",
		"Filtros de datos de producción",
		"Filtri dei dati di produzione"
	],
	[
		"Seed production area",
		"Saatgutproduktionsfläche",
		"Surface de production de semences",
		"Superficie de producción de semillas",
		"Superficie di produzione sementiera"
	],
	[
		"Certified seed area",
		"Zertifizierte Saatgutfläche",
		"Surface semencière certifiée",
		"Superficie semillera certificada",
		"Superficie sementiera certificata"
	],
	[
		"Certified quantity",
		"Zertifizierte Menge",
		"Quantité certifiée",
		"Cantidad certificada",
		"Quantità certificata"
	],
	[
		"Country",
		"Land",
		"Pays",
		"País",
		"Paese"
	],
	[
		"Metric",
		"Kennzahl",
		"Indicateur",
		"Indicador",
		"Indicatore"
	],
	[
		"Year",
		"Jahr",
		"Année",
		"Año",
		"Anno"
	],
	[
		"All available years",
		"Alle verfügbaren Jahre",
		"Toutes les années disponibles",
		"Todos los años disponibles",
		"Tutti gli anni disponibili"
	],
	[
		"Comparable history",
		"Vergleichbare Zeitreihe",
		"Historique comparable",
		"Historial comparable",
		"Serie storica comparabile"
	],
	[
		"Any available history",
		"Alle verfügbaren Zeitreihen",
		"Tout historique disponible",
		"Cualquier historial disponible",
		"Qualsiasi serie disponibile"
	],
	[
		"At least {count} consecutive years",
		"Mindestens {count} aufeinanderfolgende Jahre",
		"Au moins {count} années consécutives",
		"Al menos {count} años consecutivos",
		"Almeno {count} anni consecutivi"
	],
	[
		"Selected evidence coverage",
		"Abdeckung der ausgewählten Daten",
		"Couverture des données sélectionnées",
		"Cobertura de los datos seleccionados",
		"Copertura dei dati selezionati"
	],
	[
		"Countries",
		"Länder",
		"Pays",
		"Países",
		"Paesi"
	],
	[
		"Canonical entities",
		"Kanonische Einheiten",
		"Entités canoniques",
		"Entidades canónicas",
		"Entità canoniche"
	],
	[
		"Observations",
		"Beobachtungen",
		"Observations",
		"Observaciones",
		"Osservazioni"
	],
	[
		"Comparable series",
		"Vergleichbare Reihen",
		"Séries comparables",
		"Series comparables",
		"Serie comparabili"
	],
	[
		"Latest data year",
		"Aktuellstes Datenjahr",
		"Dernière année disponible",
		"Último año disponible",
		"Ultimo anno disponibile"
	],
	[
		"Coverage reflects your filters. Comparable series require at least two consecutive years within the same official source scope.",
		"Die Abdeckung folgt den Filtern. Vergleichbare Reihen erfordern mindestens zwei aufeinanderfolgende Jahre mit gleichem amtlichem Erhebungsumfang.",
		"La couverture suit vos filtres. Les séries comparables exigent au moins deux années consécutives dans le même périmètre officiel.",
		"La cobertura refleja sus filtros. Las series comparables requieren al menos dos años consecutivos con el mismo alcance oficial.",
		"La copertura segue i filtri. Le serie comparabili richiedono almeno due anni consecutivi con lo stesso ambito ufficiale."
	],
	[
		"No compatible evidence for these filters",
		"Keine kompatiblen Daten für diese Filter",
		"Aucune donnée compatible avec ces filtres",
		"No hay datos compatibles con estos filtros",
		"Nessun dato compatibile con questi filtri"
	],
	[
		"Missing observations are not zero. Try another country, metric or history length.",
		"Fehlende Werte sind keine Nullwerte. Wählen Sie ein anderes Land, eine andere Kennzahl oder Zeitreihenlänge.",
		"Les données absentes ne valent pas zéro. Essayez un autre pays, indicateur ou historique.",
		"Los datos ausentes no son cero. Pruebe otro país, indicador o historial.",
		"I dati mancanti non sono zero. Provare un altro paese, indicatore o intervallo storico."
	],
	[
		"Official source scope",
		"Amtlicher Erhebungsumfang",
		"Périmètre de la source officielle",
		"Alcance de la fuente oficial",
		"Ambito della fonte ufficiale"
	],
	[
		"{count}-year comparable history available",
		"Vergleichbare Zeitreihe über {count} Jahre verfügbar",
		"Historique comparable de {count} ans disponible",
		"Historial comparable de {count} años disponible",
		"Serie comparabile di {count} anni disponibile"
	],
	[
		"Insufficient comparable history for a trend",
		"Unzureichende vergleichbare Historie für einen Trend",
		"Historique comparable insuffisant pour une tendance",
		"Historial comparable insuficiente para una tendencia",
		"Serie comparabile insufficiente per una tendenza"
	],
	[
		"Official observations; missing years are not filled",
		"Amtliche Werte; fehlende Jahre werden nicht ergänzt",
		"Données officielles ; années absentes non complétées",
		"Datos oficiales; no se rellenan los años ausentes",
		"Dati ufficiali; gli anni mancanti non sono colmati"
	],
	[
		"Points show reported values only. No interpolation or EU total.",
		"Punkte zeigen nur gemeldete Werte. Keine Interpolation und keine EU-Summe.",
		"Les points indiquent les valeurs déclarées. Aucune interpolation ni total européen.",
		"Los puntos muestran valores declarados. Sin interpolación ni total de la UE.",
		"I punti mostrano valori dichiarati. Nessuna interpolazione né totale UE."
	],
	[
		"Official observations and sources",
		"Amtliche Werte und Quellen",
		"Données et sources officielles",
		"Datos y fuentes oficiales",
		"Dati e fonti ufficiali"
	],
	[
		"Reported value",
		"Gemeldeter Wert",
		"Valeur déclarée",
		"Valor declarado",
		"Valore dichiarato"
	],
	[
		"Source and definition",
		"Quelle und Definition",
		"Source et définition",
		"Fuente y definición",
		"Fonte e definizione"
	],
	[
		"Official source",
		"Amtliche Quelle",
		"Source officielle",
		"Fuente oficial",
		"Fonte ufficiale"
	],
	[
		"Accessed",
		"Abgerufen",
		"Consulté le",
		"Consultado",
		"Consultato"
	],
	[
		"Certified quantity is not assumed to equal domestic production.",
		"Die zertifizierte Menge wird nicht mit der inländischen Produktion gleichgesetzt.",
		"La quantité certifiée n’est pas assimilée à la production nationale.",
		"La cantidad certificada no se considera equivalente a la producción nacional.",
		"La quantità certificata non è equiparata alla produzione nazionale."
	],
	[
		"Available European evidence",
		"Verfügbare europäische Daten",
		"Données européennes disponibles",
		"Datos europeos disponibles",
		"Dati europei disponibili"
	],
	[
		"National definitions are not established as equivalent. Countries are listed alphabetically, without ranking, summation or an EU-wide supply conclusion.",
		"Nationale Definitionen sind nicht als gleichwertig bestätigt. Länder erscheinen alphabetisch, ohne Rangfolge, Summierung oder EU-weite Angebotsaussage.",
		"L’équivalence des définitions nationales n’est pas établie. Les pays sont classés alphabétiquement, sans classement des valeurs, somme ni conclusion sur l’offre européenne.",
		"No se ha establecido la equivalencia de las definiciones nacionales. Los países se presentan alfabéticamente, sin clasificación por valores, suma ni conclusión sobre la oferta de la UE.",
		"L’equivalenza delle definizioni nazionali non è accertata. I paesi sono elencati alfabeticamente, senza graduatoria, somma o conclusione sull’offerta UE."
	],
	[
		"{count} consecutive years",
		"{count} aufeinanderfolgende Jahre",
		"{count} années consécutives",
		"{count} años consecutivos",
		"{count} anni consecutivi"
	],
	[
		"Coverage and limitations",
		"Abdeckung und Einschränkungen",
		"Couverture et limites",
		"Cobertura y limitaciones",
		"Copertura e limiti"
	],
	[
		"Official national reporting differs. Coverage varies by species and year; missing values are not zero. Area and certified quantity remain separate. Original certification stages, seasons and source scopes are preserved.",
		"Amtliche nationale Berichte unterscheiden sich. Die Abdeckung variiert nach Art und Jahr; fehlende Werte sind keine Nullwerte. Fläche und zertifizierte Menge bleiben getrennt. Zertifizierungsstufen, Anbausaisons und Erhebungsumfang bleiben erhalten.",
		"Les déclarations officielles nationales diffèrent. La couverture varie selon l’espèce et l’année ; les valeurs absentes ne sont pas zéro. Surfaces et quantités certifiées restent séparées. Les étapes de certification, saisons et périmètres sont conservés.",
		"Los informes oficiales nacionales difieren. La cobertura varía por especie y año; los valores ausentes no son cero. Superficies y cantidades certificadas permanecen separadas. Se conservan las etapas de certificación, temporadas y alcances originales.",
		"Le rilevazioni nazionali differiscono. La copertura varia per specie e anno; i valori mancanti non sono zero. Superfici e quantità certificate restano separate. Fasi di certificazione, stagioni e ambiti originali sono conservati."
	],
	[
		"Groups and aggregates retain their original botanical scope; canonical navigation does not permit pooling source categories.",
		"Gruppen und Aggregate behalten ihren botanischen Umfang; kanonische Navigation erlaubt keine Zusammenfassung von Quellkategorien.",
		"Les groupes et agrégats conservent leur périmètre botanique ; la navigation canonique n’autorise pas le regroupement des catégories sources.",
		"Los grupos y agregados conservan su alcance botánico; la navegación canónica no permite agrupar categorías de origen.",
		"Gruppi e aggregati conservano il loro ambito botanico; la navigazione canonica non consente di unire categorie delle fonti."
	],
	[
		"Explicit group; source scopes remain separate",
		"Explizite Gruppe; Quellumfänge bleiben getrennt",
		"Groupe explicite ; périmètres sources séparés",
		"Grupo explícito; alcances de origen separados",
		"Gruppo esplicito; ambiti delle fonti separati"
	],
	[
		"SUMMER",
		"Sommer",
		"Été",
		"Verano",
		"Estate"
	],
	[
		"WINTER",
		"Winter",
		"Hiver",
		"Invierno",
		"Inverno"
	],
	[
		"SPRING",
		"Frühjahr",
		"Printemps",
		"Primavera",
		"Primavera"
	],
	[
		"ALL",
		"Alle Saisons",
		"Toutes saisons",
		"Todas las temporadas",
		"Tutte le stagioni"
	],
	[
		"NOT_SPECIFIED",
		"Nicht angegeben",
		"Non précisé",
		"No especificado",
		"Non specificato"
	],
	[
		"UNSPECIFIED",
		"Nicht angegeben",
		"Non précisé",
		"No especificado",
		"Non specificato"
	],
	[
		"ALL_REPORTED",
		"Alle gemeldeten Kategorien",
		"Toutes catégories déclarées",
		"Todas las categorías declaradas",
		"Tutte le categorie dichiarate"
	],
	[
		"NOT_REPORTED",
		"Kategorie nicht angegeben",
		"Catégorie non déclarée",
		"Categoría no declarada",
		"Categoria non dichiarata"
	],
	[
		"applied for field certification",
		"Zur Feldanerkennung angemeldet",
		"Inscrit à la certification au champ",
		"Inscrito para certificación de campo",
		"Iscritto alla certificazione in campo"
	],
	[
		"inspected seed field",
		"Besichtigte Saatgutfläche",
		"Champ semencier inspecté",
		"Campo semillero inspeccionado",
		"Campo sementiero ispezionato"
	],
	[
		"field recognised for certified seed",
		"Für zertifiziertes Saatgut anerkannte Fläche",
		"Champ reconnu pour semences certifiées",
		"Campo reconocido para semilla certificada",
		"Campo riconosciuto per sementi certificate"
	],
	[
		"dedicated certified seed production field",
		"Spezielle zertifizierte Saatgutproduktionsfläche",
		"Champ dédié aux semences certifiées",
		"Campo dedicado a semilla certificada",
		"Campo dedicato a sementi certificate"
	],
	[
		"approved multiplication field",
		"Anerkannte Vermehrungsfläche",
		"Champ de multiplication agréé",
		"Campo de multiplicación aprobado",
		"Campo di moltiplicazione approvato"
	],
	[
		"certified lots",
		"Zertifizierte Partien",
		"Lots certifiés",
		"Lotes certificados",
		"Lotti certificati"
	],
	[
		"approved field",
		"Anerkannte Fläche",
		"Champ agréé",
		"Campo aprobado",
		"Campo approvato"
	],
	[
		"field inspected",
		"Besichtigte Fläche",
		"Champ inspecté",
		"Campo inspeccionado",
		"Campo ispezionato"
	],
	[
		"declared for certification",
		"Zur Zertifizierung deklariert",
		"Déclaré pour certification",
		"Declarado para certificación",
		"Dichiarato per certificazione"
	],
	[
		"approved certification field",
		"Anerkannte Zertifizierungsfläche",
		"Champ agréé pour certification",
		"Campo aprobado para certificación",
		"Campo approvato per certificazione"
	],
	[
		"officially confirmed seed harvest",
		"Amtlich bestätigte Saatguternte",
		"Récolte semencière officiellement confirmée",
		"Cosecha semillera confirmada oficialmente",
		"Raccolto sementiero confermato ufficialmente"
	],
	[
		"certified lots by harvest year origin unspecified",
		"Zertifizierte Partien nach Erntejahr; Herkunft nicht angegeben",
		"Lots certifiés par année de récolte ; origine non précisée",
		"Lotes certificados por año de cosecha; origen no especificado",
		"Lotti certificati per anno di raccolta; origine non specificata"
	],
	[
		"certified field including conditional",
		"Zertifizierte Fläche einschließlich bedingter Anerkennung",
		"Champ certifié, agréments conditionnels inclus",
		"Campo certificado, incluidas aprobaciones condicionales",
		"Campo certificato, comprese approvazioni condizionate"
	],
	[
		"precintado domestic origin marketed",
		"Versiegelte vermarktete Menge inländischer Herkunft",
		"Quantité commercialisée scellée d’origine nationale",
		"Cantidad precintada comercializada de origen nacional",
		"Quantità sigillata commercializzata di origine nazionale"
	],
	[
		"escaa summary field area",
		"ESCAA-Flächenübersicht",
		"Surface de la synthèse ESCAA",
		"Superficie del resumen ESCAA",
		"Superficie del riepilogo ESCAA"
	]
];
var messages = Object.fromEntries([
	"DE",
	"FR",
	"ES",
	"IT"
].map((code, index) => [code, Object.fromEntries([
	...b2bRows,
	...marketCardNameRows,
	...rows,
	...snapshotIntelligenceRows
].map((row) => [row[0], row[index + 1]]))]));
//#endregion
//#region src/i18n/languageState.mjs
var UI_LANGUAGES = Object.freeze([
	"EN",
	"DE",
	"FR",
	"ES",
	"IT"
]);
function uiLanguage(value) {
	const code = typeof value === "string" ? value.toUpperCase() : "";
	return UI_LANGUAGES.includes(code) ? code : null;
}
function languageFromUrl(href) {
	try {
		const url = new URL(href);
		return url.searchParams.getAll("lang").length === 1 ? uiLanguage(url.searchParams.get("lang")) : null;
	} catch {
		return null;
	}
}
function languageHref(href, code, origin = "https://seedtrade.eu", baseHref = origin) {
	if (typeof href !== "string" || href.startsWith("#")) return href;
	try {
		const url = new URL(href, baseHref);
		if (url.origin !== origin || !["http:", "https:"].includes(url.protocol) || url.pathname.startsWith("/legal/snapshots/") || url.pathname.startsWith("/api/")) return href;
		url.searchParams.set("lang", (uiLanguage(code) ?? "EN").toLowerCase());
		return url.pathname + url.search + url.hash;
	} catch {
		return href;
	}
}
//#endregion
//#region src/i18n/index.jsx
var languages = Object.freeze([
	{
		code: "EN",
		flag: "🇬🇧"
	},
	{
		code: "DE",
		flag: "🇩🇪"
	},
	{
		code: "FR",
		flag: "🇫🇷"
	},
	{
		code: "ES",
		flag: "🇪🇸"
	},
	{
		code: "IT",
		flag: "🇮🇹"
	}
]);
var STORAGE_KEY = "seedtrade_language";
var LanguageContext = createContext({
	language: "EN",
	setLanguage: () => {}
});
function translate(language, english, values = {}) {
	const catalog = Object.hasOwn(messages, language) ? messages[language] : null;
	return (catalog && Object.hasOwn(catalog, english) && catalog[english] ? catalog[english] : english).replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
}
function LanguageProvider({ children, initialLanguage = "EN" }) {
	const [language, setLanguage] = useState(uiLanguage(initialLanguage) ?? "EN");
	useEffect(() => {
		const restore = () => {
			let saved;
			try {
				saved = window.localStorage.getItem(STORAGE_KEY);
			} catch {}
			const code = languageFromUrl(window.location.href) ?? uiLanguage(window.history.state?.seedtradeLanguage) ?? uiLanguage(saved) ?? "EN";
			setLanguage(code);
			try {
				window.localStorage.setItem(STORAGE_KEY, code);
			} catch {}
			window.history.replaceState({
				...window.history.state,
				seedtradeLanguage: code
			}, "", window.location.pathname + window.location.search + window.location.hash);
		};
		restore();
		window.addEventListener("popstate", restore);
		return () => window.removeEventListener("popstate", restore);
	}, []);
	const selectLanguage = (code) => {
		if (!languages.some((item) => item.code === code)) return;
		setLanguage(code);
		try {
			window.localStorage.setItem(STORAGE_KEY, code);
		} catch {}
		const url = new URL(window.location.href);
		url.searchParams.set("lang", code.toLowerCase());
		window.history.replaceState({
			...window.history.state,
			seedtradeLanguage: code
		}, "", url.pathname + url.search + url.hash);
	};
	useEffect(() => {
		const navigate = (event) => {
			const anchor = event.target?.closest?.("a[href]");
			if (!anchor || anchor.hasAttribute("download") || anchor.getAttribute("href").startsWith("#")) return;
			const url = new URL(anchor.href, window.location.href);
			if (url.origin !== window.location.origin || /\.[a-z0-9]+$/i.test(url.pathname)) return;
			anchor.setAttribute("href", languageHref(anchor.getAttribute("href"), language, window.location.origin, window.location.href));
		};
		document.addEventListener("click", navigate, true);
		return () => document.removeEventListener("click", navigate, true);
	}, [language]);
	useEffect(() => {
		document.documentElement.lang = language.toLowerCase();
	}, [language]);
	return /* @__PURE__ */ jsx(LanguageContext.Provider, {
		value: {
			language,
			setLanguage: selectLanguage
		},
		children
	});
}
function useLanguage() {
	return useContext(LanguageContext);
}
function LanguageSelector({ disabled = false }) {
	const { language, setLanguage } = useLanguage();
	const t = useT();
	return /* @__PURE__ */ jsx("select", {
		className: "language-select",
		"aria-label": t("Language"),
		value: language,
		onChange: (event) => setLanguage(event.target.value),
		disabled,
		children: languages.map(({ code, flag }) => /* @__PURE__ */ jsxs("option", {
			value: code,
			children: [
				flag,
				" ",
				code
			]
		}, code))
	});
}
function useT() {
	const { language } = useLanguage();
	return (value, values) => translate(language, value, values);
}
function T({ children }) {
	return useT()(children);
}
function I18n({ text, values }) {
	return useT()(text, values);
}
//#endregion
export { languages as a, useT as c, T as i, LanguageProvider as n, translate as o, LanguageSelector as r, useLanguage as s, I18n as t };
