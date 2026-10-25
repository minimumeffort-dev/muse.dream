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
      expect(await request('/__media/upstairsmeal/0599.png')).toBe(204);expect(await request('/__media/upstairsmeal/0600.png')).toBe(400);
      expect(await request('/__media/stationquarter/0359.png')).toBe(204);expect(await request('/__media/stationquarter/0360.png')).toBe(400);
      expect(await request('/__media/company/0359.png')).toBe(204);expect(await request('/__media/company/0360.png')).toBe(400);
      expect(await request('/__media/loft/0539.png')).toBe(204);expect(await request('/__media/loft/0540.png')).toBe(400);
      expect(await request('/__media/seatmotion/0479.png')).toBe(204);expect(await request('/__media/seatmotion/0480.png')).toBe(400);
      expect(await request('/__media/companions/0479.png')).toBe(204);expect(await request('/__media/companions/0480.png')).toBe(400);
      expect(await request('/__media/workstations/0479.png')).toBe(204);expect(await request('/__media/workstations/0480.png')).toBe(400);
      expect(await request('/__media/driving/0000.png')).toBe(204);
      expect(await request('/__media/navigation/0179.png')).toBe(204);expect(await request('/__media/navigation/0180.png')).toBe(400);
      expect(await request('/__media/rest/0359.png')).toBe(204);expect(await request('/__media/rest/0360.png')).toBe(400);
      expect(await request('/__media/home/0299.png')).toBe(204);expect(await request('/__media/home/0300.png')).toBe(400);
      expect(await request('/__media/weather/0239.png')).toBe(204);expect(await request('/__media/weather/0240.png')).toBe(400);
      expect(await request('/__media/schoolroom/0599.png')).toBe(204);expect(await request('/__media/schoolroom/0600.png')).toBe(400);
      expect(await request('/__media/recovery/0299.png')).toBe(204);expect(await request('/__media/recovery/0300.png')).toBe(400);
      expect(await request('/__media/scooter/0239.png')).toBe(204);expect(await request('/__media/scooter/0240.png')).toBe(400);
      expect(await request('/__media/wardrobe/0239.png')).toBe(204);expect(await request('/__media/wardrobe/0240.png')).toBe(400);
      expect(await request('/__media/fixturefall/0239.png')).toBe(204);expect(await request('/__media/fixturefall/0240.png')).toBe(400);
      expect(await request('/__media/fixturerepair/0599.png')).toBe(204);expect(await request('/__media/fixturerepair/0600.png')).toBe(400);
      expect(await request('/__media/utility/0239.png')).toBe(204);expect(await request('/__media/utility/0240.png')).toBe(400);
      expect(await request('/__media/fauna/0239.png')).toBe(204);expect(await request('/__media/fauna/0240.png')).toBe(400);
      expect(await request('/__media/furniture/0239.png')).toBe(204);expect(await request('/__media/furniture/0240.png')).toBe(400);
      expect(await request('/__media/cover/0239.png')).toBe(204);expect(await request('/__media/cover/0240.png')).toBe(400);
      expect(await request('/__media/botany/0239.png')).toBe(204);expect(await request('/__media/botany/0240.png')).toBe(400);
      expect(await request('/__media/canopy/0239.png')).toBe(204);expect(await request('/__media/canopy/0240.png')).toBe(400);
      expect(await request('/__media/boost/0000.png')).toBe(204);expect(await request('/__media/parking/0000.png')).toBe(204);
      expect(await request('/__media/football/0000.png')).toBe(204);
      expect(await request('/__media/basketball/0000.png')).toBe(204);
      expect(await readFile(root+'/.npm-cache/media/driving/0000.png')).toEqual(png);
      expect(await request('/__media/locomotion/0000.png')).toBe(204);
      expect(await request('/__media/swimming/0000.png')).toBe(204);
      expect(await request('/__media/daynight/0000.png')).toBe(204);
      expect(await request('/__media/flight/0000.png')).toBe(204);
      expect(await request('/__media/pedestrians/0000.png')).toBe(204);expect(await request('/__media/pedestrians/0719.png')).toBe(204);expect(await request('/__media/pedestrians/0720.png')).toBe(400);expect(await request('/__media/wildlife/0000.png')).toBe(204);expect(await request('/__media/commerce/0000.png')).toBe(204);
      expect(await request('/__media/repair/0839.png')).toBe(204);expect(await request('/__media/repair/0840.png')).toBe(400);
      expect(await request('/__media/maintenance/0599.png')).toBe(204);expect(await request('/__media/maintenance/0600.png')).toBe(400);
      expect(await request('/__media/lamps/0239.png')).toBe(204);expect(await request('/__media/treefall/0239.png')).toBe(204);expect(await request('/__media/treefall/0240.png')).toBe(400);expect(await request('/__media/lamprepair/0359.png')).toBe(204);expect(await request('/__media/streetrepair/0359.png')).toBe(204);
      expect(await request('/__media/streetrepair/0600.png')).toBe(400);
      expect(await request('/__media/planting/0359.png')).toBe(204);expect(await request('/__media/growth/0899.png')).toBe(204);expect(await request('/__media/growth/0900.png')).toBe(400);
      expect(await request('/__media/courier/0359.png')).toBe(204);expect(await request('/__media/courier/0360.png')).toBe(400);expect(await request('/__media/handoff/0539.png')).toBe(204);expect(await request('/__media/handoff/0540.png')).toBe(400);
      expect(await request('/__media/progression/0479.png')).toBe(204);expect(await request('/__media/progression/0480.png')).toBe(400);
      expect(await request('/__media/recipes/0359.png')).toBe(204);expect(await request('/__media/recipes/0360.png')).toBe(400);
      expect(await request('/__media/transit/0239.png')).toBe(204);expect(await request('/__media/transit/0240.png')).toBe(400);
      expect(await request('/__media/business/0599.png')).toBe(204);expect(await request('/__media/business/0600.png')).toBe(400);
      expect(await request('/__media/schoolrepair/0599.png')).toBe(204);expect(await request('/__media/schoolrepair/0600.png')).toBe(400);
      expect(await request('/__media/nursery/0419.png')).toBe(204);expect(await request('/__media/nursery/0420.png')).toBe(400);
      expect(await request('/__media/shared/0719.png')).toBe(204);expect(await request('/__media/shared/0720.png')).toBe(400);
      expect(await request('/__media/unknown/0000.png')).toBe(400);
      expect(await request('/__media/driving/0001.png','https://other.example')).toBe(403);
      expect(await request('/__media/../../README.md')).toBe(400);
      expect(await request('/__media/driving/0600.png')).toBe(400);
      expect(await request('/__media/driving/0001.png',undefined,Buffer.from('not a PNG'))).toBe(400);
      expect(await request('/__media/driving/0001.png',undefined,Buffer.alloc(12_000_001))).toBe(413);
    }finally{await rm(root,{recursive:true,force:true});}
  });
});
