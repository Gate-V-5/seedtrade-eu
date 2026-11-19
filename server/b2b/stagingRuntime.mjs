import {adminConfiguration} from './adminActivation.mjs';
import {createAdminService} from './adminService.mjs';
import {createAdminHttp} from './adminHttp.mjs';
import {companyReviewBinding} from './companyReviewActivation.mjs';
import {createPublicPreviewService,createPublicPreviewHttp} from './publicPreview.mjs';
import {hostedMarketplaceEnabled} from './marketplaceActivation.mjs';
// Shared composition; production stays closed until its separate release approval.
// No connections or mail transports while gates are closed.
import {b2bRuntimeIdentity,b2bRegistrationReadiness, createB2bRegistrationModule} from './createRegistrationModule.mjs';
import {b2bDatabaseConfig} from './databaseReadiness.mjs';
import {handleDisabledB2bApi} from './disabledApi.mjs';
import {createB2bRateLimiter} from './rateLimiter.mjs';
import {createB2bRegistrationMail, createB2bVerificationMailer} from './verificationMailer.mjs';
import {createProxyPolicy} from '../networkProxyPolicy.mjs';
import {PRODUCTION_BROWSER_ORIGINS,PRODUCTION_DB_SOCKET} from './productionCors.mjs';
import {readFile} from 'node:fs/promises';
import {createMysqlB2bRepository} from './mysqlRegistrationRepository.mjs';
import {createB2bPasswordHasher} from './passwordHasher.mjs';
import {createB2bPortalService} from './portalService.mjs';
import {createB2bPortalHttp} from './portalHttp.mjs';
import {createMarketplaceNotifications} from './marketplaceNotifications.mjs';
import {B2bError} from './portalService.mjs';
import {createTradingWorkflow} from './tradingWorkflow.mjs';
import {createTradingAdmin} from './tradingAdmin.mjs';
import {createListingNotifications} from './listingNotifications.mjs';

