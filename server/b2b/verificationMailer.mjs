// Adapter for the existing SeedTrade mail transport; no new SMTP infrastructure.
// No message is sent until sendVerification is explicitly invoked.
import nodemailer from 'nodemailer';
import {isIP} from 'node:net';
import {createRuntimeMail} from '../runtimeMail.mjs';

// Called only after all registration gates pass. The shared staging transport
// stays test-stream; this explicit registration setting never changes it.
export function createB2bRegistrationMail(env, createTransport = nodemailer.createTransport) {
  const mode = env.B2B_REGISTRATION_MAIL_TRANSPORT ?? 'test-stream';
  if (env.SEEDTRADE_RUNTIME_ENV !== 'staging' ||
      env.SEEDTRADE_PUBLIC_ORIGIN !== 'https://staging.seedtrade.eu' ||
      env.SEEDTRADE_MAIL_TRANSPORT !== 'test-stream') throw new Error('B2B_MAIL_CONFIGURATION');
  if (mode === 'test-stream') return createRuntimeMail(env, createTransport);
  if (mode !== 'smtp' || !['465','587'].includes(env.SMTP_PORT) ||
      typeof env.SMTP_HOST !== 'string' || isIP(env.SMTP_HOST) ||
      !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(env.SMTP_HOST) ||
      typeof env.SMTP_FROM !== 'string' || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(env.SMTP_FROM)) {
    throw new Error('B2B_MAIL_CONFIGURATION');
  }
  return createRuntimeMail({...env, SEEDTRADE_MAIL_TRANSPORT:'smtp'}, options => createTransport({
    ...options, requireTLS: true,
    tls:{servername:env.SMTP_HOST, minVersion:'TLSv1.2', rejectUnauthorized:true},
    connectionTimeout:3000, greetingTimeout:3000, socketTimeout:5000,
    logger:false, debug:false, disableFileAccess:true, disableUrlAccess:true
  }));
}

export function createB2bVerificationMailer({transport, from, origin, timeoutMs = 8000}) {
  if (!transport || typeof transport.sendMail !== 'function' ||
      typeof from !== 'string' || !from.trim() ||
      typeof origin !== 'string' || !/^https:\/\/[^/?#]+$/.test(origin) ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 8000) {
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
      // Keep the one-time credential out of HTTP request URLs and server access logs.
      // The confirmation page must read the fragment and immediately clear it
      // from browser history before POSTing it in a JSON body.
      url.hash = new URLSearchParams({user: String(userId), token}).toString();
      const message = {
        from, to: email,
        subject: 'SeedTrade — confirm your email address',
        text: 'Confirm your email address using this link (expires in 30 minutes):\n' + url.toString() +
          '\nIf you did not request this, ignore this email.',
        disableFileAccess: true,
        disableUrlAccess: true
      };
      let timer;
      try {
        const result = await Promise.race([
          Promise.resolve().then(() => transport.sendMail(message)),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('B2B_MAIL_OUTCOME_UNKNOWN')), timeoutMs);
          })
        ]);
        if (!Array.isArray(result?.accepted) || result.accepted.length !== 1 ||
            typeof result.accepted[0] !== 'string' || result.accepted[0].toLowerCase() !== email.toLowerCase() ||
            result.rejected?.length || result.pending?.length) throw new Error('B2B_MAIL_NOT_ACCEPTED');
      } finally { clearTimeout(timer); }
    }
  };
}
