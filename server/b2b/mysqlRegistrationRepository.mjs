// Transactional MySQL adapter for B2B registration. Not connected to live runtime.
// Accepts a mysql2/promise pool; all untrusted values are parameterized.
export function createMysqlB2bRepository(pool) {
  if (!pool || typeof pool.getConnection !== 'function') throw new TypeError('INVALID_DB_POOL');
  return {
    async transaction(work) {
      const db = await pool.getConnection();
      let began = false;
      try {
        await db.beginTransaction();
        began = true;
        const tx = {
          async insertCompany({legalName, registrationCountry, registrationNumber}) {
            const [result] = await db.execute(
              'INSERT INTO b2b_companies (legal_name,registration_country,registration_number) VALUES (?,?,?)',
              [legalName,registrationCountry,registrationNumber]);
            return result.insertId;
          },
          async insertUser({email,passwordHash}) {
            const [result] = await db.execute(
              'INSERT INTO b2b_users (email,password_hash) VALUES (?,?)',[email,passwordHash]);
            return result.insertId;
          },
          async insertCompanyMember({companyId,userId,role}) {
            await db.execute('INSERT INTO b2b_company_members (company_id,user_id,role) VALUES (?,?,?)',
              [companyId,userId,role]);
          },
          async insertEmailVerification({userId,tokenHash,expiresAt}) {
            await db.execute('INSERT INTO b2b_email_verifications (user_id,token_hash,expires_at) VALUES (?,?,?)',
              [userId,tokenHash,expiresAt]);
          },
          async appendAudit({actorUserId,companyId,action,entityType,entityId}) {
            await db.execute('INSERT INTO b2b_audit_log (actor_user_id,company_id,action,entity_type,entity_id) VALUES (?,?,?,?,?)',
              [actorUserId,companyId,action,entityType,entityId]);
          },
          async consumeEmailVerification({userId,tokenHash}) {
            const [result] = await db.execute(
              'UPDATE b2b_email_verifications SET consumed_at=UTC_TIMESTAMP(3) WHERE user_id=? AND token_hash=? AND consumed_at IS NULL AND expires_at>UTC_TIMESTAMP(3)',
              [userId,tokenHash]);
            return result.affectedRows === 1;
          },
          async markEmailVerified({userId}) {
            await db.execute('UPDATE b2b_users SET email_verified_at=UTC_TIMESTAMP(3) WHERE id=? AND email_verified_at IS NULL',
              [userId]);
          }
        };
        const result = await work(tx);
        await db.commit();
        return result;
      } catch (error) {
        if (began) {
          try { await db.rollback(); } catch { /* Preserve original error. */ }
        }
        throw error;
      } finally {
        db.release();
      }
    }
  };
}
