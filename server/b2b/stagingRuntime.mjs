// Staging-only composition. No connections or mail transports while gates are closed.
import {b2bRegistrationReadiness, createB2bRegistrationModule} from './createRegistrationModule.mjs';
import {b2bDatabaseConfig} from './databaseReadiness.mjs';
import {handleDisabledB2bApi} from './disabledApi.mjs';
import {createB2bRateLimiter} from './rateLimiter.mjs';
import {createB2bRegistrationMail, createB2bVerificationMailer} from './verificationMailer.mjs';
import {createProxyPolicy} from '../networkProxyPolicy.mjs';
import {readFile} from 'node:fs/promises';
import {createMysqlB2bRepository} from './mysqlRegistrationRepository.mjs';
import {createB2bPasswordHasher} from './passwordHasher.mjs';
import {createB2bPortalService} from './portalService.mjs';
import {createB2bPortalHttp} from './portalHttp.mjs';

export async function createB2bStagingRuntime(env, dependencies = {}) {
  const closed = {handle: handleDisabledB2bApi, close: async () => {}};
  if (b2bRegistrationReadiness(env).status !== 'READY_FOR_ISOLATED_TEST') return closed;
  let pool, transport;
  try {
    const config = b2bDatabaseConfig(env);
    if (config.host !== '127.0.0.1' || config.port !== 3306 ||
        config.database !== 'u230581718_staging_b2b' || config.user !== 'u230581718_b2b_stage') return closed;
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
          const [rows] = await connection.execute('SELECT DATABASE() AS db, CURRENT_USER() AS account');
          if (rows.length !== 1 || rows[0].db !== config.database ||
              !['u230581718_b2b_stage@127.0.0.1', 'u230581718_b2b_stage@localhost'].includes(rows[0].account)) {
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
    let portalService;
    if(portalEnabled) {
      let catalogue=dependencies.catalogue;
      if(!catalogue) {
        const master=JSON.parse(await readFile(new URL('../../dist/data/crop-master-v1.json',import.meta.url),'utf8'));
        catalogue=master.entities.filter(e=>e.classification==='PUBLIC_SAFE'&&e.propagation_kind==='TRUE_SEED'&&
          ['SPECIES','SUBSPECIES','HYBRID_SPECIES'].includes(e.rank)&&typeof e.botanical==='string')
          .map(e=>({id:e.id,name:e.name,botanical:e.botanical,category:e.category}));
      }
      let adminUserIds=[];
      if(env.B2B_PLATFORM_ADMIN_ENABLED==='true') {
        const ids=env.B2B_PLATFORM_ADMIN_USER_IDS??'';
        if(!/^[1-9][0-9]*(?:,[1-9][0-9]*)*$/.test(ids))throw Error('B2B_ADMIN_CONFIGURATION');
        adminUserIds=ids.split(',').map(Number);
      }
      portalService=createB2bPortalService({repository:createMysqlB2bRepository(guardedPool),passwordHasher,mailer,catalogue,adminUserIds});
    }
    const portal=createB2bPortalHttp({service:portalService,allowedOrigin:env.SEEDTRADE_PUBLIC_ORIGIN,resolveClient,enabled:portalEnabled});
    const api = createB2bRegistrationModule({pool: guardedPool, mailer,passwordHasher,
      rateLimiter: req => {
        const client = resolveClient(req);
        return client ? limit({url: req.url, socket: {remoteAddress: client}}) : false;
      }, allowedOrigin: env.SEEDTRADE_PUBLIC_ORIGIN, enabled: true});
    return {
      async handle(req, res) {
        if (req.method === 'GET' && req.url?.split('?')[0] === '/api/b2b/v1/status') {
          res.writeHead(200, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store',
            'X-Content-Type-Options':'nosniff'});
          const available=Boolean(resolveClient(req));
          res.end(JSON.stringify({registrationAvailable:available,portalAvailable:available&&portalEnabled}));
          return true;
        }
        if(await portal(req,res))return true;
        return api(req, res);
      },
      async close() {
        try { transport.close(); }
        finally { await pool.end(); }
      }
    };
  } catch {
    try { transport?.close(); } catch { /* Cleanup cannot bypass the closed boundary. */ }
    await pool?.end().catch(() => {});
    return closed;
  }
}
