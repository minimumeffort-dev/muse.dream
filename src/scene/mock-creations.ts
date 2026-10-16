import type { ObjectDslV2, ObjectMaterial } from "./object-dsl";

const toon=(color:string):ObjectMaterial=>({shaderStyle:"toon",colorA:color,colorB:color});
const skin=toon("#c98e68"),shirt=toon("#4f8091"),cream=toon("#f1dfb5"),dark=toon("#353b40");

/** Examples of compositions, not new engine object kinds or name-based recipes. */
export const mockPerson:ObjectDslV2={
  dslVersion:2,displayName:"Waving baker",body:{interaction:"decor",colliderRadius:11,colliderHeight:76},
  joints:[
    {id:"body-frame",position:[0,21,0],animation:{axis:"y",amplitudeRad:.035,speed:1.1,phase:0}},
    {id:"left-shoulder",parent:"body-frame",position:[-10,17,0],animation:{axis:"z",amplitudeRad:.06,speed:1.3,phase:0}},
    {id:"left-elbow",parent:"left-shoulder",position:[0,-17,0],rotation:[-.12,0,0]},
    {id:"right-shoulder",parent:"body-frame",position:[10,17,0],rotation:[0,0,2.15]},
    {id:"right-elbow",parent:"right-shoulder",position:[0,-17,0],rotation:[0,0,.4],animation:{axis:"z",amplitudeRad:.38,speed:2.5,phase:0}},
  ],
  parts:[
    {id:"torso",parent:"body-frame",shape:"capsule",position:[0,10,0],size:[17,22,11],material:shirt},
    {id:"apron",parent:"body-frame",shape:"box",position:[0,7,5],size:[13,21,2],material:cream},
    {id:"waist",parent:"body-frame",shape:"box",position:[0,0,0],size:[14,6,10],material:dark},
    {id:"neck",parent:"body-frame",shape:"capsule",position:[0,21,0],size:[6,9,6],material:skin},
    {id:"head",parent:"body-frame",shape:"sphere",position:[0,28,0],size:[16,17,15],material:skin},
    {id:"hair",parent:"body-frame",shape:"sphere",position:[0,33,-1],size:[17,10,16],material:toon("#594033")},
    ...[-1,1].map(side=>({id:`eye-${side}`,parent:"body-frame",shape:"sphere" as const,position:[side*3,29,7] as [number,number,number],size:[1.7,2,1.2] as [number,number,number],material:dark})),
    {id:"nose",parent:"body-frame",shape:"sphere",position:[0,26.5,7.5],size:[3,3,3],material:skin},
    {id:"hat-band",parent:"body-frame",shape:"cylinder",position:[0,38,0],size:[17,7,16],material:cream},
    ...[-1,0,1].map(side=>({id:`hat-puff-${side}`,parent:"body-frame",shape:"sphere" as const,position:[side*5,44,0] as [number,number,number],size:[12,12,14] as [number,number,number],material:cream})),
    ...[-1,1].flatMap(side=>[
      {id:`leg-${side}`,shape:"capsule" as const,position:[side*4.2,12,0] as [number,number,number],size:[6,20,7] as [number,number,number],material:dark},
      {id:`shoe-${side}`,shape:"capsule" as const,position:[side*4.2,2,2] as [number,number,number],size:[7,4,11] as [number,number,number],material:toon("#66513e")},
    ]),
    ...["left","right"].flatMap(side=>[
      {id:`${side}-upper-arm`,parent:`${side}-shoulder`,shape:"capsule" as const,position:[0,-8.5,0] as [number,number,number],size:[6,18,6] as [number,number,number],material:shirt},
      {id:`${side}-forearm`,parent:`${side}-elbow`,shape:"capsule" as const,position:[0,-6.5,0] as [number,number,number],size:[5,14,5] as [number,number,number],material:skin},
      {id:`${side}-hand`,parent:`${side}-elbow`,shape:"sphere" as const,position:[0,-14,0] as [number,number,number],size:[6,7,5] as [number,number,number],material:skin},
    ]),
  ],
};

