import * as THREE from "three";
import type { Effect } from "../scene/schema";
import type { ObjectMaterial, ObjectPart } from "../scene/object-dsl";
import type { Water } from "../scene/landscape-dsl";

/**
 * All shaders are authored here, in code. Model-invented objects choose a
 * `shaderStyle` from this allowlist plus two colors — they never supply
 * GLSL (user decision: invent-as-data). Animated materials share a clock
 * that pauses with the game and stops for reduced motion.
 */
export const worldTime = { value: 0 };
export const worldMotion = { value: 1 };
export const terrainPlayer = { value: new THREE.Vector3() };
export const terrainView = { value: new THREE.Vector3(180,1000,480).normalize() };

function grainInject(material: THREE.MeshStandardMaterial, strength: number): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos3;")
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        vec4 grainWorld=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          grainWorld=instanceMatrix*grainWorld;
        #endif
        vWorldPos3=(modelMatrix*grainWorld).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vWorldPos3;
        float paperHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb *= 1.0 - ${strength.toFixed(2)} * paperHash(floor(vWorldPos3.xz * 1.5));`,
      );
  };
}

const toonGradient = (() => {
  let tex: THREE.DataTexture | null = null;
  return () => {
    if (!tex) {
      tex = new THREE.DataTexture(new Uint8Array([55, 115, 185, 235]), 4, 1, THREE.RedFormat);
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.needsUpdate = true;
    }
    return tex;
  };
})();

/** Material factory for model-invented objects, by allowlisted style. */
export function toonMaterial(color: THREE.ColorRepresentation): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
}

export function styledMaterial(spec: ObjectMaterial, useB = false): THREE.Material {
  const color = new THREE.Color(useB ? spec.colorB : spec.colorA);
  switch (spec.shaderStyle) {
    case "toon":
      return toonMaterial(color);
    case "cloth": {
      const mat = toonMaterial(color);
      addClothWind(mat);
      return mat;
    }
    case "glow":
      return new THREE.MeshStandardMaterial({
        color: color.clone().multiplyScalar(0.35),
        emissive: color,
        emissiveIntensity: 0.75,
        roughness: 0.4,
      });
    case "stripes": {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
      const other = new THREE.Color(useB ? spec.colorA : spec.colorB);
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.stripeColor = { value: other };
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying float vLocalY;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocalY = position.y;");
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying float vLocalY;\nuniform vec3 stripeColor;")
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            if (fract(vLocalY * 0.14) > 0.62) diffuseColor.rgb = stripeColor;`,
          );
      };
      return mat;
    }
    case "paper-grain":
    default: {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
      grainInject(mat, 0.16);
      return mat;
    }
  }
}

/** Cloth waves are engine-owned; rigid foliage motion lives in the compiler. */
function addClothWind(material: THREE.Material): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.time = worldTime;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float time;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        transformed.z += sin(time * 3.0 + position.x * 6.0) * (position.x + 0.5) * 2.0;`);
  };
  material.customProgramCacheKey = () => "cloth";
}

export function groundMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  grainInject(mat, .055);
  terrainCutaway(mat);
  return mat;
}

/** Dither only ground between the eye and the car; steep terrain never forces a camera tilt. */
function terrainCutaway(material:THREE.MeshStandardMaterial):void {
  const original=material.onBeforeCompile.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
    original(shader,renderer);shader.uniforms.terrainPlayer=terrainPlayer;shader.uniforms.terrainView=terrainView;
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\nuniform vec3 terrainPlayer; uniform vec3 terrainView;")
      .replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
        vec3 toGround=vWorldPos3-terrainPlayer;float along=dot(toGround,terrainView);
        float across=length(toGround-terrainView*along);
        if(along>14. && across<26. && fract(dot(floor(gl_FragCoord.xy),vec2(.754877,.569841)))>.22) discard;`);
  };
}

