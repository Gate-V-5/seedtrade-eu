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
          async findLogin(email, lock = false) {
            const [rows] = await db.execute('SELECT id,email,password_hash AS passwordHash,email_verified_at AS verifiedAt FROM b2b_users WHERE email=?' + (lock ? ' FOR UPDATE' : ''),[email]);
            return rows[0] ?? null;
          },
          async insertSession({tokenHash,userId,expiresAt}) {
            await db.execute('DELETE FROM b2b_sessions WHERE user_id=? AND expires_at<=UTC_TIMESTAMP(3)',[userId]);
            await db.execute('INSERT INTO b2b_sessions (token_hash,user_id,expires_at) VALUES (?,?,?)',[tokenHash,userId,expiresAt]);
          },
          async revokeSession(tokenHash) {
            await db.execute('DELETE FROM b2b_sessions WHERE token_hash=?',[tokenHash]);
          },
          async sessionContext(tokenHash) {
            const [rows] = await db.execute(`SELECT u.id AS userId,u.email,u.email_verified_at AS verifiedAt,
              c.id AS companyId,c.legal_name AS legalName,c.registration_country AS country,
              c.registration_number AS number,c.verification_status AS status,c.profile_json AS profile,
              c.profile_version AS version,m.role,
              CASE WHEN c.verification_status IN ('MORE_INFO','REJECTED') THEN
                (SELECT a.entity_id FROM b2b_audit_log a WHERE a.company_id=c.id AND a.action='REVIEW_REASON' ORDER BY a.id DESC LIMIT 1)
                ELSE NULL END AS reviewReason
              FROM b2b_sessions s JOIN b2b_users u ON u.id=s.user_id
              JOIN b2b_company_members m ON m.user_id=u.id JOIN b2b_companies c ON c.id=m.company_id
              WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP(3) FOR UPDATE`,[tokenHash]);
            // V1 has exactly one company per account; ambiguity must not select an arbitrary tenant.
            return rows.length === 1 ? rows[0] : null;
          },
          async saveProfile({companyId,legalName,country,number,profile,version}) {
            await db.execute(`UPDATE b2b_companies SET legal_name=?,registration_country=?,registration_number=?,
              profile_json=?,profile_version=profile_version+1,verification_status='PENDING'
              WHERE id=? AND profile_version=?`,[legalName,country,number,JSON.stringify(profile),companyId,version]);
            await db.execute("UPDATE b2b_offers SET status='DRAFT',version=version+1 WHERE company_id=? AND status='PUBLISHED'",[companyId]);
          },
          async companyForReview(id) {
            const [rows] = await db.execute(`SELECT id AS companyId,legal_name AS legalName,registration_country AS country,
              registration_number AS number,verification_status AS status,profile_json AS profile,profile_version AS version
              FROM b2b_companies WHERE id=? FOR UPDATE`,[id]);
            return rows[0] ?? null;
          },
          async reviewQueue(after) {
            const [rows] = await db.execute(`SELECT id AS companyId,legal_name AS legalName,registration_country AS country,
              registration_number AS number,verification_status AS status,profile_json AS profile,profile_version AS version
              FROM b2b_companies WHERE id>? ORDER BY id LIMIT 51`,[after]);
            return rows;
          },
          async decideCompany({companyId,status,version}) {
            await db.execute('UPDATE b2b_companies SET verification_status=?,profile_version=profile_version+1 WHERE id=? AND profile_version=?',[status,companyId,version]);
            if(status !== 'VERIFIED') await db.execute("UPDATE b2b_offers SET status='DRAFT',version=version+1 WHERE company_id=? AND status='PUBLISHED'",[companyId]);
          },
          async listOffers({companyId,own,after}) {
            const [rows] = await db.execute(`SELECT o.id,o.company_id AS companyId,c.legal_name AS companyName,
              o.crop_id AS cropId,o.quantity,o.unit,o.price_amount AS priceAmount,o.currency,
              o.seed_category AS seedCategory,o.origin_country AS originCountry,DATE_FORMAT(o.valid_until,'%Y-%m-%d') AS validUntil,
              o.status,o.version FROM b2b_offers o JOIN b2b_companies c ON c.id=o.company_id WHERE o.id>? AND ` +
              (own ? 'o.company_id=?' : "o.company_id<>? AND o.status='PUBLISHED' AND c.verification_status='VERIFIED' AND o.valid_until>=UTC_DATE()") +
              ' ORDER BY o.id LIMIT 51',[after,companyId]);
            return rows;
          },
          async offerForUpdate(id) {
            const [rows] = await db.execute(`SELECT o.id,o.company_id AS companyId,o.status,o.version,
              DATE_FORMAT(o.valid_until,'%Y-%m-%d') AS validUntil,c.verification_status AS companyStatus
              FROM b2b_offers o JOIN b2b_companies c ON c.id=o.company_id WHERE o.id=? FOR UPDATE`,[id]);
            return rows[0] ?? null;
          },
          async saveOffer({id,companyId,cropId,quantity,unit,priceAmount,seedCategory,originCountry,validUntil,version}) {
            if(id) {
              await db.execute(`UPDATE b2b_offers SET crop_id=?,quantity=?,unit=?,price_amount=?,seed_category=?,origin_country=?,valid_until=?,version=version+1
                WHERE id=? AND company_id=? AND version=? AND status='DRAFT'`,[cropId,quantity,unit,priceAmount,seedCategory,originCountry,validUntil,id,companyId,version]);
              return id;
            }
            const [result] = await db.execute(`INSERT INTO b2b_offers (company_id,crop_id,quantity,unit,price_amount,seed_category,origin_country,valid_until)
              VALUES (?,?,?,?,?,?,?,?)`,[companyId,cropId,quantity,unit,priceAmount,seedCategory,originCountry,validUntil]);
            return result.insertId;
          },
          async setOfferStatus({id,companyId,status,version}) {
            await db.execute('UPDATE b2b_offers SET status=?,version=version+1 WHERE id=? AND company_id=? AND version=?',[status,id,companyId,version]);
          },
          async createEnquiry({offerId,companyId,userId}) {
            const [result] = await db.execute('INSERT INTO b2b_enquiries (offer_id,buyer_company_id,created_by_user_id) VALUES (?,?,?)',[offerId,companyId,userId]);
            return result.insertId;
          },
          async enquiryForUpdate(id) {
            const [rows] = await db.execute(`SELECT e.id,e.buyer_company_id AS buyerCompanyId,o.company_id AS sellerCompanyId,e.status
              FROM b2b_enquiries e JOIN b2b_offers o ON o.id=e.offer_id WHERE e.id=? FOR UPDATE`,[id]);
            return rows[0] ?? null;
          },
          async listEnquiries({companyId,after}) {
            const [rows] = await db.execute(`SELECT e.id,e.offer_id AS offerId,e.buyer_company_id AS buyerCompanyId,
              o.company_id AS sellerCompanyId,b.legal_name AS buyerName,s.legal_name AS sellerName,o.crop_id AS cropId,e.status
              FROM b2b_enquiries e JOIN b2b_offers o ON o.id=e.offer_id
              JOIN b2b_companies b ON b.id=e.buyer_company_id JOIN b2b_companies s ON s.id=o.company_id
              WHERE e.id>? AND (e.buyer_company_id=? OR o.company_id=?) ORDER BY e.id LIMIT 51`,[after,companyId,companyId]);
            return rows;
          },
          async enquiryMessages({enquiryId,after}) {
            const [rows] = await db.execute(`SELECT id,author_company_id AS authorCompanyId,body,created_at AS createdAt
              FROM b2b_enquiry_messages WHERE enquiry_id=? AND id>? ORDER BY id LIMIT 51`,[enquiryId,after]);
            return rows;
          },
          async insertMessage({enquiryId,userId,companyId,body}) {
            const [result] = await db.execute('INSERT INTO b2b_enquiry_messages (enquiry_id,author_user_id,author_company_id,body) VALUES (?,?,?,?)',[enquiryId,userId,companyId,body]);
            return result.insertId;
          },
          async setEnquiryStatus({id,status}) {
            await db.execute('UPDATE b2b_enquiries SET status=? WHERE id=?',[status,id]);
          },
          async revokeVerificationTokens(userId) {
            await db.execute('UPDATE b2b_email_verifications SET consumed_at=UTC_TIMESTAMP(3) WHERE user_id=? AND consumed_at IS NULL',[userId]);
          },
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
