import {mkdir,writeFile} from 'node:fs/promises';
import type {Plugin} from 'vite';

export function mediaCapturePlugin():Plugin {
  return {name:'local-media-capture',apply:'serve',configureServer(server){
    server.middlewares.use(async(req,res,next)=>{
      if(!req.url?.startsWith('/__media/'))return next();
      const match=/^\/__media\/(character|driving|boost|football|basketball|switching|destruction|voxels|locomotion|swimming|daynight|flight)\/(\d{4})\.png$/.exec(req.url);
      if(req.method!=='POST' || !match || Number(match[2])>=600){res.writeHead(400).end();return;}
      // Only the local dev page can write this fixed, ignored capture directory.
      if(req.headers.origin!==`http://${req.headers.host}` || req.headers['content-type']!=='image/png'){res.writeHead(403).end();return;}
      try{
        const chunks:Buffer[]=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>12_000_000){res.writeHead(413).end();return;}chunks.push(chunk);}
        const png=Buffer.concat(chunks);
        if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){res.writeHead(400).end();return;}
        const dir=`${server.config.root}/.npm-cache/media/${match[1]}`;
        await mkdir(dir,{recursive:true});await writeFile(`${dir}/${match[2]}.png`,png);res.writeHead(204).end();
      }catch(error){server.config.logger.error(String(error));res.writeHead(500).end();}
    });
  }};
}
