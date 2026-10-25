import {afterEach,it,expect,vi} from 'vitest';
import type {WebGLRenderer} from 'three';
import {renderProfile} from '../src/game/render-profile';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function harness(){
 const nodes:{textContent:string;disabled:boolean;onclick?:()=>void;dataset:Record<string,string>;style:{cssText:string};append:(...nodes:unknown[])=>void}[]=[];
 const document={hidden:false,createElement:()=>{const node={textContent:'',disabled:false,dataset:{},style:{cssText:''},append:()=>{}};nodes.push(node);return node;},body:{append:()=>{}}};
 vi.stubGlobal('document',document);vi.stubGlobal('location',{search:'?profile'});
 let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now);
 const input=vi.fn(),renderer={getContext:()=>({getExtension:()=>null}),domElement:{width:1280,height:720},getPixelRatio:()=>1,info:{render:{calls:10,triangles:100},memory:{geometries:20}}} as unknown as WebGLRenderer;
 const profile=renderProfile(renderer,vi.fn(),input)!;
 const click=(name:string)=>nodes.find(n=>n.textContent===name)!.onclick!();
 const report=()=>JSON.parse(nodes[0]!.dataset.result!);
 return {profile,input,click,report,document,advance:(ms:number)=>{now+=ms;}};
}

it('records held presentation time without counting worker waits as CPU work',()=>{
 const h=harness();h.click('Measure drive');
 for(let frame=0;frame<360;frame++){
  h.advance(14);h.profile.begin(17);h.advance(2);
  if(frame===100){h.profile.hold();h.advance(2000);h.profile.resume();}
  h.profile.beforeRender();h.advance(1);h.profile.end();
 }
 const report=h.report();expect(report.samples).toBe(300);
 expect(report.cpuMs.mean).toBeCloseTo(3);expect(report.prepareMs.mean).toBeCloseTo(2);
 expect(report.wait).toEqual({episodes:1,ms:2000});
 expect(report.presentationMs.max).toBe(2017);expect(report.presentationMs.mean).toBeGreaterThan(17);
 expect(report.wallMs).toBe(360*17+2000);
 expect(h.input).toHaveBeenLastCalledWith(false,0);
});

it('measures an extended journey using ordinary input and interrupts cleanly when hidden',()=>{
 const h=harness();h.click('Measure journey');h.input.mockClear();
 for(let frame=0;frame<3660;frame++){
  h.advance(20);expect(h.profile.begin(20)).toBe(.02);h.profile.beforeRender();h.profile.end();
 }
 expect(h.input.mock.calls).toEqual([[false,0]]);
 expect(h.report()).toMatchObject({scenario:'journey',samples:3600,wallMs:73200,wait:{episodes:0,ms:0}});
 h.click('Measure drive');h.profile.begin(16);h.document.hidden=true;
 expect(h.profile.begin(16)).toBe(0);expect(h.input).toHaveBeenLastCalledWith(false,0);
 h.document.hidden=false;h.click('Measure drive');h.profile.begin(16);h.profile.hold();
 h.document.hidden=true;h.advance(500);h.profile.resume();h.profile.beforeRender();h.profile.end();
 expect(()=>h.report()).toThrow();expect(h.input).toHaveBeenLastCalledWith(false,0);
});
