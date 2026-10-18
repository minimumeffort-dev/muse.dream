import {it,expect} from 'vitest';
import {FootPlants} from '../src/game/humanoid-gait';

it('keeps a stance anchor and its facing through a turn, then releases on swing or a missed cycle',()=>{
 const plants=new FootPlants(),start={x:100,z:200,heading:0};plants.begin(start,.3);
 const initial={...plants.sample(0,start,.3,2,4,true,0)},pose={x:100.6,z:200.3,heading:.8};plants.begin(pose,.3);
 const foot=plants.sample(0,pose,.3,7,4,true,0),c=Math.cos(pose.heading),s=Math.sin(pose.heading);
 expect(pose.x+.3*(c*foot.x-s*foot.z)).toBeCloseTo(start.x+.3*initial.x,10);
 expect(pose.z+.3*(s*foot.x+c*foot.z)).toBeCloseTo(start.z+.3*initial.z,10);
 expect(foot.yaw).toBeCloseTo(.8);
 expect(plants.sample(0,pose,.3,7,4,false,0)).toMatchObject({x:expect.closeTo(7),z:expect.closeTo(4),yaw:0});
 plants.sample(0,pose,.3,7,4,true,0);
 expect(plants.sample(0,pose,.3,-2,4,true,1).x).toBeCloseTo(-2);
});

it('drops visual anchors on a teleport or reset without retaining an old location',()=>{
 const plants=new FootPlants(),start={x:0,z:0,heading:0};plants.begin(start,.3);plants.sample(0,start,.3,2,4,true,0);
 const moved={x:500,z:600,heading:1};plants.begin(moved,.3);expect(plants.sample(0,moved,.3,0,4,true,0).x).toBeCloseTo(0);
 plants.reset();expect(plants.sample(0,moved,.3,3,4,true,0).x).toBeCloseTo(3);
 plants.begin(moved,.3);const reversed={...moved,heading:1-Math.PI};plants.begin(reversed,.3);
 const foot=plants.sample(0,reversed,.3,0,4,true,0);
 expect(foot).toMatchObject({x:expect.closeTo(-3),z:expect.closeTo(-4),yaw:expect.closeTo(-Math.PI)});
});
