import {it,expect} from 'vitest';
import {Readable} from 'node:stream';
import {labMedia} from '../media';

it('keeps the dev exporter bounded to fixed local PNG frame slots',async()=>{
  let handler:any;
  const plugin=labMedia();
  (plugin.configureServer as Function)({middlewares:{use:(callback:unknown)=>{handler=callback;}},config:{logger:{error:()=>{throw Error('Unexpected writer error');}}}});
  const request=async(url:string,headers:Record<string,string>,bytes=Buffer.alloc(0))=>{
    const req=Readable.from([bytes]) as Readable&{url:string;method:string;headers:Record<string,string>};
    Object.assign(req,{url,method:'POST',headers});let status=0;
    const res={writeHead:(code:number)=>{status=code;return res;},end:()=>{}};
    await handler(req,res,()=>{status=404;});return status;
  };
  const valid={host:'127.0.0.1:5180',origin:'http://127.0.0.1:5180','content-type':'image/png'};
  for(const url of ['/__lab-media/0840.png','/__lab-media/../../secret','/__lab-media/0000.jpg'])expect(await request(url,valid)).toBe(400);
  expect(await request('/__lab-media/0000.png',{...valid,origin:'https://other.example'})).toBe(403);
  expect(await request('/__lab-media/0000.png',{...valid,'content-type':'text/plain'})).toBe(403);
  expect(await request('/__lab-media/0000.png',valid,Buffer.from('not an image'))).toBe(400);
  const wrongSize=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(wrongSize);wrongSize.writeUInt32BE(1,16);wrongSize.writeUInt32BE(1,20);
  expect(await request('/__lab-media/0000.png',valid,wrongSize)).toBe(400);
});
