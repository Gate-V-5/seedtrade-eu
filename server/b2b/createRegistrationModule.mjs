import {createRegistrationService} from './registrationService.mjs';
import {createMysqlB2bRepository} from './mysqlRegistrationRepository.mjs';
import {createB2bRegistrationHttp} from './registrationHttp.mjs';

// Development-only composition; not mounted by the existing application.
export function createB2bRegistrationModule(options) {
  const repository = createMysqlB2bRepository(options.pool);
  const service = createRegistrationService({repository, passwordHasher:options.passwordHasher, mailer:options.mailer});
  return createB2bRegistrationHttp({service, rateLimiter:options.rateLimiter, allowedOrigin:options.allowedOrigin, enabled:options.enabled === true});
}
