export const offerCountries='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
export const offerCurrencies=['EUR','USD','GBP','CHF','PLN','SEK','DKK','NOK','CZK','RON','HUF'];
export const seedCategories=['SOWING_STATUS_UNKNOWN','CERTIFIED_SOWING','NON_CERTIFIED_SOWING'];

// EU is a listing-origin region, deliberately separate from country codes.
export const offerOriginRegions=Object.freeze(['EU']);
export const offerOrigins=Object.freeze([...offerOriginRegions,...offerCountries]);
const euLabels={EN:'European Union (EU)',DE:'Europäische Union (EU)',FR:'Union européenne (EU)',ES:'Unión Europea (EU)',IT:'Unione europea (EU)'};
export function offerOriginLabel(value,language='EN'){if(value==='EU')return euLabels[language]??euLabels.EN;if(!value)return '';if(!offerCountries.includes(value))return value;try{return new Intl.DisplayNames([language.toLowerCase()],{type:'region'}).of(value)??value}catch{return value}}
