import {test} from 'node:test'
import {execFileSync} from 'node:child_process'
test('scoped multilingual accessibility regression',()=>{execFileSync(process.execPath,['scripts/check_accessibility_1e2.mjs'],{stdio:'pipe',timeout:120000})})