export function roadMaterial():THREE.MeshStandardMaterial {
  const material=new THREE.MeshStandardMaterial({color:"#374653",roughness:.95});
  grainInject(material,.025);terrainCutaway(material);return material;
}

export function bridgeMaterial(style:"timber"|"stone"):THREE.MeshStandardMaterial {
  const material=new THREE.MeshStandardMaterial({color:style==="timber" ? "#aa8054" : "#9b9e9c",roughness:.9});
  material.onBeforeCompile=shader=> {
    shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nvarying vec2 deckUV;")
      .replace("#include <begin_vertex>","#include <begin_vertex>\ndeckUV=uv;");
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\nvarying vec2 deckUV;")
      .replace("#include <color_fragment>",`#include <color_fragment>
        vec2 p=deckUV*vec2(${style==="timber" ? "1.,28." : "7.,16."});
        ${style==="stone" ? "p.x+=mod(floor(p.y),2.)*.5;" : ""}
        float seam=step(.91,fract(p.y));
        ${style==="stone" ? "seam=max(seam,step(.92,fract(p.x)));" : ""}
        float grain=sin(p.x*140.+sin(p.y*7.)*.8)*.04;
        float board=fract(sin(floor(p.y)*127.1)*43758.5453);
        diffuseColor.rgb*=mix(.88+grain+board*.12, .38,seam);`);
  };
  material.customProgramCacheKey=()=>`bridge-${style}`;return material;
}

export function waterMaterial(water:Water,texture:THREE.DataTexture,grid:{columns:number;rows:number;width:number;height:number}):THREE.MeshStandardMaterial {
  const material=new THREE.MeshStandardMaterial({color:water.color,roughness:.28,metalness:.12,transparent:true,opacity:.88,depthWrite:false});
  material.onBeforeCompile=shader=> {
    Object.assign(shader.uniforms,{waveField:{value:texture},waveTexel:{value:new THREE.Vector2(1/grid.columns,1/grid.rows)},
      waterSize:{value:new THREE.Vector2(grid.width,grid.height)},waterFlow:{value:new THREE.Vector2(water.flow.x,water.flow.y)},
      time:worldTime,motion:worldMotion});
    const common=`uniform sampler2D waveField;uniform vec2 waveTexel;uniform vec2 waterSize;uniform vec2 waterFlow;
      uniform float time;uniform float motion;varying vec2 waterUV;varying float waterShore;
      float waterSample(vec2 p) {return texture2D(waveField,p*(1.-waveTexel)+waveTexel*.5).r*4.-2.;}
      float waterWave(vec2 p) {vec2 q=p*waterSize-waterFlow*time;
        return waterSample(p)+motion*(sin(q.x*.065+q.y*.03-time*1.2)+sin(q.y*.11-time*.7))*.26;}`;
    shader.vertexShader=shader.vertexShader.replace("#include <common>",`#include <common>\n${common}\nattribute float waterDepth;`)
      .replace("#include <beginnormal_vertex>",`#include <beginnormal_vertex>
        float wx=(waterWave(uv+vec2(waveTexel.x,0.))-waterWave(uv-vec2(waveTexel.x,0.)))/(2.*waterSize.x*waveTexel.x);
        float wy=(waterWave(uv+vec2(0.,waveTexel.y))-waterWave(uv-vec2(0.,waveTexel.y)))/(2.*waterSize.y*waveTexel.y);
        objectNormal=normalize(vec3(-wx,1.,-wy));`)
      .replace("#include <begin_vertex>","#include <begin_vertex>\nwaterUV=uv;waterShore=waterDepth;transformed.y+=waterWave(uv);");
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>",`#include <common>\n${common}`)
      .replace("#include <color_fragment>",`#include <color_fragment>
        vec2 p=waterUV*waterSize-waterFlow*time;
        float streak=pow(max(0.,sin(p.x*.13+p.y*.08+sin(p.y*.045-time)*2.)),24.)*smoothstep(.4,.85,sin(p.y*.071-p.x*.043)*.5+.5);
        float ripple=abs(waterSample(waterUV));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.84,.79),min(.7,streak*.24+ripple*.2+(1.-smoothstep(.1,1.2,waterShore))*.18));`);
  };
  material.customProgramCacheKey=()=>"landscape-water-v1";return material;
}

