// Integrated B2B registration workflow. Not mounted on the public HTTP server.
// Inject a vetted password hasher, a transactional repository and an email sender.
// The repository must use parameterized SQL and enforce unique email/company keys.
import {normalizeCompany} from './domain.mjs';
import {normalizeEmail, issueVerificationToken, hashVerificationToken} from './emailVerification.mjs';

function requireDependency(value, method) {
  if (!value || typeof value[method] !== 'function') throw new TypeError('MISSING_B2B_DEPENDENCY');
}

export function createRegistrationService({repository, passwordHasher, mailer, now = () => Date.now()}) {
  requireDependency(repository, 'transaction');
  requireDependency(passwordHasher, 'hash');
  requireDependency(mailer, 'sendVerification');
  return {
    async register({email, password, company}) {
      const normalizedEmail = normalizeEmail(email);
      const normalizedCompany = normalizeCompany(company);
      if (typeof password !== 'string' || password.length < 12 || password.length > 1024)
        throw new TypeError('INVALID_PASSWORD');
      const passwordHash = await passwordHasher.hash(password);
      if (typeof passwordHash !== 'string' || !passwordHash) throw new Error('PASSWORD_HASH_FAILED');
      const issued = issueVerificationToken({now: now()});
      const result = await repository.transaction(async tx => {
        requireDependency(tx, 'insertCompany');
        requireDependency(tx, 'insertUser');
        requireDependency(tx, 'insertCompanyMember');
        requireDependency(tx, 'insertEmailVerification');
        requireDependency(tx, 'appendAudit');
        const companyId = await tx.insertCompany(normalizedCompany);
        const userId = await tx.insertUser({email: normalizedEmail, passwordHash});
        await tx.insertCompanyMember({companyId, userId, role: 'COMPANY_ADMIN'});
        await tx.insertEmailVerification({userId, tokenHash: issued.tokenHash, expiresAt: new Date(issued.expiresAt)});
        await tx.appendAudit({actorUserId: userId, companyId, action: 'COMPANY_REGISTRATION',
          entityType: 'company', entityId: String(companyId)});
        return {companyId, userId};
      });
      // Send only after commit; a mail failure must not roll back the committed account.
      // The caller must not report the registration as complete until delivery is handled.
      try {
        await mailer.sendVerification({email: normalizedEmail, token: issued.token});
      } catch {
        return {...result, status: 'PENDING_EMAIL_DELIVERY'};
      }
      return {...result, status: 'PENDING_EMAIL_VERIFICATION'};
    },

    async verifyEmail({userId, token}) {
      const tokenHash = hashVerificationToken(token);
      return repository.transaction(async tx => {
        requireDependency(tx, 'consumeEmailVerification');
        requireDependency(tx, 'markEmailVerified');
        requireDependency(tx, 'appendAudit');
        // consumeEmailVerification must perform an atomic UPDATE ... WHERE
        // consumed_at IS NULL AND expires_at > NOW(3), scoped to userId + tokenHash.
        const consumed = await tx.consumeEmailVerification({userId, tokenHash});
        if (consumed !== true) return {status: 'INVALID_OR_EXPIRED'};
        await tx.markEmailVerified({userId});
        await tx.appendAudit({actorUserId: userId, companyId: null, action: 'EMAIL_VERIFIED',
          entityType: 'user', entityId: String(userId)});
        return {status: 'EMAIL_VERIFIED'};
      });
    }
  };
}