export const mockBread:ObjectDslV2={
  grounding:"surface",
  dslVersion:2,displayName:"Crusty bread",body:{interaction:"knockable",colliderRadius:13,colliderHeight:18,frictionPerS:2.8},
  parts:[
    {id:"loaf",shape:"capsule",position:[0,8,0],size:[16,38,18],rotation:[0,0,Math.PI/2],deform:{seed:73,amount:.045},material:{shaderStyle:"paper-grain",colorA:"#bd783d",colorB:"#e2ae63"}},
    ...[-10,0,10].flatMap((x,i)=>[-3,0,3].map((z,j)=> {
      const top=8+8*Math.sqrt(1-(z/9)**2),slope=-8*z/81/Math.sqrt(1-(z/9)**2);
      return {id:`score-${i}-${j}`,shape:"capsule" as const,position:[x+z*.4,top-.05,z] as [number,number,number],
        size:[1.2,3.8,.8] as [number,number,number],rotation:[Math.atan2(1,slope),0,-.35] as [number,number,number],material:toon("#ead09b")};
    })),
  ],
};

export const mockFood:ObjectDslV2={
  grounding:"surface",
  dslVersion:2,displayName:"Harvest bowl",body:{interaction:"knockable",colliderRadius:14,colliderHeight:18,frictionPerS:2.5},
  parts:[
    {id:"bowl-base",shape:"cylinder",position:[0,2,0],size:[22,4,22],material:cream},
    {id:"bowl-rim",shape:"torus",position:[0,4,0],size:[28,28,4],rotation:[Math.PI/2,0,0],material:cream},
    ...[[-6,8,2],[5,8,5],[1,10,-5]].flatMap((p,i)=>[
      {id:`fruit-${i}`,shape:"sphere" as const,position:p as [number,number,number],size:[10,11,10] as [number,number,number],deform:{seed:51+i*19,amount:.09},material:toon(["#b7503d","#d9a54a","#6d934b"][i]!)},
      {id:`stem-${i}`,shape:"cylinder" as const,position:[p[0]!,p[1]!+6,p[2]!] as [number,number,number],size:[1,3,1] as [number,number,number],rotation:[0,0,.2] as [number,number,number],material:toon("#68503b")},
    ]),
  ],
};

export const mockSculptedRock:ObjectDslV2={
  grounding:"surface",
  dslVersion:2,displayName:"Mossy granite",body:{interaction:"solid",colliderRadius:23,colliderHeight:34},
  parts:[
    {id:"stone",shape:"icosphere",position:[0,16,0],size:[44,32,35],deform:{seed:381,amount:.23},material:toon("#8b918d")},
    {id:"moss",shape:"icosphere",position:[-7,28,-3],size:[25,9,23],deform:{seed:85,amount:.18},material:toon("#697e4c")},
  ],
};

const wood=toon("#956e4c");
export const mockPicnic:ObjectDslV2={
  dslVersion:2,displayName:"Orchard picnic",foundation:{footprint:[70,42],color:"#68765a"},body:{interaction:"solid",colliderRadius:30,colliderHeight:28},
  parts:[
    {id:"tabletop",shape:"box",position:[0,26,0],size:[66,4,38],material:wood},
    ...[-1,1].flatMap(x=>[-1,1].map(z=>({id:`leg-${x}-${z}`,shape:"box" as const,position:[x*26,12,z*12] as [number,number,number],size:[4,24,4] as [number,number,number],material:wood}))),
    ...mockBread.parts.map(part=>({...part,id:`bread-${part.id}`,position:[part.position[0]*.7-12,part.position[1]*.7+28,part.position[2]*.7+5] as [number,number,number],size:part.size.map(n=>n*.7) as [number,number,number]})),
    ...mockFood.parts.map(part=>({...part,id:`food-${part.id}`,position:[part.position[0]*.7+18,part.position[1]*.7+28,part.position[2]*.7-3] as [number,number,number],size:part.size.map(n=>n*.7) as [number,number,number]})),
  ],
};
export const inventionExamples=[mockPerson,mockBread,mockFood,mockSculptedRock,mockPicnic];
