// These methods extend the SAME transactional adapter, not a second review store.
export function adminTransactionMethods(db){return {
 async findManagedMembers(query,after=0,scope='ACTIVE'){
  const term='%'+query.replace(/[!%_]/g,c=>'!'+c)+'%';
  const [rows]=await db.execute(`SELECT c.id AS companyId,c.legal_name AS legalName,c.registration_country AS country,c.registration_number AS number,c.verification_status AS companyStatus,c.profile_version AS version,c.profile_json AS profile,c.created_at AS createdAt FROM b2b_companies c WHERE c.id>? AND ((?='ARCHIVED' AND JSON_UNQUOTE(JSON_EXTRACT(c.profile_json,'$.accountState')) IN ('CLOSED','DELETED')) OR (?='ACTIVE' AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(c.profile_json,'$.accountState')),'ACTIVE') NOT IN ('CLOSED','DELETED'))) AND (?='' OR c.legal_name LIKE ? ESCAPE '!' OR c.registration_number LIKE ? ESCAPE '!' OR JSON_UNQUOTE(JSON_EXTRACT(c.profile_json,'$.retainedIdentity.registrationNumber')) LIKE ? ESCAPE '!' OR EXISTS (SELECT 1 FROM b2b_company_members m JOIN b2b_users u ON u.id=m.user_id WHERE m.company_id=c.id AND u.email LIKE ? ESCAPE '!')) ORDER BY c.id LIMIT 51`,[after,scope,scope,query,term,term,term,term]);
  const items=rows.slice(0,50);
  if(items.length){const [members]=await db.execute(`SELECT m.company_id AS companyId,u.id AS userId,u.email,u.email_verified_at AS verifiedAt,m.role FROM b2b_company_members m JOIN b2b_users u ON u.id=m.user_id WHERE m.company_id IN (${items.map(()=>'?').join(',')}) ORDER BY m.company_id,u.id`,items.map(c=>c.companyId));for(const c of items)c.members=members.filter(m=>m.companyId===c.companyId);}
  for(const c of items){const [history]=await db.execute("SELECT action,entity_type,entity_id,occurred_at AS occurredAt FROM b2b_audit_log WHERE company_id=? AND action LIKE 'MEMBER_%' AND entity_type IN ('account_reason','retired_member') ORDER BY id DESC LIMIT 20",[c.companyId]);c.history=history.map(h=>({action:h.action,reason:h.entity_type==='account_reason'?h.entity_id:null,occurredAt:h.occurredAt}));c.deletionReadiness=await this.deletionDependencies(c.companyId);}
  return {items,next:rows.length>50?items.at(-1).companyId:null};
 },
 async deletionDependencies(companyId){
  const [[r]]=await db.execute(`SELECT (SELECT COUNT(*) FROM b2b_offers WHERE company_id=?) AS offers,(SELECT COUNT(*) FROM b2b_enquiries e JOIN b2b_offers o ON o.id=e.offer_id WHERE e.buyer_company_id=? OR o.company_id=?) AS enquiries,(SELECT COUNT(*) FROM b2b_enquiries e JOIN b2b_offers o ON o.id=e.offer_id WHERE (e.buyer_company_id=? OR o.company_id=?) AND e.status<>'CLOSED') AS openEnquiries,(SELECT COUNT(*) FROM b2b_enquiry_messages WHERE author_company_id=?) AS messages,(SELECT COUNT(*) FROM b2b_audit_log WHERE company_id=?) AS auditEvents,(SELECT COUNT(*) FROM b2b_trading_records WHERE owner_company_id=? OR responding_company_id=?) AS trades,(SELECT COUNT(*) FROM b2b_marketplace_notifications WHERE (actor_company_id=? OR recipient_company_id=?) AND status IN ('SENDING','UNKNOWN'))+(SELECT COUNT(*) FROM b2b_listing_notices n JOIN b2b_company_members m ON m.user_id=n.user_id WHERE m.company_id=? AND n.status IN ('SENDING','UNKNOWN')) AS deliveriesInFlight`,Array(12).fill(companyId));return r;
 },
 async retirementMembers(companyId){const [members]=await db.execute('SELECT u.id AS userId,u.email FROM b2b_users u JOIN b2b_company_members m ON m.user_id=u.id WHERE m.company_id=? ORDER BY u.id FOR UPDATE',[companyId]);for(const m of members){const [rows]=await db.execute('SELECT company_id FROM b2b_company_members WHERE user_id=? ORDER BY company_id FOR UPDATE',[m.userId]);m.companyIds=rows.map(r=>r.company_id);}return members;},
 async retireMember({userId,email,passwordHash,retiredEmail}){
  const [r]=await db.execute('UPDATE b2b_users SET email=?,password_hash=?,email_verified_at=NULL WHERE id=? AND email=?',[retiredEmail,passwordHash,userId,email]);if(r.affectedRows!==1)throw Object.assign(Error('RELOAD_REQUIRED'),{code:'B2B_VERSION_CONFLICT'});
  await db.execute('UPDATE b2b_email_verifications SET consumed_at=UTC_TIMESTAMP(3) WHERE user_id=? AND consumed_at IS NULL',[userId]);
  await db.execute('DELETE FROM b2b_sessions WHERE user_id=?',[userId]);
  await db.execute('UPDATE b2b_listing_preferences SET enabled=FALSE WHERE user_id=?',[userId]);
  await db.execute("UPDATE b2b_listing_notices SET status='BLOCKED' WHERE user_id=? AND status='PENDING'",[userId]);
  await db.execute("UPDATE b2b_marketplace_notifications SET status='BLOCKED' WHERE (actor_user_id=? OR recipient_user_id=?) AND status='PENDING'",[userId,userId]);
 },
 async retireManagedCompany({companyId,version,profile}){
  const [r]=await db.execute("UPDATE b2b_companies SET profile_json=?,registration_number=NULL,verification_status='REJECTED',profile_version=profile_version+1 WHERE id=? AND profile_version=?",[JSON.stringify(profile),companyId,version]);if(r.affectedRows!==1)throw Object.assign(Error('RELOAD_REQUIRED'),{code:'B2B_VERSION_CONFLICT'});
  await db.execute("UPDATE b2b_offers SET status='CLOSED',version=version+1 WHERE company_id=? AND status<>'CLOSED'",[companyId]);
 },
 async updateManagedCompany({companyId,version,profile}){
  const [r]=await db.execute("UPDATE b2b_companies SET profile_json=?,profile_version=profile_version+1,verification_status='PENDING' WHERE id=? AND profile_version=?",[JSON.stringify(profile),companyId,version]);
  if(r.affectedRows!==1)throw Object.assign(Error('RELOAD_REQUIRED'),{code:'B2B_VERSION_CONFLICT'});
  await db.execute("UPDATE b2b_offers SET status='DRAFT',version=version+1 WHERE company_id=? AND status='PUBLISHED'",[companyId]);
 },
 async revokeCompanySessions(companyId){await db.execute('DELETE s FROM b2b_sessions s JOIN b2b_company_members m ON m.user_id=s.user_id WHERE m.company_id=?',[companyId]);},
 async adminByEmail(email,lock=false){const [rows]=await db.execute('SELECT * FROM b2b_platform_admins WHERE email=?'+(lock?' FOR UPDATE':''),[email]);return rows[0]??null;},
 async adminSession(hash){const [rows]=await db.execute(`SELECT a.* FROM b2b_platform_admins a JOIN b2b_platform_admin_sessions s ON s.admin_id=a.id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP(3) AND s.auth_version=a.auth_version AND a.state='ACTIVE' FOR UPDATE`,[hash]);return rows[0]??null;},
 // Null means no additional exclusions are recorded; it does not declare a complete affiliation list.
 async adminConflicts(a){const raw=a.conflict_company_ids==null?[]:typeof a.conflict_company_ids==='string'?JSON.parse(a.conflict_company_ids):a.conflict_company_ids;if(!Array.isArray(raw)||raw.some(id=>!Number.isSafeInteger(id)||id<1)||typeof a.owner_authorization_ref!=='string'||!a.owner_authorization_ref.trim())throw Error('ADMIN_CONFLICT_RECORD_REQUIRED');const [rows]=await db.execute('SELECT m.company_id FROM b2b_company_members m JOIN b2b_users u ON u.id=m.user_id WHERE u.email=?',[a.email]);return [...new Set([...raw,...rows.map(r=>Number(r.company_id))])];},
 async adminFailure(id){await db.execute('UPDATE b2b_platform_admins SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=5 THEN TIMESTAMPADD(MINUTE,15,UTC_TIMESTAMP(3)) ELSE locked_until END WHERE id=?',[id]);},
 async adminSuccess(id,counter){await db.execute("UPDATE b2b_platform_admins SET state='ACTIVE',last_totp_counter=?,failed_attempts=0,locked_until=NULL WHERE id=?",[counter,id]);},
 async adminInsertSession({hash,id,version,expires}){await db.execute('DELETE FROM b2b_platform_admin_sessions WHERE admin_id=?',[id]);await db.execute('INSERT INTO b2b_platform_admin_sessions (token_hash,admin_id,auth_version,expires_at) VALUES (?,?,?,?)',[hash,id,version,expires]);},
 async adminLogout(hash){await db.execute('DELETE FROM b2b_platform_admin_sessions WHERE token_hash=?',[hash]);}
};}
