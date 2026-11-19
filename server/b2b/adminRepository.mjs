// These methods extend the SAME transactional adapter, not a second review store.
export function adminTransactionMethods(db){return {
 async adminByEmail(email,lock=false){const [rows]=await db.execute('SELECT * FROM b2b_platform_admins WHERE email=?'+(lock?' FOR UPDATE':''),[email]);return rows[0]??null;},
 async adminSession(hash){const [rows]=await db.execute(`SELECT a.* FROM b2b_platform_admins a JOIN b2b_platform_admin_sessions s ON s.admin_id=a.id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP(3) AND s.auth_version=a.auth_version AND a.state='ACTIVE' FOR UPDATE`,[hash]);return rows[0]??null;},
 async adminConflicts(a){const raw=typeof a.conflict_company_ids==='string'?JSON.parse(a.conflict_company_ids):a.conflict_company_ids;if(!Array.isArray(raw)||raw.some(id=>!Number.isSafeInteger(id)||id<1)||!a.conflicts_confirmed_at||!a.owner_authorization_ref)throw Error('ADMIN_CONFLICT_RECORD_REQUIRED');const [rows]=await db.execute('SELECT m.company_id FROM b2b_company_members m JOIN b2b_users u ON u.id=m.user_id WHERE u.email=?',[a.email]);return [...new Set([...raw,...rows.map(r=>Number(r.company_id))])];},
 async adminFailure(id){await db.execute('UPDATE b2b_platform_admins SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=5 THEN TIMESTAMPADD(MINUTE,15,UTC_TIMESTAMP(3)) ELSE locked_until END WHERE id=?',[id]);},
 async adminSuccess(id,counter){await db.execute("UPDATE b2b_platform_admins SET state='ACTIVE',last_totp_counter=?,failed_attempts=0,locked_until=NULL WHERE id=?",[counter,id]);},
 async adminInsertSession({hash,id,version,expires}){await db.execute('DELETE FROM b2b_platform_admin_sessions WHERE admin_id=?',[id]);await db.execute('INSERT INTO b2b_platform_admin_sessions (token_hash,admin_id,auth_version,expires_at) VALUES (?,?,?,?)',[hash,id,version,expires]);},
 async adminLogout(hash){await db.execute('DELETE FROM b2b_platform_admin_sessions WHERE token_hash=?',[hash]);}
};}
