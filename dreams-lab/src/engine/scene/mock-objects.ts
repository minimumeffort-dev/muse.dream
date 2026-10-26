import type { ObjectDslV1 as ObjectDsl, ObjectMaterial } from "./object-dsl";

// Hand-authored stand-ins for Muse responses. No model or network is involved.
const stone: ObjectMaterial = { shaderStyle: "toon", colorA: "#aeb7af", colorB: "#53666a" };
const roof: ObjectMaterial = { shaderStyle: "toon", colorA: "#813b4e", colorB: "#542d42" };
const cream: ObjectMaterial = { shaderStyle: "toon", colorA: "#f2e7d3", colorB: "#d7b994" };
const red: ObjectMaterial = { shaderStyle: "toon", colorA: "#c4453c", colorB: "#f2e7d3" };
const rubber: ObjectMaterial = { shaderStyle: "toon", colorA: "#26272e", colorB: "#424854" };
const mint: ObjectMaterial = { shaderStyle: "stripes", colorA: "#63b89a", colorB: "#e4e8ac" };

export const mockCastle: ObjectDsl = {
  dslVersion: 1,
  displayName: "Castle",
  foundation: {footprint:[48,44],color:"#77817b"},
  body: { interaction: "solid", colliderRadius: 30, colliderHeight: 58 },
  parts: [
    { id: "keep", shape: "box", position: [0, 15, 0], size: [32, 30, 28], material: stone },
    { id: "upper-keep", shape: "box", position: [0, 36, 0], size: [20, 12, 18], material: stone },
    { id: "gate", shape: "box", position: [0, 8, 14.5], size: [9, 16, 1], material: rubber },
    { id: "tower-nw", shape: "cylinder", position: [-16, 21, -14], size: [10, 42, 10], material: stone },
    { id: "tower-ne", shape: "cylinder", position: [16, 21, -14], size: [10, 42, 10], material: stone },
    { id: "tower-sw", shape: "cylinder", position: [-16, 21, 14], size: [10, 42, 10], material: stone },
    { id: "tower-se", shape: "cylinder", position: [16, 21, 14], size: [10, 42, 10], material: stone },
    { id: "roof-nw", shape: "cone", position: [-16, 49, -14], size: [13, 14, 13], material: roof },
    { id: "roof-ne", shape: "cone", position: [16, 49, -14], size: [13, 14, 13], material: roof },
    { id: "roof-sw", shape: "cone", position: [-16, 49, 14], size: [13, 14, 13], material: roof },
    { id: "roof-se", shape: "cone", position: [16, 49, 14], size: [13, 14, 13], material: roof },
    ...[-9, 9].flatMap((x) => [14, 26].map((y) => ({
      id: `window-${x}-${y}`, shape: "box" as const,
      position: [x, y, 14.5] as [number, number, number], size: [3, 6, 1] as [number, number, number],
      material: { shaderStyle: "glow" as const, colorA: "#ffcf86", colorB: "#ffffff" },
    }))),
    { id: "flagpole", shape: "cylinder", position: [0, 57, 0], size: [1, 34, 1], material: cream },
    { id: "flag", shape: "box", position: [8, 69, 0], size: [16, 9, 0.5],
      material: { shaderStyle: "cloth", colorA: "#d95668", colorB: "#ffbd9b" } },
    { id: "foundation", shape: "box", position: [0, 2, 0], size: [41, 4, 37], material: stone },
    ...[-7, 0, 7].map((x) => ({ id: `battlement-${x}`, shape: "box" as const,
      position: [x, 44, 8] as [number, number, number], size: [4, 6, 4] as [number, number, number], material: stone })),
  ],
};

export const mockMushroom: ObjectDsl = {
  dslVersion: 1,
  displayName: "Mushroom",
  body: { interaction: "knockable", colliderRadius: 10, colliderHeight: 22, frictionPerS: 1.6 },
  parts: [
    { id: "stem", shape: "cylinder", position: [0, 8, 0], size: [7, 16, 7], material: cream },
    { id: "cap", shape: "sphere", position: [0, 17, 0], size: [22, 10, 20], material: red },
    { id: "spot-left", shape: "sphere", position: [-5, 21, 2], size: [4, 2, 4], material: cream },
    { id: "spot-right", shape: "sphere", position: [5, 21, -2], size: [3, 2, 3], material: cream },
  ],
};

export const mockMushroomRover: ObjectDsl = {
  dslVersion: 1,
  displayName: "Mushroom rover",
  body: { interaction: "knockable", colliderRadius: 15, colliderHeight: 27, frictionPerS: 2.2 },
  parts: [
    { id: "chassis", shape: "box", position: [0, 7, 0], size: [24, 8, 16], material: mint },
    { id: "stem", shape: "cylinder", position: [0, 15, 0], size: [7, 12, 7], material: cream },
    { id: "cap", shape: "sphere", position: [0, 22, 0], size: [24, 10, 22], material: red },
    { id: "wheel-nw", shape: "cylinder", position: [-8, 4, -9], size: [8, 4, 8], rotation: [Math.PI / 2, 0, 0], material: rubber, animation: { kind: "roll", radius: 4 } },
    { id: "wheel-ne", shape: "cylinder", position: [8, 4, -9], size: [8, 4, 8], rotation: [Math.PI / 2, 0, 0], material: rubber, animation: { kind: "roll", radius: 4 } },
    { id: "wheel-sw", shape: "cylinder", position: [-8, 4, 9], size: [8, 4, 8], rotation: [Math.PI / 2, 0, 0], material: rubber, animation: { kind: "roll", radius: 4 } },
    { id: "wheel-se", shape: "cylinder", position: [8, 4, 9], size: [8, 4, 8], rotation: [Math.PI / 2, 0, 0], material: rubber, animation: { kind: "roll", radius: 4 } },
  ],
};

