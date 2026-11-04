import test from 'node:test';
import assert from 'node:assert/strict';
import {createB2bVerificationMailer} from '../server/b2b/verificationMailer.mjs';

test('verification mail uses injected transport and a scoped confirmation URL',async()=>{
  const messages=[];
  const mailer=createB2bVerificationMailer({
    transport:{async sendMail(message){messages.push(message);}},
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
test('invalid messages are rejected before any email is sent',async()=>{
  let count=0;
  const mailer=createB2bVerificationMailer({
    transport:{async sendMail(){count++;}},from:'verify@example.test',origin:'https://staging.seedtrade.eu'
  });
  await assert.rejects(()=>mailer.sendVerification({email:'invalid',token:'bad',userId:0}),/INVALID_VERIFICATION_MESSAGE/);
  assert.equal(count,0);
});