const surfaceVertex = `varying vec2 v; void main() {
  v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`;

/** Effects receive the same light and shadows as the road; only boost strips emit light. */
export function zoneMaterial(effect: Effect): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ roughness: effect === "ICE" ? .28 : .8,
    metalness: effect === "ICE" ? .12 : 0, transparent: true, depthWrite: false });
  material.onBeforeCompile = shader => {
    shader.uniforms.time = worldTime;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nattribute float edgeDistance; varying vec2 v; varying vec2 surfaceXZ; varying float surfaceEdge;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nv=uv; surfaceXZ=position.xz; surfaceEdge=edgeDistance;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform float time; varying vec2 v; varying vec2 surfaceXZ; varying float surfaceEdge;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec3 zoneGlow=vec3(0.);
        float mottling=sin(surfaceXZ.x*.23+sin(surfaceXZ.y*.19)*2.)*sin(surfaceXZ.y*.31-surfaceXZ.x*.11);
        float feather=smoothstep(0.,12.,surfaceEdge-2.-mottling*2.);
        float ends=smoothstep(0.,.16,v.y)*smoothstep(0.,.16,1.-v.y);
        diffuseColor.a*=feather*ends;
        ${effect === "ICE" ? `
        vec2 p=v*vec2(4.,9.); float n=9.; float n2=9.;
        for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
          vec2 cell=floor(p)+vec2(float(x),float(y));
          vec2 seed=fract(sin(vec2(dot(cell,vec2(127.1,311.7)),dot(cell,vec2(269.5,183.3))))*43758.5453);
          float d=length(cell+seed-p); if(d<n){n2=n;n=d;}else n2=min(n2,d);
        }
        float cracks=1.-smoothstep(.012,.045,n2-n);
        float glint=pow(max(0.,1.-abs(v.x+v.y*.7-fract(time*.09)*2.)*6.),4.);
        diffuseColor.rgb=mix(vec3(.08,.23,.28),vec3(.38,.63,.68),cracks*.65+mottling*.035);
        diffuseColor.a*=.87;
        zoneGlow=vec3(.02,.05,.06)*glint;
        ` : `
        float arrow=abs(fract(v.y*4.+abs(v.x-.5)*1.8-time*.9)-.5);
        float core=1.-smoothstep(.055,.09,arrow);
        float halo=1.-smoothstep(.09,.23,arrow);
        diffuseColor.rgb=vec3(.4,.19,.045);
        diffuseColor.a*=max(core*.9,halo*.18);
        zoneGlow=vec3(1.2,.4,.045)*(core+halo*.09);
        `}`)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance+=zoneGlow;");
  };
  material.customProgramCacheKey = () => `zone-${effect}-feathered`;
  return material;
}

export function particleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, vertexColors: true,
    uniforms: { pixelRatio: { value: Math.min(globalThis.devicePixelRatio ?? 1, 1.5) } },
    vertexShader: `attribute float opacity; attribute float size; attribute float kind; attribute float angle;
      varying float alpha; varying vec3 tint; varying float shape; varying float rotation;
      uniform float pixelRatio;
      void main(){ alpha=opacity; tint=color; shape=kind; rotation=angle; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
        gl_PointSize=size*pixelRatio; }`,
    fragmentShader: `varying float alpha; varying vec3 tint; varying float shape; varying float rotation;
      void main(){
        vec2 p=gl_PointCoord-.5;p=mat2(cos(rotation),sin(rotation),-sin(rotation),cos(rotation))*p;
        float a=1.-smoothstep(.05,.5,length(p));
        if(shape>.5 && shape<1.5) a=(1.-smoothstep(.02,.13,abs(p.x)))*(1.-smoothstep(.15,.48,abs(p.y)));
        if(shape>1.5 && shape<2.5) a=1.-smoothstep(.22,.38,abs(p.x)+abs(p.y));
        if(shape>2.5 && shape<3.5) a=pow(max(0.,1.-length(p)*2.),2.);
        if(shape>3.5 && shape<4.5) a=(1.-smoothstep(.16,.3,abs(p.x)))*(1.-smoothstep(.2,.48,abs(p.y)));
        if(a*alpha<.005) discard;gl_FragColor=vec4(tint,a*alpha);
      }`,
  });
}

export const worldGradeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: surfaceVertex,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 v;
    void main(){
      vec3 c=texture2D(tDiffuse,v).rgb;
      float l=dot(c,vec3(.2126,.7152,.0722));
      c=mix(vec3(l),c,1.05);
      c=max(vec3(0.),(c-.08)*1.08+.08);
      float vignette=smoothstep(.2,.85,distance(v,vec2(.5)));
      gl_FragColor=vec4(c*(1.-vignette*.13),1.);
    }`,
};


