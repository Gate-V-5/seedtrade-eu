// Run only in the existing owner-controlled Linux administration shell, not in chat.
import {readFile,stat,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import {createB2bPasswordHasher} from '../server/b2b/passwordHasher.mjs';
import {mfaKey} from '../server/b2b/adminMfa.mjs';
import {provisionFirstAdmin} from '../server/b2b/adminProvision.mjs';
let db;
try{
 if(process.platform!=='linux'||process.getuid?.()!==0||process.argv.length!==4)throw Error('OWNER_PRIVATE_INPUT_REQUIRED');
 const inputPath=await realpath(process.argv[2]),outPath=path.resolve(process.argv[3]);
 const st=await stat(inputPath),parent=await stat(path.dirname(outPath));
 if(!st.isFile()||st.size>16384||(st.mode&0o077)||(parent.mode&0o077)||st.uid!==process.getuid()||parent.uid!==process.getuid()||inputPath===outPath)throw Error('PRIVATE_OWNER_FILE_REQUIRED');
 const credentialsPath='/etc/seedtrade-production-db/credentials.json',cs=await stat(credentialsPath);if((cs.mode&0o077)||cs.uid!==0)throw Error('PRIVATE_EXISTING_MIGRATOR_RECORD_REQUIRED');
 const credentials=JSON.parse(await readFile(credentialsPath,'utf8'));
 const cfg={socketPath:'/run/seedtrade-production-db/mariadb.sock',database:'u230581718_seedtrade_b2b',user:'seedtrade_prod_migrator',password:credentials.migrator};
 db=await mysql.createConnection({...cfg,multipleStatements:false,flags:['-LOCAL_FILES']});
 const [[identity]]=await db.execute('SELECT DATABASE() AS db,CURRENT_USER() AS account');if(identity.db!==cfg.database||identity.account!=='seedtrade_prod_migrator@localhost')throw Error('ADMIN_DATABASE_IDENTITY');
 const input=JSON.parse(await readFile(inputPath,'utf8'));
 const result=await provisionFirstAdmin({db,input,passwordHasher:createB2bPasswordHasher(),key:mfaKey(process.env.B2B_ADMIN_MFA_KEY),writeEnrollment:v=>writeFile(outPath,JSON.stringify(v)+'\n',{mode:0o600,flag:'wx'})});
 process.stdout.write(result.status+'\n');
}catch{process.stderr.write('ADMIN_PROVISIONING_STOPPED: verify private inputs, owner assignment, schema and existing first account. No secrets displayed.\n');process.exitCode=1;}finally{await db?.end();}