const bark: ObjectMaterial = { shaderStyle: "toon", colorA: "#604638", colorB: "#372c2c" };
const leaf: ObjectMaterial = { shaderStyle: "toon", colorA: "#32644c", colorB: "#224a40" };
const leafLight: ObjectMaterial = { shaderStyle: "toon", colorA: "#477b50", colorB: "#32644c" };
const sway = { kind: "sway" as const, amplitudeRad: .025, speed: 1.2 };

export const mockOak: ObjectDsl = {
  dslVersion: 1, displayName: "Oak", body: { interaction: "solid", colliderRadius: 14, colliderHeight: 56 },
  parts: [
    { id: "trunk", shape: "cylinder", position: [0, 14, 0], size: [6, 28, 6], material: bark },
    { id: "branch", shape: "cylinder", position: [-5, 24, 0], size: [3, 17, 3], rotation: [0, 0, -.6], material: bark },
    { id: "crown", shape: "icosphere", position: [0, 40, 0], size: [34, 32, 32], material: leaf, animation: sway },
    { id: "crown-left", shape: "icosphere", position: [-12, 33, 3], size: [24, 24, 23], material: leafLight, animation: sway },
    { id: "crown-right", shape: "icosphere", position: [12, 35, -4], size: [23, 25, 24], material: leaf, animation: sway },
  ],
};

export const mockPine: ObjectDsl = {
  dslVersion: 1, displayName: "Pine", body: { interaction: "solid", colliderRadius: 12, colliderHeight: 64 },
  parts: [
    { id: "trunk", shape: "cylinder", position: [0, 12, 0], size: [5, 24, 5], material: bark },
    { id: "lower-crown", shape: "cone", position: [0, 30, 0], size: [37, 30, 37], material: leaf, animation: sway },
    { id: "middle-crown", shape: "cone", position: [0, 43, 0], size: [29, 27, 29], material: leafLight, animation: sway },
    { id: "upper-crown", shape: "cone", position: [0, 55, 0], size: [19, 24, 19], material: leaf, animation: sway },
  ],
};

export const mockRock: ObjectDsl = {
  grounding:"surface",
  dslVersion: 1, displayName: "Boulders", body: { interaction: "solid", colliderRadius: 18, colliderHeight: 22 },
  parts: [
    { id: "large", shape: "icosphere", position: [-5, 11, 0], size: [29, 22, 26], material: stone },
    { id: "small", shape: "icosphere", position: [12, 6, 5], size: [18, 12, 18], rotation: [0, .7, .2], material: stone },
  ],
};

const carPaint: ObjectMaterial = { shaderStyle: "toon", colorA: "#bf4936", colorB: "#77382e" };
const glass: ObjectMaterial = { shaderStyle: "toon", colorA: "#284d61", colorB: "#152d3d" };
const lamp: ObjectMaterial = { shaderStyle: "glow", colorA: "#ffe4a0", colorB: "#ffffff" };
export const mockCar: ObjectDsl = {
  dslVersion: 1, displayName: "Little rally car", body: { interaction: "solid", colliderRadius: 11, colliderHeight: 14 },
  parts: [
    { id: "chassis", shape: "box", position: [0, 6, 0], size: [33, 7, 17], material: carPaint },
    { id: "hood", shape: "box", position: [10, 10, 0], size: [12, 3, 16], material: carPaint },
    { id: "cab", shape: "box", position: [-4, 11, 0], size: [16, 8, 14], material: glass },
    { id: "roof", shape: "box", position: [-4, 15, 0], size: [15, 2, 13], material: cream },
    { id: "stripe", shape: "box", position: [10, 11.6, 0], size: [12, .5, 3], material: cream },
    { id: "bumper", shape: "box", position: [17, 5, 0], size: [2, 3, 18], material: rubber },
    { id: "wing-post", shape: "box", position: [-15, 11, 0], size: [2, 6, 13], material: rubber },
    { id: "wing", shape: "box", position: [-15, 14, 0], size: [5, 2, 21], material: carPaint },
    ...([-1, 1] as const).flatMap((side) => [
      { id: `lamp-${side}`, shape: "box" as const, position: [17.3, 8, side * 5.5] as [number, number, number], size: [1, 3, 4] as [number, number, number], material: lamp },
      ...([-10, 10] as const).map((x) => ({ id: `wheel-${x}-${side}`, shape: "cylinder" as const,
        position: [x, 4, side * 9] as [number, number, number], size: [8, 3, 8] as [number, number, number],
        rotation: [Math.PI / 2, 0, 0] as [number, number, number], material: rubber, animation: { kind: "roll" as const, radius: 4 } })),
    ]),
  ],
};

