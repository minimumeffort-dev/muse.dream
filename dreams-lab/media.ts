import type {Plugin} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export function labMedia():Plugin{return {name:'lab-source-frames',apply:'serve',configureServer(server){
  server.middlewares.use(async(req,res,next)=>{
    if(!req.url?.startsWith('/__lab-media/'))return next();
    const match=/^\/__lab-media\/(\d{4})\.png$/.exec(req.url);
    if(req.method!=='POST'||!match||Number(match[1])>=840){res.writeHead(400).end();return;}
    if(req.headers.origin!==`http://${req.headers.host}`||req.headers['content-type']!=='image/png'){res.writeHead(403).end();return;}
    try{
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>8000000){res.writeHead(413).end();return;}chunks.push(chunk);}
      const bytes=Buffer.concat(chunks);
      if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.length<24||bytes.readUInt32BE(16)!==1600||bytes.readUInt32BE(20)!==900){res.writeHead(400).end();return;}
      const dir=fileURLToPath(new URL('./.cache/media/lab3d/',import.meta.url));
      await mkdir(dir,{recursive:true});await writeFile(`${dir}/${match[1]}.png`,bytes);res.writeHead(204).end();
    }catch(error){server.config.logger.error(String(error));res.writeHead(500).end();}
  });
}};}
