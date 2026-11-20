// Owner-controlled Linux root shell only. No password, key or OTP in arguments/logs.
import {readFile,stat,realpath} from 'node:fs/promises';
import mysql from 'mysql2/promise';
import {createB2bPasswordHasher} from '../server/b2b/passwordHasher.mjs';
import {mfaKey} from '../server/b2b/adminMfa.mjs';
import {confirmAdminIdentity} from '../server/b2b/adminIdentityEnrollment.mjs';
let db;
try{
 if(process.platform!=='linux'||process.getuid?.()!==0||process.argv.length!==3)throw Error();
 const path=await realpath(process.argv[2]),s=await stat(path);
 if(!s.isFile()||s.size>16384||s.uid!==0||(s.mode&0o077))throw Error();
 const cp='/etc/seedtrade-production-db/credentials.json',cs=await stat(cp);if(cs.uid!==0||(cs.mode&0o077))throw Error();
 const credentials=JSON.parse(await readFile(cp,'utf8'));
 db=await mysql.createConnection({socketPath:'/run/seedtrade-production-db/mariadb.sock',database:'u230581718_seedtrade_b2b',user:'u230581718_b2b_prod',password:credentials.runtime,multipleStatements:false,flags:['-LOCAL_FILES']});
 const [[identity]]=await db.query('SELECT DATABASE() AS db,CURRENT_USER() AS account');
 if(identity.db!=='u230581718_seedtrade_b2b'||identity.account!=='u230581718_b2b_prod@localhost')throw Error();
 const result=await confirmAdminIdentity({db,input:JSON.parse(await readFile(path,'utf8')),passwordHasher:createB2bPasswordHasher(),key:mfaKey(process.env.B2B_ADMIN_MFA_KEY)});
 process.stdout.write(result.status+'\n');
}catch{process.stderr.write('ADMIN_ENROLLMENT_NOT_CONFIRMED: private input, password and current authenticator code required. Review remains disabled.\n');process.exitCode=1;}finally{await db?.end();}
