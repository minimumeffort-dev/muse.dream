import { readFile, readdir, open, rename, unlink, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root=fileURLToPath(new URL('../',import.meta.url));
const [command,...args]=process.argv.slice(2),write=args.includes('--write'),files=[],directories=[];
let server,features;
try {
  for(let i=0;i<args.length;i++){
    if(args[i]==='--write')continue;
    if(args[i]==='--features' && args[i+1] && !args[i+1].startsWith('--')){
      if(features)throw Object.assign(new Error('Duplicate --features'),{code:'E_USAGE'});
      features=args[++i].split(',');continue;
    }
    if(args[i]==='--modules' && args[i+1] && !args[i+1].startsWith('--'))directories.push(resolve(args[++i]));
    else if(args[i].startsWith('--'))throw Object.assign(new Error('Unknown or incomplete option: '+args[i]),{code:'E_USAGE'});
    else files.push(args[i]);
  }
  if(!['check','compile','format','migrate','contract','context'].includes(command) || (['contract','context'].includes(command) ? files.length!==0 || write || directories.length>0 : files.length!==1) || features && command!=='context' || write && !['format','migrate'].includes(command))
    throw Object.assign(new Error('Usage: npm run dream -- check|compile|format|migrate file.dream [--modules directory] [--write]; contract; or context [--features objects,world,...|all]'),{code:'E_USAGE'});
  server=await createServer({root,configFile:false,logLevel:'silent',server:{middlewareMode:true,watch:null},appType:'custom'});
  if(command==='context') {
    const {dreamAgentContext}=await server.ssrLoadModule('/src/scene/dream-agent.ts');
    process.stdout.write(JSON.stringify(dreamAgentContext(features))+'\n');
  } else if(command==='contract') {
    const {DREAM_V2_CONTRACT}=await server.ssrLoadModule('/src/scene/dream-contract.ts');
    process.stdout.write(JSON.stringify(DREAM_V2_CONTRACT,null,2)+'\n');
  } else {
    const compiler=await server.ssrLoadModule('/src/scene/dream.ts'),path=resolve(files[0]),source=await readFile(path,'utf8'),modules=Object.create(null);
    for(const directory of directories)for(const file of (await readdir(directory)).sort()){
      if(!file.endsWith('.dream') || resolve(directory,file)===path)continue;
      const name=file.slice(0,-6).replaceAll('-','_');
      if(!/^[a-z][a-z0-9_]{0,31}$/.test(name) || Object.hasOwn(modules,name))throw Object.assign(new Error('Invalid or duplicate module filename: '+file),{code:'E_MODULE'});
      if(Object.keys(modules).length>=31 || (await stat(resolve(directory,file))).size>262144)throw Object.assign(new Error('Module registry exceeds file count or size budget'),{code:'E_BUDGET'});
      modules[name]=await readFile(resolve(directory,file),'utf8');
    }
    if(command==='check') {
      const result=compiler.checkDream(source,modules);
      if(!result.ok){process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=1;}
      else {
        const {lex}=await server.ssrLoadModule('/src/scene/dream-syntax.ts'),world=result.world;
        process.stdout.write(JSON.stringify({ok:true,characters:source.length,syntaxTokens:lex(source).length-1,assemblies:world.assemblies.length,parts:world.assemblies.reduce((n,a)=>n+a.parts.length,0),joints:world.assemblies.reduce((n,a)=>n+(a.joints?.length??0),0),placements:world.objects.length,routes:world.routes.length,waters:world.waters.length,scenarios:world.scenarios.length,fullWorld:!!world.layout})+'\n');
      }
    } else {
      const output=command==='format' ? compiler.formatDream(source) : command==='migrate' ? compiler.migrateDream(source,modules) : JSON.stringify(compiler.compileDreamWorld(source,modules),null,2)+'\n';
      if(write) {
        const temp=`${path}.dream-${process.pid}.tmp`;
        const mode=(await stat(path)).mode & 0o777;
        const handle=await open(temp,'wx',mode);
        try{
          try{await handle.chmod(mode);await handle.writeFile(output);}finally{await handle.close();}
          await rename(temp,path);
        }finally{await unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}
        process.stdout.write(JSON.stringify({ok:true,path})+'\n');
      } else process.stdout.write(output);
    }
  }
} catch(error) {
  const diagnostic=error.diagnostic??{code:error.code??'E_INTERNAL',line:1,column:1,path:'source',message:error.message};
  process.stdout.write(JSON.stringify({ok:false,diagnostics:[diagnostic]})+'\n');process.exitCode=1;
} finally {await server?.close();}
