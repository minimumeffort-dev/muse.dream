import {mkdir,writeFile} from 'node:fs/promises';
import type {Plugin} from 'vite';

export function mediaCapturePlugin():Plugin {
  return {name:'local-media-capture',apply:'serve',configureServer(server){
    server.middlewares.use(async(req,res,next)=>{
      if(!req.url?.startsWith('/__media/'))return next();
      const match=/^\/__media\/(navigation|sharedrecipe|shelter|attendance|upstairs|stairs|rest|home|weather|schoolroom|nursery|recovery|actions|hand|equipment|scooter|wardrobe|fixturefall|fixturerepair|fauna|furniture|cover|botany|canopy|utility|character|driving|boost|football|basketball|switching|destruction|voxels|locomotion|swimming|daynight|flight|pedestrians|wildlife|conversation|commerce|delivery|parking|repair|maintenance|lamps|treefall|lamprepair|streetrepair|planting|growth|courier|handoff|interior|interiornight|transit|recipes|progression|meals|kitchen|seating|hours|shifts|shared|hosted|airportrepair|schoolrepair|business|park)\/(\d{4})\.png$/.exec(req.url);
      if(req.method!=='POST' || !match || Number(match[2])>=(match[1]==='navigation' ? 180 : match[1]==='rest' || match[1]==='stairs' ? 360 : match[1]==='home' ? 300 : match[1]==='weather' ? 240 : match[1]==='nursery' ? 420 : match[1]==='recovery' ? 300 : match[1]==='hosted' ? 420 : match[1]==='shared' || match[1]==='pedestrians' ? 720 : match[1]==='sharedrecipe' || match[1]==='shelter' || match[1]==='attendance' || match[1]==='upstairs' || match[1]==='equipment' || match[1]==='progression' || match[1]==='meals' || match[1]==='kitchen' || match[1]==='seating' || match[1]==='hours' ? 480 : match[1]==='repair' ? 840 : match[1]==='growth' ? 900 : match[1]==='courier' || match[1]==='recipes' ? 360 : match[1]==='handoff' ? 540 : match[1]==='scooter' || match[1]==='wardrobe' || match[1]==='fixturefall' || match[1]==='fauna' || match[1]==='furniture' || match[1]==='cover' || match[1]==='botany' || match[1]==='canopy' || match[1]==='utility' || match[1]==='interiornight' || match[1]==='transit' || match[1]==='treefall' ? 240 : 600)){res.writeHead(400).end();return;}
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
