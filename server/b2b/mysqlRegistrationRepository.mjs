import {decisionTransactionMethods} from './decisionRepository.mjs';
import {adminTransactionMethods} from './adminRepository.mjs';
import {tradingTransactionMethods} from './tradingRepository.mjs';
import {literalContains} from './buyerOfferFilters.mjs';
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
          ...adminTransactionMethods(db),
          ...decisionTransactionMethods(db),
          ...tradingTransactionMethods(db),
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
              FROM b2b_companies WHERE id>? AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.accountState')),'ACTIVE') NOT IN ('CLOSED','DELETED') ORDER BY id LIMIT 51`,[after]);
            return rows;
          },
          async decideCompany({companyId,status,version,rejectedProfile}) {
            if(rejectedProfile){await db.execute("UPDATE b2b_companies SET verification_status=?,profile_version=profile_version+1,profile_json=?,registration_number=NULL WHERE id=? AND profile_version=?",[status,JSON.stringify(rejectedProfile),companyId,version]);}else await db.execute('UPDATE b2b_companies SET verification_status=?,profile_version=profile_version+1 WHERE id=? AND profile_version=?',[status,companyId,version]);
            if(status !== 'VERIFIED') await db.execute("UPDATE b2b_offers SET status='DRAFT',version=version+1 WHERE company_id=? AND status='PUBLISHED'",[companyId]);
          },
          async listOffers({companyId,own,after,filters={},eligibleCropIds,publicPreview=false,offerId=null}) {
            const conditions=[publicPreview?'(?=0 OR o.id<?)':'o.id>?'];const args=publicPreview?[after,after]:[after];
            if(publicPreview){
              conditions.push("o.status='PUBLISHED' AND c.verification_status='VERIFIED' AND o.valid_until>=UTC_DATE() AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(c.profile_json,'$.accountState')),'ACTIVE')='ACTIVE' AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(c.profile_json,'$.accessSuspended')),'false')<>'true'");
              if(offerId!=null){conditions.push('o.id=?');args.push(offerId);}
            }else{conditions.push(own?'o.company_id=?':"o.company_id<>? AND o.status='PUBLISHED' AND c.verification_status='VERIFIED' AND o.valid_until>=UTC_DATE()");args.push(companyId);}
            if(!own){
              if(eligibleCropIds){if(!eligibleCropIds.length)return [];conditions.push('o.crop_id IN ('+eligibleCropIds.map(()=>'?').join(',')+')');args.push(...eligibleCropIds);}
              for(const [key,column]of [['cropId','o.crop_id'],['originCountry','o.origin_country'],['seedCategory','o.seed_category']])if(filters[key]){conditions.push(column+'=?');args.push(filters[key]);}
              for(const [key,column]of [['variety',"JSON_UNQUOTE(JSON_EXTRACT(o.details_json,'$.variety'))"],['certificationClass','o.certification_class']])if(filters[key]){conditions.push("LOWER("+column+") LIKE LOWER(?) ESCAPE '!'");args.push(literalContains(filters[key]));}
              for(const key of ['listingDirection','productType'])if(filters[key]){conditions.push("JSON_UNQUOTE(JSON_EXTRACT(o.details_json,'$."+key+"'))=?");args.push(filters[key]);}
              for(const [key,operator]of [['minQuantityKg','>='],['maxQuantityKg','<=']])if(filters[key]!=null){conditions.push("(o.quantity * CASE WHEN o.unit='t' THEN 1000 ELSE 1 END) "+operator+' ?');args.push(filters[key]);}
              if(filters.currency){conditions.push('o.price_amount IS NOT NULL AND o.currency=?');args.push(filters.currency);}
              for(const [key,operator]of [['minPriceKg','>='],['maxPriceKg','<=']])if(filters[key]!=null){conditions.push("(o.price_amount / CASE WHEN o.unit='t' THEN 1000 ELSE 1 END) "+operator+' ?');args.push(filters[key]);}
            }
            if(publicPreview){const [rows]=await db.execute(`SELECT o.id,o.crop_id AS cropId,o.quantity,o.unit,o.price_amount AS priceAmount,o.currency,o.seed_category AS seedCategory,o.certification_class AS certificationClass,o.origin_country AS originCountry,DATE_FORMAT(o.valid_until,'%Y-%m-%d') AS validUntil,JSON_OBJECT('variety',JSON_EXTRACT(o.details_json,'$.variety'),'availability',JSON_EXTRACT(o.details_json,'$.availability'),'availableFrom',JSON_EXTRACT(o.details_json,'$.availableFrom'),'listingDirection',JSON_EXTRACT(o.details_json,'$.listingDirection'),'productType',JSON_EXTRACT(o.details_json,'$.productType'),'priceUnit',JSON_EXTRACT(o.details_json,'$.priceUnit'),'packaging',JSON_EXTRACT(o.details_json,'$.packaging'),'deliveryTerms',JSON_EXTRACT(o.details_json,'$.deliveryTerms'),'organic',JSON_EXTRACT(o.details_json,'$.organic'),'qualityParameters',JSON_EXTRACT(o.details_json,'$.qualityParameters'),'qualitySpecifications',JSON_EXTRACT(o.details_json,'$.qualitySpecifications'),'germinationPercent',JSON_EXTRACT(o.details_json,'$.germinationPercent'),'purityPercent',JSON_EXTRACT(o.details_json,'$.purityPercent'),'moisturePercent',JSON_EXTRACT(o.details_json,'$.moisturePercent')) AS details FROM b2b_offers o JOIN b2b_companies c ON c.id=o.company_id WHERE `+conditions.join(' AND ')+' ORDER BY o.id DESC LIMIT 51',args);return rows;}
const [rows]=await db.execute(`SELECT o.id,o.company_id AS companyId,c.legal_name AS companyName,c.registration_country AS companyCountry,
              o.crop_id AS cropId,o.quantity,o.unit,o.price_amount AS priceAmount,o.currency,
              o.seed_category AS seedCategory,o.origin_country AS originCountry,DATE_FORMAT(o.valid_until,'%Y-%m-%d') AS validUntil,
              o.certification_class AS certificationClass,o.details_json AS details,o.status,o.version
              FROM b2b_offers o JOIN b2b_companies c ON c.id=o.company_id WHERE `+conditions.join(' AND ')+' ORDER BY o.id LIMIT 51',args);return rows;
          },
          async publishedOffer({id,companyId,eligibleCropIds}) {
            if(!eligibleCropIds.length)return null;
            const [rows]=await db.execute(`SELECT o.id,c.legal_name AS companyName,c.registration_country AS companyCountry,o.crop_id AS cropId,
              o.quantity,o.unit,o.price_amount AS priceAmount,o.currency,o.seed_category AS seedCategory,o.certification_class AS certificationClass,
              o.origin_country AS originCountry,DATE_FORMAT(o.valid_until,'%Y-%m-%d') AS validUntil,o.details_json AS details
              FROM b2b_offers o JOIN b2b_companies c ON c.id=o.company_id
              WHERE o.id=? AND o.company_id<>? AND o.status='PUBLISHED' AND c.verification_status='VERIFIED' AND o.valid_until>=UTC_DATE()
              AND o.crop_id IN (`+eligibleCropIds.map(()=>'?').join(',')+')',[id,companyId,...eligibleCropIds]);return rows[0]??null;
          },
          async offerForUpdate(id) {
            const [rows] = await db.execute(`SELECT o.id,o.company_id AS companyId,o.crop_id AS cropId,o.quantity,o.unit,o.price_amount AS priceAmount,o.currency,o.seed_category AS seedCategory,o.certification_class AS certificationClass,o.origin_country AS originCountry,o.details_json AS details,o.status,o.version,
              DATE_FORMAT(o.valid_until,'%Y-%m-%d') AS validUntil,c.verification_status AS companyStatus
              FROM b2b_offers o JOIN b2b_companies c ON c.id=o.company_id WHERE o.id=? FOR UPDATE`,[id]);
            return rows[0] ? {...rows[0],quantity:Number(rows[0].quantity),priceAmount:rows[0].priceAmount==null?null:Number(rows[0].priceAmount)} : null;
          },
          async saveOffer({id,companyId,cropId,quantity,unit,priceAmount,seedCategory,certificationClass,currency,details,originCountry,validUntil,version}) {
            if(id) {
              const [updated]=await db.execute(`UPDATE b2b_offers SET crop_id=?,quantity=?,unit=?,price_amount=?,seed_category=?,certification_class=?,currency=?,details_json=?,origin_country=?,valid_until=?,status='DRAFT',version=version+1 WHERE id=? AND company_id=? AND version=?`,[cropId,quantity,unit,priceAmount,seedCategory,certificationClass,currency,JSON.stringify(details),originCountry,validUntil,id,companyId,version]);
              if(updated.affectedRows!==1)throw Object.assign(Error('RELOAD_REQUIRED'),{code:'B2B_VERSION_CONFLICT'});
              return id;
            }
            const [result] = await db.execute(`INSERT INTO b2b_offers (company_id,crop_id,quantity,unit,price_amount,seed_category,certification_class,currency,details_json,origin_country,valid_until)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)`,[companyId,cropId,quantity,unit,priceAmount,seedCategory,certificationClass,currency,JSON.stringify(details),originCountry,validUntil]);
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
            const [rows]=await db.execute(`SELECT e.id,e.offer_id AS offerId,e.buyer_company_id AS buyerCompanyId,o.company_id AS sellerCompanyId,e.status,e.created_at AS createdAt,
              b.legal_name AS buyerName,s.legal_name AS sellerName,o.crop_id AS cropId,o.details_json AS offerDetails,
              (SELECT n.payload_json FROM b2b_marketplace_notifications n WHERE n.enquiry_id=e.id AND n.kind='ENQUIRY' ORDER BY n.id LIMIT 1) AS snapshot
              FROM b2b_enquiries e JOIN b2b_offers o ON o.id=e.offer_id JOIN b2b_companies b ON b.id=e.buyer_company_id JOIN b2b_companies s ON s.id=o.company_id WHERE e.id=? FOR UPDATE`,[id]);return rows[0]??null;
          },
          async listEnquiries({companyId,after,direction}) {
            const [rows]=await db.execute(`SELECT e.id,e.offer_id AS offerId,e.buyer_company_id AS buyerCompanyId,
              o.company_id AS sellerCompanyId,b.legal_name AS buyerName,s.legal_name AS sellerName,o.crop_id AS cropId,e.status,e.created_at AS createdAt,o.details_json AS offerDetails,
              (SELECT n.payload_json FROM b2b_marketplace_notifications n WHERE n.enquiry_id=e.id AND n.kind='ENQUIRY' ORDER BY n.id LIMIT 1) AS snapshot,
              (SELECT m.body FROM b2b_enquiry_messages m WHERE m.enquiry_id=e.id ORDER BY m.id LIMIT 1) AS initialMessage
              FROM b2b_enquiries e JOIN b2b_offers o ON o.id=e.offer_id
              JOIN b2b_companies b ON b.id=e.buyer_company_id JOIN b2b_companies s ON s.id=o.company_id
              WHERE e.id>? AND (e.buyer_company_id=? OR o.company_id=?)`+(direction==='INBOX'?' AND o.company_id=?':direction==='SENT'?' AND e.buyer_company_id=?':'')+' ORDER BY e.id LIMIT 51',[after,companyId,companyId,...(direction?[companyId]:[])]);return rows;
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
          async marketplaceOperation({actorUserId,kind,requestKey}) {
            const [rows]=await db.execute(`SELECT id,enquiry_id AS enquiryId,message_id AS messageId,
              request_fingerprint AS fingerprint,status FROM b2b_marketplace_notifications
              WHERE actor_user_id=? AND kind=? AND request_key=? FOR UPDATE`,[actorUserId,kind,requestKey]);
            return rows[0]??null;
          },
          async marketplaceNotificationContext(enquiryId,kind) {
            const [rows]=await db.execute(`SELECT e.id AS enquiryId,e.offer_id AS offerId,
              e.buyer_company_id AS buyerCompanyId,e.created_by_user_id AS buyerUserId,
              o.company_id AS sellerCompanyId,o.crop_id AS cropId,o.quantity,o.unit,
              (SELECT n.payload_json FROM b2b_marketplace_notifications n WHERE n.enquiry_id=e.id AND n.kind='ENQUIRY' ORDER BY n.id LIMIT 1) AS snapshot
              FROM b2b_enquiries e JOIN b2b_offers o ON o.id=e.offer_id WHERE e.id=?`,[enquiryId]);
            if(rows.length!==1)throw Error('NOTIFICATION_CONTEXT_REQUIRED');
            const context=rows[0];let recipients=[];
            if(kind==='ENQUIRY') {
              [recipients]=await db.execute(`SELECT u.id AS userId,u.email FROM b2b_company_members m
                JOIN b2b_users u ON u.id=m.user_id WHERE m.company_id=? AND m.role='COMPANY_ADMIN'
                AND u.email_verified_at IS NOT NULL ORDER BY u.id LIMIT 2`,[context.sellerCompanyId]);
            } else if(kind==='SELLER_REPLY') {
              [recipients]=await db.execute(`SELECT u.id AS userId,u.email FROM b2b_users u
                JOIN b2b_company_members m ON m.user_id=u.id WHERE u.id=? AND m.company_id=?
                AND u.email_verified_at IS NOT NULL`,[context.buyerUserId,context.buyerCompanyId]);
            }
            return {...context,recipientUserId:recipients.length===1?recipients[0].userId:null,
              recipientEmail:recipients.length===1?recipients[0].email:null,
              recipientCompanyId:kind==='ENQUIRY'?context.sellerCompanyId:context.buyerCompanyId};
          },
          async enqueueMarketplaceNotification(n) {
            const [result]=await db.execute(`INSERT INTO b2b_marketplace_notifications
              (kind,actor_user_id,actor_company_id,request_key,request_fingerprint,enquiry_id,message_id,
               recipient_user_id,recipient_company_id,recipient_email,payload_json,status)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,[n.kind,n.actorUserId,n.actorCompanyId,n.requestKey,n.fingerprint,
              n.enquiryId,n.messageId,n.recipientUserId,n.recipientCompanyId,n.recipientEmail,JSON.stringify(n.payload),n.status]);
            return result.insertId;
          },
          async claimMarketplaceNotification(id) {
            const [eligible]=await db.execute(`SELECT n.id FROM b2b_marketplace_notifications n
              JOIN b2b_users u ON u.id=n.recipient_user_id AND u.email=n.recipient_email AND u.email_verified_at IS NOT NULL
              JOIN b2b_company_members m ON m.user_id=u.id AND m.company_id=n.recipient_company_id
              JOIN b2b_enquiries e ON e.id=n.enquiry_id JOIN b2b_offers o ON o.id=e.offer_id
              WHERE n.id=? AND n.status='PENDING' AND n.attempt_count=0 AND
              ((n.kind='ENQUIRY' AND n.recipient_company_id=o.company_id AND m.role='COMPANY_ADMIN') OR
               (n.kind='SELLER_REPLY' AND n.recipient_company_id=e.buyer_company_id AND u.id=e.created_by_user_id)) FOR UPDATE`,[id]);
            if(eligible.length!==1){await db.execute("UPDATE b2b_marketplace_notifications SET status='BLOCKED' WHERE id=? AND status='PENDING' AND attempt_count=0",[id]);return null;}

            const [updated]=await db.execute(`UPDATE b2b_marketplace_notifications SET status='SENDING',
              attempt_count=1,started_at=UTC_TIMESTAMP(3) WHERE id=? AND status='PENDING' AND attempt_count=0`,[id]);
            if(updated.affectedRows!==1)return null;
            const [rows]=await db.execute(`SELECT id,kind,recipient_email AS recipientEmail,payload_json AS payload
              FROM b2b_marketplace_notifications WHERE id=?`,[id]);
            return rows[0];
          },
          async finishMarketplaceNotification({id,status,failureCode,smtpCode,messageIdHash}) {
            const [result]=await db.execute(`UPDATE b2b_marketplace_notifications SET status=?,failure_code=?,
              smtp_code=?,message_id_hash=?,finished_at=UTC_TIMESTAMP(3)
              WHERE id=? AND status='SENDING' AND attempt_count=1`,[status,failureCode,smtpCode,messageIdHash,id]);
            if(result.affectedRows!==1)throw Error('NOTIFICATION_OUTCOME_NOT_RECORDED');
          },
          async revokeVerificationTokens(userId) {
            await db.execute('UPDATE b2b_email_verifications SET consumed_at=UTC_TIMESTAMP(3) WHERE user_id=? AND consumed_at IS NULL',[userId]);
          },
          async findResetUser(userId) {
            const [rows]=await db.execute('SELECT id,email,email_verified_at AS verifiedAt FROM b2b_users WHERE id=? FOR UPDATE',[userId]);
            return rows[0]??null;
          },
          async replacePassword({userId,passwordHash}) {
            await db.execute('UPDATE b2b_users SET password_hash=? WHERE id=?',[passwordHash,userId]);
            await db.execute('DELETE FROM b2b_sessions WHERE user_id=?',[userId]);
          },
          async insertCompany({legalName, registrationCountry, registrationNumber, registeredAddress,registrationContact}) {
            const [result] = await db.execute(
              registeredAddress
                ? 'INSERT INTO b2b_companies (legal_name,registration_country,registration_number,profile_json) VALUES (?,?,?,?)'
                : 'INSERT INTO b2b_companies (legal_name,registration_country,registration_number) VALUES (?,?,?)',
              registeredAddress
                ? [legalName,registrationCountry,registrationNumber,JSON.stringify({registeredAddress,...(registrationContact??{})})]
                : [legalName,registrationCountry,registrationNumber]);
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
          async appendAudit({actorUserId,adminActorId,companyId,action,entityType,entityId}) {
            if(adminActorId){await db.execute('INSERT INTO b2b_audit_log (actor_user_id,platform_admin_id,company_id,action,entity_type,entity_id) VALUES (?,?,?,?,?,?)',[actorUserId,adminActorId,companyId,action,entityType,entityId]);return;}
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
