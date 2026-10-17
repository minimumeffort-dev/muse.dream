import {it,expect} from 'vitest';
import {pointInPolygon} from '../src/sim/mask';
import {waterContains,waterDistance,waterSchema,bridgeCoordinates,type Bridge,type Water} from '../src/scene/landscape-dsl';
import {terrainHeight,sampleTerrain,type Terrain} from '../src/scene/terrain';
import {pavementSurface} from '../src/scene/pavement';
import {onPolygon} from '../src/scene/streets';

const water=waterSchema.parse({id:'inlet',polygon:[{x:100,y:100},{x:700,y:100},{x:700,y:300},{x:300,y:300},{x:300,y:700},{x:100,y:700}],level:4,depth:20,bankWidth:60,color:'#638ea1',flow:{x:4,y:1},dragPerS:2,waves:{speed:30,damping:1,strength:.3}});
function outlineDistance(w:Water,x:number,y:number){
 if(!pointInPolygon(x,y,w.polygon))return -1;
 let distance=Infinity;
 for(let i=0;i<w.polygon.length;i++){const a=w.polygon[i]!,b=w.polygon[(i+1)%w.polygon.length]!,dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));distance=Math.min(distance,Math.hypot(x-a.x-dx*t,y-a.y-dy*t));}
 return distance;
}
function originalHills(t:Terrain,x:number,y:number,vx=0,vy=0){
 let height=0,dx=0,dy=0,bend=0;
 for(const h of t.hills){const px=x-h.x,py=y-h.y,rx2=h.radiusX**2,ry2=h.radiusY**2,f=Math.max(0,1-px*px/rx2-py*py/ry2);height+=h.height*f**3;dx-=6*h.height*f**2*px/rx2;dy-=6*h.height*f**2*py/ry2;bend+=h.height*(24*f*(px*vx/rx2+py*vy/ry2)**2-6*f**2*(vx*vx/rx2+vy*vy/ry2));}
 return height>=320 ? {height:320,dx:0,dy:0,bend:0} : {height,dx,dy,bend};
}

it('retains exact concave water membership and bank distances at edges, corners and distant points',()=>{
 const moved={...water,polygon:water.polygon.map(p=>({x:p.x+1200,y:p.y+800}))},source=JSON.stringify([water,moved]);
 for(const w of [water,moved]){
  const points=[...w.polygon,...w.polygon.flatMap(p=>[-1e-8,0,1e-8].map(e=>({x:p.x+e,y:p.y-e})))];
  for(let y=-100;y<=1800;y+=31.25)for(let x=-100;x<=2200;x+=29.5)points.push({x,y});
  for(const p of points){expect(waterContains(w,p.x,p.y)).toBe(pointInPolygon(p.x,p.y,w.polygon));expect(waterDistance(w,p.x,p.y)).toBe(outlineDistance(w,p.x,p.y));}
 }
 expect(JSON.stringify([water,moved])).toBe(source);
});

it('retains exact hill heights, gradients, crest acceleration and blended river banks',()=>{
 const terrain:Terrain={hills:[{id:'one',x:250,y:300,radiusX:250,radiusY:400,height:260},{id:'two',x:450,y:450,radiusX:500,radiusY:350,height:300},{id:'flat',x:500,y:500,radiusX:120,radiusY:120,height:0}]},wet={...terrain,landscape:{dslVersion:1 as const,waters:[water],bridges:[]}};
 let clamped=false,flat=false;
 for(let y=-500;y<=1500;y+=37.5)for(let x=-500;x<=1500;x+=41.25){
  const expected=originalHills(terrain,x,y,83,-37);expect(sampleTerrain(terrain,x,y,83,-37)).toEqual(expected);expect(terrainHeight(terrain,x,y)).toBe(expected.height);clamped ||= expected.height===320;flat ||= expected.height===0;
  const distance=outlineDistance(water,x,y),t=Math.min(1,distance/water.bankWidth),blend=t*t*(3-2*t),bank=distance<=0 ? expected.height : Math.min(expected.height,expected.height+(water.level-water.depth-expected.height)*blend);
  expect(terrainHeight(wet,x,y)).toBe(bank);
 }
 expect(clamped && flat).toBe(true);
});

it('retains bridge frame arithmetic and independent results for identical IDs and rotated spans',()=>{
 for(const angle of [0,.3,Math.PI/2,Math.PI,-2.4]){
  const bridge:Bridge={id:'bridge',a:{x:700,y:800},b:{x:700+320*Math.cos(angle),y:800+320*Math.sin(angle)},width:80,archHeight:12,style:'timber',rails:true},source=JSON.stringify(bridge),length=Math.hypot(bridge.b.x-bridge.a.x,bridge.b.y-bridge.a.y),ux=(bridge.b.x-bridge.a.x)/length,uy=(bridge.b.y-bridge.a.y)/length;
  for(let y=400;y<=1200;y+=50)for(let x=300;x<=1100;x+=37.5){expect(bridgeCoordinates(bridge,x,y)).toEqual({length,ux,uy,t:((x-bridge.a.x)*ux+(y-bridge.a.y)*uy)/length,across:-(x-bridge.a.x)*uy+(y-bridge.a.y)*ux});}
  bridgeCoordinates(bridge,700,800).ux=999;expect(bridgeCoordinates(bridge,700,800).ux).toBe(ux);expect(JSON.stringify(bridge)).toBe(source);
 }
});

it('rejects distant pavement pieces without changing exact outline margins or thin gaps',()=>{
 const rect=(x:number,y:number,w:number,h:number)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}],polygons=[rect(130,150,60,220),rect(190,150,90,35),rect(190,185.05,90,35),rect(128.125,400,180,32)],surface=pavementSurface(polygons),source=JSON.stringify(polygons);
 const points=polygons.flatMap(p=>p.flatMap(v=>[-.01000001,-.01,-1e-10,0,1e-10,.01,.01000001].map(e=>({x:v.x+e,y:v.y-e}))));
 for(let y=100;y<=500;y+=3.25)for(let x=100;x<=500;x+=2.5)points.push({x,y});
 let supported=0,unsupported=0;
 for(const p of points){const expected=(surface.bins.get(Math.floor(p.x/256)+','+Math.floor(p.y/256))??[]).some(i=>onPolygon(polygons[i]!,p.x,p.y,.01));expect(surface.paved(p.x,p.y)).toBe(expected);if(expected)supported++;else unsupported++;}
 expect(supported>0 && unsupported>0).toBe(true);expect(surface.segment({x:230,y:170},{x:230,y:200},4)).toBe(false);expect(surface.segment({x:150,y:170},{x:230,y:170},4)).toBe(true);expect(JSON.stringify(polygons)).toBe(source);
});
