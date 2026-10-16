import {describe,it,expect} from 'vitest';
import {Readable} from 'node:stream';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {mediaCapturePlugin} from '../scripts/media-middleware';

describe('local capture boundary',()=>{
  it('writes only bounded same-origin PNG frames under the ignored capture folder',async()=>{
    const root=await mkdtemp(tmpdir()+'/dream-media-');
    let handle:any;
    const plugin=mediaCapturePlugin();
    const configure=plugin.configureServer as Function;
    configure({config:{root,logger:{error:()=>{}}},middlewares:{use:(fn:Function)=>{handle=fn;}}});
    const png=Buffer.from([137,80,78,71,13,10,26,10]);
    async function request(url:string,origin='http://127.0.0.1:5173',body=png){
      const req=Object.assign(Readable.from([body]),{url,method:'POST',headers:{host:'127.0.0.1:5173',origin,'content-type':'image/png'}});
      let status=0;
      const res={writeHead:(n:number)=>{status=n;return res;},end:()=>{}};
      await handle(req,res,()=>{status=404;});return status;
    }
    try{
      expect(await request('/__media/driving/0000.png')).toBe(204);
      expect(await readFile(root+'/.npm-cache/media/driving/0000.png')).toEqual(png);
      expect(await request('/__media/locomotion/0000.png')).toBe(204);
      expect(await request('/__media/swimming/0000.png')).toBe(204);
      expect(await request('/__media/daynight/0000.png')).toBe(204);
      expect(await request('/__media/driving/0001.png','https://other.example')).toBe(403);
      expect(await request('/__media/../../README.md')).toBe(400);
      expect(await request('/__media/driving/0600.png')).toBe(400);
      expect(await request('/__media/driving/0001.png',undefined,Buffer.from('not a PNG'))).toBe(400);
      expect(await request('/__media/driving/0001.png',undefined,Buffer.alloc(12_000_001))).toBe(413);
    }finally{await rm(root,{recursive:true,force:true});}
  });
});