export async function createB2bStagingRuntime(env, dependencies = {}) {
  const closed = {handle: handleDisabledB2bApi, close: async () => {}};
  if (b2bRegistrationReadiness(env).status === 'BLOCKED') return closed;
  const production = b2bRuntimeIdentity(env) === 'production';
  // Only the isolated runner supplies this dependency option; hosted startup does not.
  const localResendOnly = dependencies.localResendOnly === true;
  const localVerifyOnly = dependencies.localVerifyOnly === true;
  const localJourney = dependencies.localJourney === true;
  // Dependency-only local work-package scope; hosted production can never activate it.
  const localSellerOffers=dependencies.localSellerOffers===true;
  const localBuyerDiscovery=dependencies.localBuyerDiscovery===true;
  const localEnquiries=dependencies.localEnquiries===true;
  const localTrading=dependencies.localTrading===true;
  if(localTrading&&(production||!localEnquiries))return closed;
  const localPublicPreview=dependencies.localPublicPreview===true;
  if(localPublicPreview&&(!localEnquiries||production))return closed;
  if(localEnquiries&&(!localBuyerDiscovery||!localSellerOffers||production))return closed;
  if(localBuyerDiscovery&&(!localSellerOffers||production))return closed;
  if (production && (localResendOnly || localVerifyOnly || localJourney || localSellerOffers)) return closed;
  if ([localResendOnly,localVerifyOnly,localJourney,localSellerOffers].filter(Boolean).length > 1) return closed;
  if ((localResendOnly || localVerifyOnly || localJourney || localSellerOffers) && (env.B2B_PROXY_MODE !== 'direct' || env.B2B_TRUSTED_PROXY_IPS ||
      env.B2B_PORTAL_ENABLED === 'true' || env.B2B_PLATFORM_ADMIN_ENABLED === 'true')) return closed;
  if (localJourney && env.B2B_PORTAL_STORAGE_VERIFIED !== 'true') return closed;
  const journeyGet = new Set(['/api/b2b/v1/session','/api/b2b/v1/catalogue','/api/b2b/v1/offers',
    '/api/b2b/v1/enquiries','/api/b2b/v1/messages','/api/b2b/v1/review-queue']);
  const journeyPost = new Set(['/api/b2b/v1/login','/api/b2b/v1/logout','/api/b2b/v1/profile',
    '/api/b2b/v1/companies/review','/api/b2b/v1/offers/save','/api/b2b/v1/offers/publish','/api/b2b/v1/offers/close',
    '/api/b2b/v1/enquiries/send','/api/b2b/v1/enquiries/reply','/api/b2b/v1/enquiries/close']);
  let pool, transport;
  try {
    const hostedMarketplace=hostedMarketplaceEnabled(env);
    companyReviewBinding(env);const adminConfig=adminConfiguration(env),companyReviewEnabled=false,adminEnabled=Boolean(adminConfig);
    if(production&&(env.B2B_PLATFORM_ADMIN_ENABLED!=='false'||env.B2B_PLATFORM_ADMIN_USER_IDS))throw Error('MEMBER_ADMIN_GRANTS_FORBIDDEN');
    if(env.B2B_PUBLIC_PREVIEW_MODE&&!['disabled','public-preview-v1'].includes(env.B2B_PUBLIC_PREVIEW_MODE))throw Error('PUBLIC_PREVIEW_CONFIGURATION');
    if(env.B2B_PUBLIC_PREVIEW_MODE==='public-preview-v1'&&!hostedMarketplace&&!localPublicPreview)throw Error('PUBLIC_PREVIEW_MARKETPLACE_REQUIRED');
    const publicPreviewEnabled=localPublicPreview||(hostedMarketplace&&env.B2B_PUBLIC_PREVIEW_MODE==='public-preview-v1');
    const config = b2bDatabaseConfig(env);
    if (!production && (config.host !== '127.0.0.1' || config.port !== 3306)) return closed;
    if(production && (config.socketPath!==PRODUCTION_DB_SOCKET||config.database!=='u230581718_seedtrade_b2b'||config.user!=='u230581718_b2b_prod'||env.B2B_PROXY_MODE!=='trusted'||env.B2B_TRUSTED_PROXY_IPS!=='127.0.0.1'))return closed;
    if (!production && (config.database !== 'u230581718_staging_b2b' || config.user !== 'u230581718_b2b_stage')) return closed;
    if (production && (!/^[A-Za-z0-9_]{1,64}$/.test(config.database) || !/^[A-Za-z0-9_]{1,80}$/.test(config.user) ||
        ['u230581718_staging_b2b','u230581718_seedtrade_test'].includes(config.database) ||
        ['u230581718_b2b_stage','u230581718_st_test','root'].includes(config.user))) return closed;
    const resolveClient = createProxyPolicy({...env, B2B_PROXY_VERIFIED: env.B2B_REGISTRATION_PROXY_VERIFIED});
    const mode = env.B2B_REGISTRATION_MAIL_TRANSPORT ?? 'test-stream';
    if (!['test-stream','smtp'].includes(mode)) return closed;
    const mail = (dependencies.createMail ?? createB2bRegistrationMail)(env);
    transport = mail.transport;
    const verificationMailer = createB2bVerificationMailer({...mail, origin: env.SEEDTRADE_PUBLIC_ORIGIN});
    const driver = dependencies.driver ?? (await import('mysql2/promise')).default;
    pool = driver.createPool({...config, timezone: 'Z', multipleStatements: false,
      namedPlaceholders: false, flags: ['-LOCAL_FILES']});
    const guardedPool = {
      async getConnection() {
        const connection = await pool.getConnection();
        try {
          // Check the acquired connection before any transaction or write.
          const [rows] = await connection.execute(production?'SELECT DATABASE() AS db, CURRENT_USER() AS account, CURRENT_ROLE() AS activeRole':'SELECT DATABASE() AS db, CURRENT_USER() AS account');
          if (rows.length !== 1 || rows[0].db !== config.database ||
              !(production?[`${config.user}@localhost`]:[`${config.user}@127.0.0.1`, `${config.user}@localhost`]).includes(rows[0].account)||(production&&rows[0]?.activeRole!=null)) {
            throw new Error('B2B_DATABASE_IDENTITY');
          }
          return connection;
        } catch {
          connection.destroy();
          throw new Error('B2B_DATABASE_UNAVAILABLE');
        }
      }
    };
    const mailer = {
      async sendVerification(message) {
        await verificationMailer.sendVerification(message);
        // Stream generation is never delivery. Preserve the committed account,
        // but return PENDING_EMAIL_DELIVERY rather than claiming an email was sent.
        if (mode !== 'smtp') throw new Error('TEST_TRANSPORT_DISABLED');
      }
    };
    const limit = createB2bRateLimiter();
    const passwordHasher=createB2bPasswordHasher();
    const portalEnabled=env.B2B_PORTAL_ENABLED==='true'&&env.B2B_PORTAL_STORAGE_VERIFIED==='true';
    // Separate explicit activation; the original eighteen Phase 1 flags stay exact.
    // No portal, reviewer, catalogue, profile or marketplace routes are opened.
    const memberOnly=env.B2B_MEMBER_AUTH_MODE==='member-only-v1';
    if(env.B2B_MEMBER_AUTH_MODE && !['disabled','member-only-v1'].includes(env.B2B_MEMBER_AUTH_MODE))throw Error('MEMBER_AUTH_CONFIGURATION');
    const closedFlags=['B2B_PORTAL_ENABLED','B2B_PORTAL_STORAGE_VERIFIED','B2B_PLATFORM_ADMIN_ENABLED','B2B_MARKETPLACE_NOTIFICATIONS_ENABLED','B2B_ENQUIRIES_ENABLED','B2B_RUNTIME_VERIFIED','B2B_STORAGE_VERIFIED','B2B_PRIVACY_APPROVED','B2B_DELIVERY_ENABLED','B2B_PROXY_VERIFIED','B2B_RETENTION_DELETION_APPROVED'];
    if(memberOnly&&!hostedMarketplace&&(portalEnabled||localJourney||localResendOnly||localVerifyOnly||localSellerOffers||closedFlags.some(key=>env[key]!==((adminEnabled&&key==='B2B_PORTAL_STORAGE_VERIFIED')?'true':'false'))||
        env.B2B_PLATFORM_ADMIN_USER_IDS||mode!=='smtp'||mail.from!=='network@seedtrade.eu'))throw Error('MEMBER_AUTH_CONFIGURATION');
    let portalService,previewService,adminAuth,adminReview,tradingAdmin;
    if(portalEnabled || localResendOnly || localJourney || localSellerOffers || memberOnly) {
      let catalogue=dependencies.catalogue;
      if(memberOnly&&!hostedMarketplace&&!adminEnabled)catalogue=[];
      else if(!catalogue) {
        const master=JSON.parse(await readFile(new URL('../../dist/data/crop-master-v1.json',import.meta.url),'utf8'));
        catalogue=master.entities.filter(e=>e.classification==='PUBLIC_SAFE'&&e.propagation_kind==='TRUE_SEED'&&
          ['SPECIES','SUBSPECIES','HYBRID_SPECIES'].includes(e.rank)&&typeof e.botanical==='string')
          .map(e=>({id:e.id,name:e.name,botanical:e.botanical,category:e.category}));
      }
      let adminUserIds=[];
      if(localJourney) {
        adminUserIds=dependencies.localReviewerUserIds ?? [];
        if(!Array.isArray(adminUserIds)||new Set(adminUserIds).size!==adminUserIds.length||
          adminUserIds.some(id=>!Number.isSafeInteger(id)||id<1))throw Error('B2B_ADMIN_CONFIGURATION');
      } else if(env.B2B_PLATFORM_ADMIN_ENABLED==='true') {
        const ids=env.B2B_PLATFORM_ADMIN_USER_IDS??'';
        if(!/^[1-9][0-9]*(?:,[1-9][0-9]*)*$/.test(ids))throw Error('B2B_ADMIN_CONFIGURATION');
        adminUserIds=ids.split(',').map(Number);
      }
      if(hostedMarketplace){
        if(mail.from!=='network@seedtrade.eu')throw Error('MARKETPLACE_SENDER_REQUIRED');
        const db=await guardedPool.getConnection();try{const [columns]=await db.execute("SELECT COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='b2b_offers' AND COLUMN_NAME='details_json'");if(columns.length!==1||!['longtext','json'].includes(columns[0].COLUMN_TYPE)||columns[0].IS_NULLABLE!=='YES')throw Error('MARKETPLACE_SCHEMA_REQUIRED');}finally{db.release();}
      }
      const repository=createMysqlB2bRepository(guardedPool);
      if(publicPreviewEnabled)previewService=createPublicPreviewService({repository,catalogue});
      if(adminEnabled){
        const db=await guardedPool.getConnection();try{
          await db.execute('SELECT id,totp_encrypted,conflict_company_ids,owner_authorization_ref,auth_version FROM b2b_platform_admins LIMIT 0');
          await db.execute('SELECT token_hash,admin_id,auth_version,expires_at FROM b2b_platform_admin_sessions LIMIT 0');
          await db.execute('SELECT platform_admin_id FROM b2b_audit_log LIMIT 0');
        }finally{db.release();}
        adminAuth=createAdminService({repository,passwordHasher,key:adminConfig.key});
        adminReview=createB2bPortalService({repository,passwordHasher,mailer,catalogue,memberOnly:true,adminUserIds:[],reviewActor:adminAuth.authenticate});
      }
      let notifications=null;
      if(env.B2B_MARKETPLACE_NOTIFICATIONS_ENABLED==='true'||localEnquiries) {
        if(mode!=='smtp'&&!localEnquiries)throw Error('REAL_NOTIFICATION_SMTP_REQUIRED');
        notifications=createMarketplaceNotifications({repository,...mail,origin:env.SEEDTRADE_PUBLIC_ORIGIN});
      }
      let trading=null,listingDelivery=null;
      if(localTrading){
        const db=await guardedPool.getConnection();try{for(const table of ['b2b_trading_records','b2b_listing_preferences','b2b_listing_notices'])await db.execute('SELECT 1 FROM '+table+' LIMIT 0');}finally{db.release();}
        trading=createTradingWorkflow({localOnly:true,ErrorType:B2bError,catalogue});
        listingDelivery=createListingNotifications({repository,...mail,origin:env.SEEDTRADE_PUBLIC_ORIGIN});
        if(adminAuth)tradingAdmin=createTradingAdmin({repository,auth:adminAuth,workflow:trading,bindings:dependencies.brokerageBindings??[],ErrorType:B2bError});
      }
      portalService=createB2bPortalService({repository,passwordHasher,mailer:{...mailer,sendPasswordReset:message=>verificationMailer.sendPasswordReset(message)},catalogue,memberOnly,communications:localEnquiries||hostedMarketplace,adminUserIds,notifications,trading,listingDelivery});
    }
    const portal=createB2bPortalHttp({service:portalService,allowedOrigin:env.SEEDTRADE_PUBLIC_ORIGIN,allowedOrigins:production?PRODUCTION_BROWSER_ORIGINS:[env.SEEDTRADE_PUBLIC_ORIGIN],resolveClient,enabled:portalEnabled || localResendOnly || localJourney || localSellerOffers || memberOnly,memberOnly:memberOnly&&!hostedMarketplace,sellerOnly:localSellerOffers&&!localBuyerDiscovery,discoveryOnly:localBuyerDiscovery||hostedMarketplace,communications:localEnquiries||hostedMarketplace,recoveryEnabled:memberOnly,companyReviewEnabled,tradingEnabled:localTrading});
    const admin=createAdminHttp({auth:adminAuth,review:adminReview,enabled:adminEnabled,resolveClient,allowedOrigins:production?PRODUCTION_BROWSER_ORIGINS:[env.SEEDTRADE_PUBLIC_ORIGIN],trading:tradingAdmin});
    const preview=createPublicPreviewHttp({service:previewService,enabled:publicPreviewEnabled,resolveClient,allowedOrigins:production?PRODUCTION_BROWSER_ORIGINS:[env.SEEDTRADE_PUBLIC_ORIGIN]});
    const api = createB2bRegistrationModule({pool: guardedPool, mailer,passwordHasher,
      rateLimiter: req => {
        const client = resolveClient(req);
        return client ? limit({url: req.url, socket: {remoteAddress: client}}) : false;
      }, allowedOrigin: env.SEEDTRADE_PUBLIC_ORIGIN, allowedOrigins:production?PRODUCTION_BROWSER_ORIGINS:[env.SEEDTRADE_PUBLIC_ORIGIN], enabled: true});
    return {
      async handle(req, res) {
        if(await admin(req,res))return true;
        if(await preview(req,res))return true;
        if (localVerifyOnly) {
          if (req.method === 'POST' && req.url === '/api/b2b/v1/verify-email') return api(req,res);
          return handleDisabledB2bApi(req,res);
        }
        if (localResendOnly) {
          // Delegate the exact endpoint to the unchanged Origin/TLS/password/rate-limit
          // handler. All other B2B operations, including registration/login, stay closed.
          if (req.method === 'POST' && req.url === '/api/b2b/v1/resend-verification') return portal(req,res);
          return handleDisabledB2bApi(req,res);
        }
        if (localJourney) {
          let url;try{url=new URL(req.url,'http://localhost');}catch{return false;}
          const status=req.method==='GET' && req.url==='/api/b2b/v1/status';
          if(!status && !(req.method==='GET'&&journeyGet.has(url.pathname)) &&
            !(req.method==='POST'&&!url.search&&journeyPost.has(url.pathname)))return handleDisabledB2bApi(req,res);
        }
        if (req.method === 'GET' && req.url?.split('?')[0] === '/api/b2b/v1/status') {
          res.writeHead(200, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store',
            'X-Content-Type-Options':'nosniff'});
          const available=Boolean(resolveClient(req));
          res.end(JSON.stringify({...((localTrading)?{tradingAvailable:available}:{}),...((companyReviewEnabled)?{companyReviewAvailable:available}:{}),...((publicPreviewEnabled)?{publicPreviewAvailable:available}:{}),...(memberOnly?{memberSignInAvailable:available,passwordResetAvailable:available}:{}),...((localSellerOffers||hostedMarketplace)?{memberSignInAvailable:available,sellerOffersAvailable:available,...((localBuyerDiscovery||hostedMarketplace)?{buyerDiscoveryAvailable:available,...((localEnquiries||hostedMarketplace)?{enquiriesAvailable:available}:{})}:{})}:{}),registrationAvailable:available&&!localJourney,
            portalAvailable:available&&(portalEnabled||localJourney),
            verificationResendAvailable:available&&portalEnabled&&!localJourney}));
          return true;
        }
        if(await portal(req,res))return true;
        return api(req, res);
      },
      async close() {
        try { await portalService?.drainResetMail();transport.close(); }
        finally { await pool.end(); }
      }
    };
  } catch {
    try { transport?.close(); } catch { /* Cleanup cannot bypass the closed boundary. */ }
    await pool?.end().catch(() => {});
    return closed;
  }
}
