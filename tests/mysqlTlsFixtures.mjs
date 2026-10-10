// Ephemeral synthetic certificates only. No private keys are tracked or archived.
import { after } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
const directory=mkdtempSync(join(tmpdir(),'seedtrade-3q-tls-'))
after(()=>rmSync(directory,{recursive:true,force:true}))
execFileSync('python3',[new URL('./mysqlTlsFixtureGenerator.py',import.meta.url).pathname,directory])
export const fixture=name=>readFileSync(join(directory,name),'utf8')
export const syntheticCa=fixture('ca.pem')