const wood: ObjectMaterial = { shaderStyle: "toon", colorA: "#966348", colorB: "#583c33" };
const blueRoof: ObjectMaterial = { shaderStyle: "toon", colorA: "#3d6677", colorB: "#263d57" };
export const mockCottage: ObjectDsl = {
  dslVersion: 1, displayName: "Hillside cottage", foundation:{footprint:[46,58],color:"#77817b"}, body: { interaction: "solid", colliderRadius: 28, colliderHeight: 64 },
  parts: [
    { id: "walls", shape: "box", position: [0,17,0], size: [42,34,34], material: cream },
    { id: "roof", shape: "pyramid", position: [0,48,0], size: [52,28,44], material: blueRoof },
    { id: "door", shape: "box", position: [0,10,17.5], size: [10,20,1], material: wood },
    ...[-13,13].map(x => ({ id: `window-${x}`, shape: "box" as const, position: [x,22,17.5] as [number,number,number], size: [8,9,1] as [number,number,number], material: lamp })),
    { id: "chimney", shape: "box", position: [13,53,-6], size: [7,22,7], material: stone },
    { id: "step", shape: "box", position: [0,2,22], size: [17,4,10], material: stone },
  ],
};
export const mockWindmill: ObjectDsl = {
  dslVersion: 1, displayName: "Windmill", foundation:{footprint:[38,38],color:"#77817b"}, body: { interaction: "solid", colliderRadius: 25, colliderHeight: 105 },
  parts: [
    { id: "tower", shape: "cylinder", position: [0,38,0], size: [32,76,32], material: cream },
    { id: "roof", shape: "cone", position: [0,88,0], size: [40,24,40], material: roof },
    { id: "axle", shape: "cylinder", position: [0,64,17], size: [6,16,6], rotation: [Math.PI/2,0,0], material: wood },
    { id: "hub", shape: "sphere", position: [0,64,21], size: [10,10,10], material: wood },
    ...[0,1].map(i => ({ id: `sails-${i}`, shape: "box" as const, position: [0,64,21] as [number,number,number], size: [8,78,2] as [number,number,number], rotation: [0,0,i*Math.PI/2] as [number,number,number], material: wood, animation: {kind:"spin" as const, axis:"z" as const, speed:.5} })),
    { id: "door", shape: "box", position: [0,11,16], size: [9,22,2], material: wood },
  ],
};
export const mockCrystal: ObjectDsl = {
  dslVersion: 1, displayName: "Crystal garden", body: { interaction: "solid", colliderRadius: 17, colliderHeight: 43 },
  parts: [-1,0,1].map((x) => ({ id:`crystal-${x}`,shape:"icosphere",position:[x*11,x===0?24:13,x*4],size:[13,x===0?48:27,13],rotation:[0,0,-x*.25],
    material:{shaderStyle:"glow",colorA:x===0?"#79d1cb":"#7b9ac4",colorB:"#ffffff"} })),
};
export const mockRuin: ObjectDsl = {
  dslVersion:1,displayName:"Ancient ruins",foundation:{footprint:[60,54],color:"#77817b"},body:{interaction:"solid",colliderRadius:28,colliderHeight:38},
  parts:[
    ...[-18,18].map(x=>({id:`pillar-${x}`,shape:"cylinder" as const,position:[x,18,0] as [number,number,number],size:[12,36,12] as [number,number,number],material:stone})),
    {id:"lintel",shape:"box",position:[0,37,0],size:[52,8,16],rotation:[0,0,.06],material:stone},
    {id:"fallen",shape:"cylinder",position:[6,7,19],size:[12,31,12],rotation:[0,0,Math.PI/2],material:stone},
  ],
};
export const mockCactus: ObjectDsl = {
  dslVersion:1,displayName:"Cactus",body:{interaction:"solid",colliderRadius:10,colliderHeight:42},
  parts:[
    {id:"stem",shape:"cylinder",position:[0,21,0],size:[12,42,12],material:leafLight},
    {id:"tip",shape:"sphere",position:[0,42,0],size:[12,10,12],material:leafLight},
    ...[-1,1].flatMap(x=>[
      {id:`arm-${x}`,shape:"box" as const,position:[x*8,20+x*5,0] as [number,number,number],size:[14,7,7] as [number,number,number],material:leaf},
      {id:`finger-${x}`,shape:"cylinder" as const,position:[x*14,26+x*5,0] as [number,number,number],size:[8,17,8] as [number,number,number],material:leaf},
    ]),
  ],
};
export const mockAutumnTree: ObjectDsl = { ...mockOak, displayName:"Amber tree", parts:mockOak.parts.map(p=>p.animation ? {...p,material:{shaderStyle:"toon",colorA:p.id==="crown"?"#b87536":"#d4a456",colorB:"#774b32"}} : p) };
