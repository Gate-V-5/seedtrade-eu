import { mkdir, realpath, open, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const applicationRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
// Operator-only module. Never imported by frontend, never exposed by a web endpoint.
export function privateProcedures({store,authorised=false,exportDirectory}) {
  const requireAccess=()=>{if(authorised!==true)throw new Error('Authorised private operator required')}
  return {
    async exportOne(id){
      requireAccess()
      if(!path.isAbsolute(exportDirectory||''))throw new Error('Private absolute export directory required')
      await mkdir(exportDirectory,{recursive:true,mode:0o700})
      const directory=await realpath(exportDirectory)
      if ((await stat(directory)).mode & 0o077) throw new Error('Export directory must be private to its owner')
      if(directory===applicationRoot||directory.startsWith(applicationRoot+path.sep))throw new Error('Exports must be outside application and public bundles')
      const record=await store.exportOne(id)
      if(!record)return null
      if(record.ENQUIRY_ID!==id||!/^[a-f0-9-]{36}$/i.test(id))throw new Error('Invalid private record')
      const file=path.join(directory,id+'.json'),handle=await open(file,'wx',0o600)
      try{await handle.writeFile(JSON.stringify(record,null,2)+'\n')}finally{await handle.close()}
      return file
    },
    async deleteOne(id,{confirmed=false}={}){requireAccess();if(!confirmed)throw new Error('Explicit deletion confirmation required');return store.deleteOne(id)},
    async purge({confirmed=false}={}){requireAccess();if(!confirmed)throw new Error('Explicit retention approval required');return store.purge()}
  }
}
