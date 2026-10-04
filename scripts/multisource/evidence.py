"""Provider separation, immutable source identities and publication gates."""
import hashlib,json
SOURCE_TYPES={'EUROSTAT_COMEXT','EU_TARIC_CN','UN_COMTRADE','GLOBALWITS','DATAMYNE','NATIONAL_CUSTOMS','OTHER_OFFICIAL'}
COMMERCIAL={'GLOBALWITS','DATAMYNE'}
REQUIRED={'SOURCE','SOURCE_TYPE','SOURCE_RECORD_ID','SOURCE_DATE','DATA_PERIOD','HS_CODE','CN_CODE','PRODUCT_DESCRIPTION','ORIGIN','DESTINATION','WEIGHT','VALUE','CURRENCY','IMPORTER','EXPORTER','SHIPMENT_COUNT','SPECIES_MAPPING','TRADE_MARKET_ENTITY_MAPPING','CONFIDENCE','PUBLIC_SAFE','PROVENANCE'}
def identity(row):
 if row['SOURCE_TYPE']=='EUROSTAT_COMEXT':
  grain=[row['DATA_PERIOD'],row['REPORTER'],row['PARTNER'],row['FLOW'],row['CN_CODE']]
 else:grain=[row['SOURCE_RECORD_ID']]
 return row['SOURCE_TYPE']+':'+hashlib.sha256(json.dumps(grain,separators=(',',':')).encode()).hexdigest()
def may_publish(row,field_scope='AGGREGATE'):
 if not REQUIRED<=row.keys() or not row['PROVENANCE'] or not row['PUBLIC_SAFE']:return False
 if row['SOURCE_TYPE'] not in SOURCE_TYPES:return False
 if row['SOURCE_TYPE'] in COMMERCIAL:
  permission={'AGGREGATE':'PUBLIC_SAFE_AGGREGATE','COMPANY_NAME':'PUBLIC_SAFE_COMPANY_NAME'}.get(field_scope)
  if not permission or permission not in row.get('LICENCE_PERMISSIONS',[]):return False
  return bool(row.get('LICENCE_EVIDENCE')) and not row.get('PERSONAL_CONTACT_INFORMATION')
 return True
def reconcile(primary,secondary):
 """Comparison only: never sum providers, convert currencies or allocate HS groups."""
 fields=['DATA_PERIOD','CN_CODE','HS_CODE','ORIGIN','DESTINATION','CURRENCY','WEIGHT_UNIT','GRAIN']
 mismatches=[k for k in fields if primary.get(k)!=secondary.get(k)]
 return {'status':'NOT_COMPARABLE' if mismatches else 'COMPARABLE_REPORTED_VALUES','mismatches':mismatches,'merge_allowed':False,'allocation_allowed':False,'primary_id':identity(primary),'secondary_id':identity(secondary)}
