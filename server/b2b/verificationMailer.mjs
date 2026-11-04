// Adapter for the existing SeedTrade mail transport; no new SMTP infrastructure.
// No message is sent until sendVerification is explicitly invoked.
export function createB2bVerificationMailer({transport, from, origin}) {
  if (!transport || typeof transport.sendMail !== 'function' ||
      typeof from !== 'string' || !from.trim() ||
      typeof origin !== 'string' || !/^https:\/\/[^/?#]+$/.test(origin)) {
    throw new TypeError('B2B_MAIL_CONFIGURATION');
  }
  return {
    async sendVerification({email, token, userId}) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) ||
          !Number.isSafeInteger(userId) || userId < 1) {
        throw new TypeError('INVALID_VERIFICATION_MESSAGE');
      }
      const url = new URL('/b2b/verify-email', origin);
      url.searchParams.set('user', String(userId));
      url.searchParams.set('token', token);
      await transport.sendMail({
        from, to: email,
        subject: 'SeedTrade — confirm your email address',
        text: 'Confirm your email address using this link (expires in 30 minutes):\n' + url.toString() +
          '\nIf you did not request this, ignore this email.',
        disableFileAccess: true,
        disableUrlAccess: true
      });
    }
  };
}
