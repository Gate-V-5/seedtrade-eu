import {legalPublicationApproved} from './legalAcceptance.mjs';
import {createRegistrationService} from './registrationService.mjs';
import {createB2bPasswordHasher} from './passwordHasher.mjs';
import {createMysqlB2bRepository} from './mysqlRegistrationRepository.mjs';
import {createB2bRegistrationHttp} from './registrationHttp.mjs';

// Exact runtime identities only. Production requires a separate release approval;
// copied staging flags cannot activate the production application.
export function b2bRuntimeIdentity(env = {}) {
  if (env.SEEDTRADE_RUNTIME_ENV === 'staging' &&
      env.SEEDTRADE_PUBLIC_ORIGIN === 'https://staging.seedtrade.eu' &&
      env.SEEDTRADE_MAIL_TRANSPORT === 'test-stream') return 'staging';
  if (env.SEEDTRADE_RUNTIME_ENV === 'production' &&
      env.SEEDTRADE_PUBLIC_ORIGIN === 'https://seedtrade.eu' &&
      env.SEEDTRADE_MAIL_TRANSPORT === 'smtp' &&
      env.B2B_REGISTRATION_MAIL_TRANSPORT === 'smtp' &&
      env.B2B_PRODUCTION_RELEASE_APPROVED === 'true') return 'production';
  return null;
}

// Database, mail, proxy and privacy evidence remain independent activation gates.
export function b2bRegistrationReadiness(env = {}) {
  const required = [
    'B2B_REGISTRATION_ENABLED',
    'B2B_REGISTRATION_RUNTIME_VERIFIED',
    'B2B_REGISTRATION_STORAGE_VERIFIED',
    'B2B_REGISTRATION_MAIL_VERIFIED',
    'B2B_REGISTRATION_PROXY_VERIFIED',
    'B2B_REGISTRATION_PRIVACY_APPROVED'
  ];
  const identity = b2bRuntimeIdentity(env);
  const staging = identity === 'staging';
  const gates = Object.fromEntries(required.map(key => [key, env[key] === 'true']));
  return {
    status: identity && legalPublicationApproved() && Object.values(gates).every(Boolean)
      ? staging ? 'READY_FOR_ISOLATED_TEST' : 'READY_FOR_PRODUCTION_RELEASE' : 'BLOCKED',
    staging,
    gates
  };
}

// Reused by the gated staging runtime and offline tests.
export function createB2bRegistrationModule(options) {
  const repository = createMysqlB2bRepository(options.pool);
  const service = createRegistrationService({repository, passwordHasher:options.passwordHasher ?? createB2bPasswordHasher(), mailer:options.mailer});
  return createB2bRegistrationHttp({service, rateLimiter:options.rateLimiter, allowedOrigin:options.allowedOrigin, allowedOrigins:options.allowedOrigins, enabled:options.enabled === true});
}
