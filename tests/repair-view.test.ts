import {it,expect} from 'vitest';
import {repairView} from '../src/game/repair-view';
import type {ActorPose} from '../src/sim/actors';
const pose=(x:number,headingRad=0):ActorPose=>({id:'worker',x,y:0,elevation:0,headingRad,kind:'path',speed:14,distance:x,travelled:x,vx:14,vy:0});
it('renders quarter-second walking updates as continuous bounded motion at 30 rendered fps',()=>{
 const view=repairView();let previous=0;
 for(let i=0;i<=30;i++){const now=i/30,tick=Math.floor((now+1e-8)/.25)*.25,p=Object.freeze(pose(tick*14)),rendered=view.sample(p,true,tick,now);expect(rendered.x-previous).toBeGreaterThanOrEqual(-1e-8);expect(rendered.x-previous).toBeLessThanOrEqual(14/30+1e-6);expect(p.x-rendered.x).toBeLessThanOrEqual(3.501);previous=rendered.x;}
 expect(previous).toBeGreaterThan(10);expect(view.resident).toBe(1);
});
it('takes the short turn across pi, freezes with the simulation clock and snaps on recovery/reduced motion',()=>{
 const view=repairView();view.sample(pose(0,3.13),true,0,0);const p=view.sample(pose(3.5,-3.13),true,.25,.375);expect(Math.abs(p.headingRad)).toBeGreaterThan(3);expect(view.sample(pose(3.5,-3.13),true,.25,.375)).toEqual(p);const snapped=pose(500);expect(view.sample(snapped,true,.25,.375,true)).toBe(snapped);expect(view.resident).toBe(0);
});
it('preserves every unrelated pose and releases finished maintenance without retaining view state',()=>{
 const view=repairView(),other=pose(0);expect(view.sample(other,false,0,0)).toBe(other);view.sample(pose(0),true,0,0);view.sample(pose(3.5),true,.25,.25);const home={...pose(7),distance:0,travelled:0,speed:0};const ending=view.sample(home,false,.5,.6);expect(ending.travelled).toBeGreaterThanOrEqual(3.5);expect(view.sample(home,false,.75,.75)).toBe(home);expect(view.resident).toBe(0);view.sample(pose(0),true,1,1);view.reset();expect(view.resident).toBe(0);
});
