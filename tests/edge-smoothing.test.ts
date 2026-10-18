import {it,expect,vi} from 'vitest';
import {RGFormat,RGBAFormat,UnsignedByteType} from 'three';
import {worldEdgeSmoothing} from '../src/game/edge-smoothing';
it('waits for both lookup textures and keeps only six normalized target bytes per pixel',async()=>{
 const images:{resolve:()=>void}[]=[];class ImageMock {src='';decode(){return new Promise<void>(resolve=>images.push({resolve}));}}
 vi.stubGlobal('Image',ImageMock);try{
  const pending=worldEdgeSmoothing();let ready=false;pending.then(()=>{ready=true;});
  expect(images).toHaveLength(2);images[0]!.resolve();await Promise.resolve();expect(ready).toBe(false);images[1]!.resolve();const pass=await pending;expect(ready).toBe(true);
  pass.setSize(1920,1080);expect(pass.edgesRT.texture.format).toBe(RGFormat);expect(pass.weightsRT.texture.format).toBe(RGBAFormat);expect(pass.edgesRT.texture.type).toBe(UnsignedByteType);expect(pass.weightsRT.texture.type).toBe(UnsignedByteType);expect(pass.edgesRT.width).toBe(1920);expect(pass.weightsRT.height).toBe(1080);pass.dispose();
 }finally{vi.unstubAllGlobals();}
});

it('reports lookup failure rather than allowing an incomplete first frame',async()=>{class ImageMock{src='';decode(){return Promise.reject(Error('lookup unavailable'));}}vi.stubGlobal('Image',ImageMock);try{await expect(worldEdgeSmoothing()).rejects.toThrow('lookup unavailable');}finally{vi.unstubAllGlobals();}});

import {prepareWorldEdges} from '../src/game/edge-smoothing';
import {WebGLRenderTarget,type WebGLRenderer,Scene} from 'three';
it.each([false,true])('warms the exact output targets and restores renderer ownership on failure=%s',async(fail)=>{
 class ImageMock{src='';decode(){return Promise.resolve();}}vi.stubGlobal('Image',ImageMock);
 try{const pass=await worldEdgeSmoothing(),prior=new WebGLRenderTarget(1,1),targets:unknown[]=[],materials:unknown[]=[];let disposed=false;
 const renderer={getRenderTarget:()=>prior,setRenderTarget:(target:unknown)=>targets.push(target),compileAsync:async(scene:Scene)=>{const mesh=scene.children[0] as import('three').Mesh;mesh.geometry.addEventListener('dispose',()=>{disposed=true;});materials.push(mesh.material);if(fail)throw Error('compile failed');}} as unknown as WebGLRenderer;
 if(fail)await expect(prepareWorldEdges(renderer,pass)).rejects.toThrow('compile failed');else await prepareWorldEdges(renderer,pass);
 expect(targets).toEqual(fail ? [pass.edgesRT,prior] : [pass.edgesRT,pass.weightsRT,null,prior]);expect(materials).toEqual(fail ? [pass.materialEdges] : [pass.materialEdges,pass.materialWeights,pass.materialBlend]);expect(disposed).toBe(true);pass.dispose();prior.dispose();
 }finally{vi.unstubAllGlobals();}
});
