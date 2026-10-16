import type { ObjectDslV1 as ObjectDsl, ObjectMaterial } from "./object-dsl";

// A finite set of different assemblies keeps natural variation compatible with instancing.
const bark: ObjectMaterial = { shaderStyle:"toon", colorA:"#655140", colorB:"#3c3830" };
const leaves: ObjectMaterial = { shaderStyle:"toon", colorA:"#648553", colorB:"#3b5c44" };
const darkLeaves: ObjectMaterial = { shaderStyle:"toon", colorA:"#3d6858", colorB:"#294b43" };
const stone: ObjectMaterial = { shaderStyle:"toon", colorA:"#89918a", colorB:"#535e60" };
const wood: ObjectMaterial = { shaderStyle:"toon", colorA:"#a27b55", colorB:"#68513c" };
const white: ObjectMaterial = { shaderStyle:"toon", colorA:"#d5d2b9", colorB:"#8a978b" };
const sway = { kind:"sway" as const, amplitudeRad:.018, speed:.9 };

export const mockBirch: ObjectDsl = {
  dslVersion:1, displayName:"Birch", body:{interaction:"solid",colliderRadius:9,colliderHeight:68},
  parts:[
    {id:"trunk",shape:"cylinder",position:[0,23,0],size:[4,46,4],material:white},
    {id:"fork",shape:"cylinder",position:[-5,34,0],size:[2,23,2],rotation:[0,0,-.48],material:white},
    {id:"upper-crown",shape:"icosphere",position:[1,53,0],size:[24,29,21],material:leaves,animation:sway},
    {id:"side-crown",shape:"icosphere",position:[-9,43,1],size:[20,23,18],material:leaves,animation:sway},
    {id:"lower-crown",shape:"icosphere",position:[7,40,-3],size:[17,21,16],material:darkLeaves,animation:sway},
  ],
};
export const mockFir: ObjectDsl = {
  dslVersion:1, displayName:"Silver fir", body:{interaction:"solid",colliderRadius:13,colliderHeight:76},
  parts:[
    {id:"trunk",shape:"cylinder",position:[0,30,0],size:[5,60,5],material:bark},
    ...[[0,22,39,22],[-2,35,32,23],[1,48,25,23],[0,62,16,28]].map(([x,y,width,height],i)=>({
      id:`bough-${i}`,shape:"cone" as const,position:[x!,y!,0] as [number,number,number],size:[width!,height!,width!*.85] as [number,number,number],
      material:i%2?leaves:darkLeaves,animation:sway,
    })),
  ],
};
export const mockSapling: ObjectDsl = {
  dslVersion:1, displayName:"Young rowan", body:{interaction:"solid",colliderRadius:6,colliderHeight:35},
  parts:[
    {id:"stem",shape:"cylinder",position:[0,11,0],size:[2,22,2],material:bark},
    {id:"crown",shape:"icosphere",position:[-2,26,0],size:[17,17,14],material:leaves,animation:sway},
    {id:"side-leaves",shape:"icosphere",position:[5,19,1],size:[12,13,12],material:darkLeaves,animation:sway},
  ],
};
export const mockShrub: ObjectDsl = {
  dslVersion:1, displayName:"Wild shrub", body:{interaction:"decor",colliderRadius:12,colliderHeight:15},
  parts:[
    {id:"left",shape:"icosphere",position:[-8,6,0],size:[18,12,17],material:darkLeaves},
    {id:"center",shape:"icosphere",position:[2,8,-3],size:[22,16,18],material:leaves},
    {id:"right",shape:"icosphere",position:[11,5,3],size:[13,10,13],material:darkLeaves},
  ],
};
export const mockJuniper: ObjectDsl = {
  dslVersion:1, displayName:"Juniper scrub", body:{interaction:"decor",colliderRadius:10,colliderHeight:23},
  parts:[
    {id:"bush",shape:"icosphere",position:[0,9,0],size:[22,18,21],material:darkLeaves},
    {id:"shoot",shape:"cone",position:[-4,15,1],size:[12,19,11],material:leaves},
  ],
};
export const mockBoulder: ObjectDsl = {
  grounding:"surface",
  dslVersion:1, displayName:"Weathered boulder", body:{interaction:"solid",colliderRadius:21,colliderHeight:34},
  parts:[{id:"stone",shape:"icosphere",position:[0,14,0],size:[37,32,29],rotation:[0,.52,.12],material:stone}],
};
export const mockSlab: ObjectDsl = {
  grounding:"surface",
  dslVersion:1, displayName:"Exposed stone slab", body:{interaction:"solid",colliderRadius:27,colliderHeight:14},
  parts:[{id:"slab",shape:"icosphere",position:[0,5,0],size:[51,14,30],rotation:[0,-.4,.06],material:stone}],
};
export const mockDeadTree: ObjectDsl = {
  dslVersion:1, displayName:"Standing deadwood", body:{interaction:"solid",colliderRadius:9,colliderHeight:42},
  parts:[
    {id:"trunk",shape:"cylinder",position:[0,20,0],size:[6,40,6],material:bark},
    {id:"left-branch",shape:"cylinder",position:[-6,29,0],size:[3,19,3],rotation:[0,0,-.73],material:bark},
    {id:"right-branch",shape:"cylinder",position:[5,23,2],size:[3,15,3],rotation:[0,.4,.8],material:bark},
  ],
};
export const mockFallenLog: ObjectDsl = {
  grounding:"surface",
  dslVersion:1, displayName:"Fallen log", body:{interaction:"solid",colliderRadius:23,colliderHeight:16},
  parts:[
    {id:"log",shape:"cylinder",position:[0,5,0],size:[11,44,11],rotation:[0,0,Math.PI/2],material:bark},
    ...[-1,1].map(side=>({id:`cut-${side}`,shape:"cylinder" as const,position:[side*22,5,0] as [number,number,number],size:[9,.5,9] as [number,number,number],rotation:[0,0,Math.PI/2] as [number,number,number],material:wood})),
    {id:"broken-branch",shape:"cylinder",position:[-5,9,1],size:[3,13,3],rotation:[0,.3,-.6],material:bark},
  ],
};
export const mockBarn: ObjectDsl = {
  dslVersion:1, displayName:"Timber barn", foundation:{footprint:[66,58],color:"#697267"},body:{interaction:"solid",colliderRadius:30,colliderHeight:64},
  parts:[
    {id:"walls",shape:"box",position:[0,15,0],size:[54,30,42],material:{shaderStyle:"toon",colorA:"#985d45",colorB:"#633e32"}},
    {id:"roof",shape:"pyramid",position:[0,46,0],size:[64,32,54],material:{shaderStyle:"toon",colorA:"#4a5552",colorB:"#333c3b"}},
    {id:"doors",shape:"box",position:[0,13,21.5],size:[25,26,1],material:bark},
    ...[-1,1].map(side=>({id:`door-post-${side}`,shape:"box" as const,position:[side*14,15,22] as [number,number,number],size:[3,30,2] as [number,number,number],material:wood})),
    {id:"lintel",shape:"box",position:[0,29,22],size:[31,3,2],material:wood},
    {id:"door-bar",shape:"box",position:[0,13,22.3],size:[24,2,1],material:wood},
  ],
};
export const mockWell: ObjectDsl = {
  dslVersion:1, displayName:"Village well", foundation:{footprint:[40,36],color:"#777f73"},body:{interaction:"solid",colliderRadius:21,colliderHeight:48},
  parts:[
    ...Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4;return {id:`stone-${i}`,shape:"box" as const,position:[Math.sin(angle)*11,6,Math.cos(angle)*11] as [number,number,number],size:[9,12,5] as [number,number,number],rotation:[0,angle>Math.PI?angle-Math.PI*2:angle,0] as [number,number,number],material:stone};}),
    ...[-1,1].map(side=>({id:`post-${side}`,shape:"box" as const,position:[side*15,18,0] as [number,number,number],size:[3,36,3] as [number,number,number],material:wood})),
    {id:"roof",shape:"pyramid",position:[0,40,0],size:[38,15,30],material:bark},
    {id:"spindle",shape:"cylinder",position:[0,27,0],size:[3,31,3],rotation:[0,0,Math.PI/2],material:bark},
    {id:"water",shape:"cylinder",position:[0,5,0],size:[17,1,17],material:{shaderStyle:"toon",colorA:"#385b67",colorB:"#253e4c"}},
  ],
};
export const mockFruitTree: ObjectDsl = {
  dslVersion:1, displayName:"Old apple tree", body:{interaction:"solid",colliderRadius:11,colliderHeight:37},
  parts:[
    {id:"trunk",shape:"cylinder",position:[0,10,0],size:[5,20,5],material:bark},
    {id:"crown-left",shape:"icosphere",position:[-8,25,0],size:[23,21,22],material:leaves,animation:sway},
    {id:"crown-right",shape:"icosphere",position:[8,26,1],size:[25,21,23],material:darkLeaves,animation:sway},
    ...[[-13,24,7],[6,28,11],[15,23,5],[-1,19,8]].map((position,i)=>({id:`apple-${i}`,shape:"sphere" as const,position:position as [number,number,number],size:[3,3,3] as [number,number,number],material:{shaderStyle:"toon" as const,colorA:"#ba5840",colorB:"#813e34"}})),
  ],
};
