import {it,expect} from 'vitest';
import {FootPlants} from '../src/game/humanoid-gait';

it('keeps a stance anchor and its facing through a turn, then releases on swing or a missed cycle',()=>{
 const plants=new FootPlants(),start={x:100,z:200,heading:0};plants.begin(start,.3,1/60);
 const initial={...plants.sample(0,start,.3,2,4,true,0)},pose={x:100.6,z:200.3,heading:.8};plants.begin(pose,.3,1/60);
 const foot=plants.sample(0,pose,.3,7,4,true,0),c=Math.cos(pose.heading),s=Math.sin(pose.heading);
 expect(pose.x+.3*(c*foot.x-s*foot.z)).toBeCloseTo(start.x+.3*initial.x,10);
 expect(pose.z+.3*(s*foot.x+c*foot.z)).toBeCloseTo(start.z+.3*initial.z,10);
 expect(foot.yaw).toBeCloseTo(.8);
 plants.begin(pose,.3,1);expect(plants.sample(0,pose,.3,7,4,false,0)).toMatchObject({x:expect.closeTo(7),z:expect.closeTo(4),yaw:0});
 plants.sample(0,pose,.3,7,4,true,0);
 expect(plants.sample(0,pose,.3,-2,4,true,1).x).toBeCloseTo(-2);
});

it('drops visual anchors on a teleport or reset without retaining an old location',()=>{
 const plants=new FootPlants(),start={x:0,z:0,heading:0};plants.begin(start,.3,1/60);plants.sample(0,start,.3,2,4,true,0);
 const moved={x:500,z:600,heading:1};plants.begin(moved,.3,1/60);expect(plants.sample(0,moved,.3,0,4,true,0).x).toBeCloseTo(0);
 plants.reset();expect(plants.sample(0,moved,.3,3,4,true,0).x).toBeCloseTo(3);
 plants.begin(moved,.3,1/60);const reversed={...moved,heading:1-Math.PI};plants.begin(reversed,.3,1/60);
 const foot=plants.sample(0,reversed,.3,0,4,true,0);
 expect(foot).toMatchObject({x:expect.closeTo(-3),z:expect.closeTo(-4),yaw:expect.closeTo(-Math.PI)});
});

it('returns through the air after a turn and freezes an unfinished step while paused',()=>{
 const plants=new FootPlants(),pose={x:0,z:0,heading:0};plants.begin(pose,.3,1/60);
 plants.sample(0,pose,.3,12,4,false,0,1,16);
 const turned={...pose,heading:Math.PI};plants.begin(turned,.3,1/60);
 const foot={...plants.sample(0,turned,.3,12,4,true,0,1,16)};
 expect(foot.lift).toBeGreaterThan(0);expect(foot.yaw).not.toBe(0);
 plants.begin(turned,.3,0);expect(plants.sample(0,turned,.3,12,4,true,0,1,16)).toEqual(foot);
 for(let i=0;i<60;i++){plants.begin(turned,.3,1/60);plants.sample(0,turned,.3,12,4,true,0,1,16);}
 expect(plants.sample(0,turned,.3,12,4,true,0,1,16)).toMatchObject({lift:0,x:expect.closeTo(12)});
});

it('lifts before replacing an overextended contact, even if it reaches the new target in one frame',()=>{
 const plants=new FootPlants(),pose={x:0,z:0,heading:0};plants.begin(pose,.3,1/30);plants.sample(0,pose,.3,15,4,true,0,1,16);
 const moved={...pose,x:-.6};plants.begin(moved,.3,1/30);
 const foot={...plants.sample(0,moved,.3,12,4,true,0,1,16)};expect(foot.lift).toBeGreaterThan(0);
 plants.begin(moved,.3,0);expect(plants.sample(0,moved,.3,12,4,true,0,1,16)).toEqual(foot);
 plants.begin(moved,.3,1/30);expect(plants.sample(0,moved,.3,12,4,true,0,1,16).lift).toBe(0);
});