type CompiledShader=Parameters<THREE.Material["onBeforeCompile"]>[0];

/** The color and shadow passes must deform the same vertices. */
function sceneryMotion(shader:CompiledShader,motion?:ObjectPart["animation"]):void {
  shader.uniforms.sceneryTime=worldTime;shader.uniforms.sceneryMotion=worldMotion;
  let theta="0.";
  if(motion?.kind === "sway")theta=`sin(sceneryTime*${motion.speed.toFixed(4)}+instanceMatrix[3].x*.01)*${motion.amplitudeRad.toFixed(4)}*sceneryMotion`;
  if(motion?.kind === "spin")theta=`sceneryTime*${motion.speed.toFixed(4)}*sceneryMotion`;
  shader.vertexShader=shader.vertexShader.replace("#include <common>",`#include <common>
    attribute vec3 pivot; attribute vec3 spinAxis;
    uniform float sceneryTime; uniform float sceneryMotion;
    vec3 rigidRotate(vec3 p,vec3 axis,float a){return p*cos(a)+cross(axis,p)*sin(a)+axis*dot(axis,p)*(1.-cos(a));}`)
    .replace("#include <beginnormal_vertex>",`#include <beginnormal_vertex>
objectNormal=rigidRotate(objectNormal,spinAxis,${theta});`)
    .replace("#include <begin_vertex>",`#include <begin_vertex>
float sceneryAngle=${theta};transformed=pivot+rigidRotate(transformed-pivot,spinAxis,sceneryAngle);`);
}

/** Per-instance ghosting keeps occlusion local without cloning thousands of materials. */
export function sceneryMaterial(material:THREE.Material,motion?:ObjectPart["animation"]):THREE.Material {
  const original=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
    original(shader,renderer);sceneryMotion(shader,motion);
    shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nattribute float visibility; varying float sceneryVisibility;")
      .replace("#include <begin_vertex>","#include <begin_vertex>\nsceneryVisibility=visibility;");
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\nvarying float sceneryVisibility;")
      .replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
        if(fract(dot(floor(gl_FragCoord.xy),vec2(.754877,.569841)))>sceneryVisibility) discard;`);
  };
  material.customProgramCacheKey=()=>`scenery-${key}-${JSON.stringify(motion)}`;return material;
}

export function sceneryDepthMaterial(motion?:ObjectPart["animation"],cloth=false):THREE.MeshDepthMaterial {
  const material=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  if(cloth)addClothWind(material);
  const original=material.onBeforeCompile.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{original(shader,renderer);sceneryMotion(shader,motion);};
  material.customProgramCacheKey=()=>`scenery-depth-${JSON.stringify(motion)}-${cloth}`;return material;
}
