import {createRegistrationService} from './registrationService.mjs';
import {createB2bPasswordHasher} from './passwordHasher.mjs';
import {createMysqlB2bRepository} from './mysqlRegistrationRepository.mjs';
import {createB2bRegistrationHttp} from './registrationHttp.mjs';

// Explicit staging-only readiness decision. A flag alone must never activate
// the API; database, mail, proxy and privacy evidence remain separate gates.
export function b2bRegistrationReadiness(env = {}) {
  const required = [
    'B2B_REGISTRATION_ENABLED',
    'B2B_REGISTRATION_RUNTIME_VERIFIED',
    'B2B_REGISTRATION_STORAGE_VERIFIED',
    'B2B_REGISTRATION_MAIL_VERIFIED',
    'B2B_REGISTRATION_PROXY_VERIFIED',
    'B2B_REGISTRATION_PRIVACY_APPROVED'
  ];
  const staging = env.SEEDTRADE_RUNTIME_ENV === 'staging' &&
    env.SEEDTRADE_PUBLIC_ORIGIN === 'https://staging.seedtrade.eu' &&
    env.SEEDTRADE_MAIL_TRANSPORT === 'test-stream';
  const gates = Object.fromEntries(required.map(key => [key, env[key] === 'true']));
  return {
    status: staging && Object.values(gates).every(Boolean) ? 'READY_FOR_ISOLATED_TEST' : 'BLOCKED',
    staging,
    gates
  };
}

// Isolated composition only. Never mounted by server/index.mjs.
// Runtime activation needs a separate owner-approved integration.
export function createB2bRegistrationModule(options) {
  const repository = createMysqlB2bRepository(options.pool);
  const service = createRegistrationService({repository, passwordHasher:options.passwordHasher ?? createB2bPasswordHasher(), mailer:options.mailer});
  return createB2bRegistrationHttp({service, rateLimiter:options.rateLimiter, allowedOrigin:options.allowedOrigin, enabled:options.enabled === true});
}
