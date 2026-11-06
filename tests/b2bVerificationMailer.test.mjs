import test from 'node:test';
import assert from 'node:assert/strict';
import {createB2bRegistrationMail, createB2bVerificationMailer} from '../server/b2b/verificationMailer.mjs';

test('verification mail uses injected transport and a scoped confirmation URL',async()=>{
  const messages=[];
  const mailer=createB2bVerificationMailer({
    transport:{async sendMail(message){messages.push(message);return {accepted:[message.to],rejected:[]};}},
    from:'SeedTrade <verify@example.test>',origin:'https://staging.seedtrade.eu'
  });
  await mailer.sendVerification({email:'user@example.test',token:'a'.repeat(64),userId:42});
  assert.equal(messages.length,1);
  assert.equal(messages[0].to,'user@example.test');
  const link = messages[0].text.match(/https:\/\/[^\s]+/)[0];
  const url = new URL(link);
  assert.equal(url.pathname, '/b2b/verify-email');
  assert.equal(url.search, '');
  assert.equal(new URLSearchParams(url.hash.slice(1)).get('user'), '42');
  assert.equal(new URLSearchParams(url.hash.slice(1)).get('token'), 'a'.repeat(64));
  assert.equal(messages[0].disableFileAccess,true);
});

test('registration-only SMTP enforces TLS without changing the shared staging mail mode',()=>{
  for(const port of ['465','587']) {
    const env={SEEDTRADE_RUNTIME_ENV:'staging',SEEDTRADE_PUBLIC_ORIGIN:'https://staging.seedtrade.eu',
      SEEDTRADE_MAIL_TRANSPORT:'test-stream',B2B_REGISTRATION_MAIL_TRANSPORT:'smtp',
      SMTP_HOST:'smtp.example.test',SMTP_PORT:port,SMTP_USER:'synthetic',SMTP_PASS:'synthetic',SMTP_FROM:'verify@example.test'};
    const before=structuredClone(env);let options;
    createB2bRegistrationMail(env,value=>{options=value;return {};});
    assert.equal(options.secure,port==='465');assert.equal(options.requireTLS,true);
    assert.deepEqual(options.tls,{servername:env.SMTP_HOST,minVersion:'TLSv1.2',rejectUnauthorized:true});
    assert.equal(options.logger,false);assert.equal(options.debug,false);
    assert.equal(options.socketTimeout,5000);assert.equal(options.disableFileAccess,true);
    assert.deepEqual(env,before);
    for(const altered of [{SEEDTRADE_RUNTIME_ENV:'production'},{SEEDTRADE_MAIL_TRANSPORT:'smtp'},
      {SMTP_HOST:'127.0.0.1'},{SMTP_HOST:'unverified-host'},{SMTP_FROM:'sender@example.test\r\nBcc:other@example.test'},
      {SMTP_PORT:'25'},{SMTP_PASS:''},{B2B_REGISTRATION_MAIL_TRANSPORT:'unknown'}]) {
      let created=false;
      assert.throws(()=>createB2bRegistrationMail({...env,...altered},()=>{created=true;}));
      assert.equal(created,false);
    }
  }
});

test('stream output, wrong recipient, deferred and rejected recipients cannot count as SMTP acceptance',async()=>{
  for(const result of [undefined,{message:Buffer.from('stream')},{accepted:[]},
    {accepted:['other@example.test']},{accepted:['user@example.test'],rejected:['user@example.test']},
    {accepted:['user@example.test'],pending:['user@example.test']}]) {
    const mailer=createB2bVerificationMailer({transport:{async sendMail(){return result;}},
      from:'verify@example.test',origin:'https://staging.seedtrade.eu'});
    await assert.rejects(mailer.sendVerification({email:'user@example.test',token:'a'.repeat(64),userId:42}),/B2B_MAIL_NOT_ACCEPTED/);
  }
});

test('mail deadline returns an unknown outcome without retrying a possibly sent message',async()=>{
  let calls=0;
  const mailer=createB2bVerificationMailer({transport:{sendMail(){calls++;return new Promise(()=>{});}},
    from:'verify@example.test',origin:'https://staging.seedtrade.eu',timeoutMs:5});
  await assert.rejects(mailer.sendVerification({email:'user@example.test',token:'a'.repeat(64),userId:42}),/B2B_MAIL_OUTCOME_UNKNOWN/);
  assert.equal(calls,1);
});
test('invalid messages are rejected before any email is sent',async()=>{
  let count=0;
  const mailer=createB2bVerificationMailer({
    transport:{async sendMail(){count++;}},from:'verify@example.test',origin:'https://staging.seedtrade.eu'
  });
  await assert.rejects(()=>mailer.sendVerification({email:'invalid',token:'bad',userId:0}),/INVALID_VERIFICATION_MESSAGE/);
  assert.equal(count,0);
});
