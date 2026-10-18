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
export const nightFactor = { value: 0 };
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
  const material=new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
  material.userData.streamMaterial={kind:"toon",color:material.color.getHex()};return material;
}

function baseStyledMaterial(spec: ObjectMaterial, useB = false): THREE.Material {
  const color = new THREE.Color(useB ? spec.colorB : spec.colorA);
  switch (spec.shaderStyle) {
    case "brick": case "wood": case "stone":
      return surfaceMaterial(spec);
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

/** Physical-scale surface detail on existing faces, without per-brick geometry or downloads. */
function surfaceMaterial(spec: ObjectMaterial): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: spec.colorA, roughness: spec.shaderStyle === "wood" ? .78 : .96 });
  const wood = spec.shaderStyle === "wood", stone = spec.shaderStyle === "stone";
  material.onBeforeCompile = shader => {
    shader.uniforms.surfaceTint = { value: new THREE.Color(spec.colorB) };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 surfacePosition; varying vec3 vSurfacePosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSurfacePosition=surfacePosition;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
      varying vec3 vSurfacePosition; uniform vec3 surfaceTint;
      float surfaceHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec3 localDx=dFdx(vSurfacePosition),localDy=dFdy(vSurfacePosition);
        vec3 viewDx=dFdx(-vViewPosition),viewDy=dFdy(-vViewPosition);
        // Recover uniform physical scale even after instancing or baking fragment transforms.
        float unitScale=sqrt((dot(viewDx,viewDx)+dot(viewDy,viewDy))/max(dot(localDx,localDx)+dot(localDy,localDy),1e-12));
        unitScale=floor(unitScale*1000.+.5)/1000.;
        vec3 surfacePoint=vSurfacePosition*unitScale;
        float surfaceHeight=0.;
        ${wood ? `
          float rings=(length(surfacePoint.xz+vec2(2.3,1.1))+.045*sin(surfacePoint.y*.27))*18.;
          float grainDetail=1.-smoothstep(.5,3.,fwidth(rings));
          float grain=.5+.5*sin(rings);
          diffuseColor.rgb=mix(diffuseColor.rgb,surfaceTint,.16+grainDetail*grain*.22);
          surfaceHeight=grain*grainDetail*.018;` : stone ? `
          float mineral=.5+.5*sin(surfacePoint.x*.73+surfacePoint.y*.91+sin(surfacePoint.z*.8));
          float fleck=surfaceHash(floor(surfacePoint.xy*3.)+floor(surfacePoint.z*3.));
          float detail=1.-smoothstep(.3,1.,max(fwidth(surfacePoint.x),max(fwidth(surfacePoint.y),fwidth(surfacePoint.z)))*3.);
          diffuseColor.rgb=mix(diffuseColor.rgb,surfaceTint,.12+mineral*.18+(fleck-.5)*detail*.12);
          surfaceHeight=(mineral+fleck*detail*.2)*.025;` : `
          vec3 face=abs(normalize(cross(localDx,localDy)));
          vec2 plane=face.y>.7 ? surfacePoint.xz : face.x>face.z ? surfacePoint.zy : surfacePoint.xy;
          vec2 tile=plane/vec2(2.4,.75);
          float row=floor(tile.y);tile.x+=mod(row,2.)*.5;
          vec2 cell=floor(tile),edge=min(fract(tile),1.-fract(tile));
          vec2 aa=max(fwidth(tile),vec2(.0001));
          float faceMask=smoothstep(.02-aa.x,.02+aa.x,edge.x)*smoothstep(.055-aa.y,.055+aa.y,edge.y);
          float detail=1.-smoothstep(.22,.8,max(aa.x,aa.y));
          faceMask=mix(.86,faceMask,detail);
          float tint=(surfaceHash(cell)-.5)*.22*detail;
          vec3 faceColor=diffuseColor.rgb*(1.+tint);
          diffuseColor.rgb=mix(surfaceTint,faceColor,faceMask);
          surfaceHeight=faceMask*.045;`}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        vec3 surfaceR1=cross(viewDy,normal),surfaceR2=cross(normal,viewDx);
        float surfaceDet=dot(viewDx,surfaceR1);
        normal=normalize(abs(surfaceDet)*normal-sign(surfaceDet)*(dFdx(surfaceHeight)*surfaceR1+dFdy(surfaceHeight)*surfaceR2));`);
  };
  material.customProgramCacheKey = () => `surface-${spec.shaderStyle}-1`;
  return material;
}

/** Night paint travels with geometry through rigid merging, instancing and released fragments. */
export function nightPaint(material:THREE.Material):void {
  const original=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey();
  material.userData.streamMaterial={...material.userData.streamMaterial,nightPaint:true};
  material.onBeforeCompile=(shader,renderer)=>{
    original(shader,renderer);shader.uniforms.nightFactor=nightFactor;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 nightEmission; varying vec3 vNightEmission;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvNightEmission=nightEmission;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float nightFactor; varying vec3 vNightEmission;')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vNightEmission*nightFactor*1.8;');
  };
  material.customProgramCacheKey=()=>key+'-night-paint';
}
export function styledMaterial(spec:ObjectMaterial,useB=false):THREE.Material {
  const material=baseStyledMaterial(spec,useB);material.userData.streamMaterial={kind:"styled",spec,useB};
  if(spec.nightColor && !['toon','paper-grain'].includes(spec.shaderStyle)){
    const lit=material as THREE.MeshStandardMaterial;lit.emissive.setRGB(0,0,0);
    const original=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey(),tint=new THREE.Color(spec.nightColor);
    material.onBeforeCompile=(shader,renderer)=>{
      original(shader,renderer);shader.uniforms.nightFactor=nightFactor;shader.uniforms.nightTint={value:tint};
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float nightFactor; uniform vec3 nightTint;')
        .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=nightTint*nightFactor*1.8;');
    };
    material.customProgramCacheKey=()=>key+'-night-glow';
  }
  return material;
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
  mat.userData.streamMaterial={kind:"ground"};return mat;
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
  grainInject(material,.025);terrainCutaway(material);material.userData.streamMaterial={kind:"road"};return material;
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

// Shared UVs deform coincident water vertices equally, including chunk boundaries.
// Cell anchors stay in the mesh data; independent cell displacements opened cracks.
export function waterMaterial(water:Water,texture:THREE.DataTexture,grid:{columns:number;rows:number;width:number;height:number},voxel=false):THREE.MeshStandardMaterial {
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
    shader.vertexShader=shader.vertexShader.replace("#include <common>",`#include <common>\n${common}\nattribute float waterDepth;${voxel ? 'attribute vec2 voxelAnchor;' : ''}`)
      .replace("#include <beginnormal_vertex>",`#include <beginnormal_vertex>
        float wx=(waterWave(uv+vec2(waveTexel.x,0.))-waterWave(uv-vec2(waveTexel.x,0.)))/(2.*waterSize.x*waveTexel.x);
        float wy=(waterWave(uv+vec2(0.,waveTexel.y))-waterWave(uv-vec2(0.,waveTexel.y)))/(2.*waterSize.y*waveTexel.y);
        objectNormal=normalize(vec3(-wx,1.,-wy));`)
      .replace("#include <begin_vertex>",`#include <begin_vertex>\nwaterUV=uv;waterShore=waterDepth;transformed.y+=waterWave(uv);`);
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>",`#include <common>\n${common}`)
      .replace("#include <color_fragment>",`#include <color_fragment>
        vec2 p=waterUV*waterSize-waterFlow*time;
        float streak=pow(max(0.,sin(p.x*.13+p.y*.08+sin(p.y*.045-time)*2.)),24.)*smoothstep(.4,.85,sin(p.y*.071-p.x*.043)*.5+.5);
        float ripple=abs(waterSample(waterUV));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.84,.79),min(.7,streak*.24+ripple*.2+(1.-smoothstep(.1,1.2,waterShore))*.18));`);
  };
  material.customProgramCacheKey=()=>voxel ? 'landscape-water-voxel-v3' : "landscape-water-v1";return material;
}

const surfaceVertex = `varying vec2 v; void main() {
  v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`;

/** Effects receive the same light and shadows as the road; only boost strips emit light. */
export function zoneMaterial(effect: Effect): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ roughness: effect === "ICE" ? .28 : .8,
    metalness: effect === "ICE" ? .12 : 0, transparent: true, depthWrite: false });
  material.userData.streamMaterial={kind:"zone",effect};
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

/** One instanced draw for the same bounded particle pool, using solid voxel shards. */
export function voxelParticleMaterial():THREE.ShaderMaterial{
  return new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,
    vertexShader:`attribute vec3 offset;attribute float opacity;attribute float size;attribute float kind;attribute float angle;
      varying float alpha;varying vec3 tint;
      void main(){alpha=opacity;float c=cos(angle),s=sin(angle);mat3 turn=mat3(c,0.,-s,0.,1.,0.,s,0.,c);
        vec3 extent=vec3(1.);if(kind>.5&&kind<1.5)extent=vec3(.3,1.8,.3);
        vec3 p=turn*(position*extent*max(0.,size)*.35)+offset;
        tint=color*(.65+.35*max(0.,dot(turn*normal,normalize(vec3(-.4,.8,.3)))));
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying float alpha;varying vec3 tint;void main(){if(alpha<.005)discard;gl_FragColor=vec4(tint,alpha);}`});
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
  material.userData.streamMaterial={kind:"scenery",base:material.userData.streamMaterial,motion};
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
  material.userData.streamMaterial={kind:"scenery-depth",motion,cloth};
  if(cloth)addClothWind(material);
  const original=material.onBeforeCompile.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{original(shader,renderer);sceneryMotion(shader,motion);};
  material.customProgramCacheKey=()=>`scenery-depth-${JSON.stringify(motion)}-${cloth}`;return material;
}

/** Cosmetic flight deforms identical color/shadow geometry; reduced motion freezes the complete pose. */
function flockShader(shader:CompiledShader,flock:import('../scene/population').Flock,scale:number):void{
  shader.uniforms.flockTime=worldTime;shader.uniforms.flockMotion=worldMotion;
  const rx=(flock.radius.x/scale).toFixed(6),rz=(flock.radius.y/scale).toFixed(6),angular=(flock.speed/Math.max(flock.radius.x,flock.radius.y)).toFixed(6);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
    attribute vec4 flight;uniform float flockTime;uniform float flockMotion;
    mat3 flightYaw(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s,0.,1.,0.,-s,0.,c);}
    float flightAngle(){return flight.x+flockTime*flockMotion*${angular}*flight.w;}
    float flightHeading(){float a=flightAngle();return atan(${rz}*cos(a),-${rx}*sin(a));}
    float wingSlope(){return sin(flockTime*flockMotion*${(flock.flapHz*Math.PI*2).toFixed(6)}+flight.z)*${Math.tan(flock.flapDeg*Math.PI/180).toFixed(6)};}`)
    .replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      objectNormal.z-=sign(position.z)*wingSlope()*objectNormal.y;
      objectNormal=flightYaw(flightHeading())*normalize(objectNormal);`)
    .replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.y+=abs(transformed.z)*wingSlope();
      transformed=flightYaw(flightHeading())*transformed;
      float a=flightAngle();transformed+=vec3(${rx}*flight.y*cos(a),sin(a*2.+flight.z)*${(5/scale).toFixed(6)},${rz}*flight.y*sin(a));`);
}
export function flockMaterial(material:THREE.Material,flock:import('../scene/population').Flock,scale:number):THREE.Material{
  const original=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{original(shader,renderer);flockShader(shader,flock,scale);};
  material.customProgramCacheKey=()=>`flock-${key}-${flock.radius.x}-${flock.radius.y}-${flock.speed}-${flock.flapHz}-${flock.flapDeg}-${scale}`;return material;
}
export function flockDepthMaterial(flock:import('../scene/population').Flock,scale:number):THREE.MeshDepthMaterial{
  const material=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  material.onBeforeCompile=shader=>flockShader(shader,flock,scale);
  material.customProgramCacheKey=()=>`flock-depth-${flock.radius.x}-${flock.radius.y}-${flock.speed}-${flock.flapHz}-${flock.flapDeg}-${scale}`;return material;
}

/** Rigid GPU joint transforms share full authored geometry across ambient members. */
export function ambientMaterial(material:THREE.Material,rig:import('../scene/ambient').Ambient['joints'],depth=false,sports=false):THREE.Material{
  const original=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey();
  const bones=['root','spine','left_hip','left_knee','left_ankle','left_shoulder','left_elbow','right_hip','right_knee','right_ankle','right_shoulder','right_elbow'];
  const ids=new Map(rig.map((j,i)=>[j.id,i+1])),rotations=[new THREE.Vector4(0,0,0,1)],positions=[new THREE.Vector4()],swings=[new THREE.Vector4()],rates=[0],bindings=[0];
  for(const j of rig){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...(j.rotation??[0,0,0]))),a=j.animation && !('kind' in j.animation) ? j.animation : undefined;
    rotations.push(new THREE.Vector4(q.x,q.y,q.z,q.w));positions.push(new THREE.Vector4(...j.position,j.parent ? ids.get(j.parent)! : 0));
    swings.push(new THREE.Vector4(a?.axis==='x' ? a.amplitudeRad : 0,a?.axis==='y' ? a.amplitudeRad : 0,a?.axis==='z' ? a.amplitudeRad : 0,a?.phase??0));rates.push(a?.speed??0);bindings.push(j.bone ? bones.indexOf(j.bone)+1 : 0);
  }
  while(positions.length<13){positions.push(new THREE.Vector4());rotations.push(new THREE.Vector4(0,0,0,1));swings.push(new THREE.Vector4());rates.push(0);bindings.push(0);}
  const leg=(side:string)=>{const get=(bone:string)=>rig.find(j=>j.bone===bone);return new THREE.Vector4(get('root')?.position[1]??25,get(side+'_hip')?.position[1]??0,-(get(side+'_knee')?.position[1]??-11.5),-(get(side+'_ankle')?.position[1]??-10.5));};
  material.onBeforeCompile=(shader,renderer)=>{
    original(shader,renderer);Object.assign(shader.uniforms,{popRot:{value:rotations},popPos:{value:positions},popSwing:{value:swings},popRate:{value:rates},popBinding:{value:bindings},popLeft:{value:leg('left')},popRight:{value:leg('right')},popEnabled:worldMotion});
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute float popBone; attribute vec3 popCycle;
${sports ? 'attribute vec2 popPlay;' : ''}
uniform vec4 popRot[13]; uniform vec4 popPos[13]; uniform vec4 popSwing[13];
uniform float popRate[13]; uniform int popBinding[13]; uniform vec4 popLeft; uniform vec4 popRight; uniform float popEnabled;
vec4 popMul(vec4 a,vec4 b){return vec4(a.w*b.xyz+b.w*a.xyz+cross(a.xyz,b.xyz),a.w*b.w-dot(a.xyz,b.xyz));}
vec4 popAxis(vec3 axis,float angle){return vec4(axis*sin(angle*.5),cos(angle*.5));}
vec3 popRotate(vec4 q,vec3 p){return p+2.*cross(q.xyz,cross(q.xyz,p)+q.w*p);}
vec4 popHuman(int binding,float phase,float amount,out float lift){
 float run=clamp(amount-1.,0.,1.);amount=min(amount,1.);
 float tau=6.28318530718;lift=0.;bool left=binding<8;int b=left ? binding : binding-5;float offset=left ? 0. : .5,signSide=left ? 1. : -1.;
 float unit=popLeft.x/25.;
 if(binding==1){lift=unit*amount*(-mix(1.7,5.5,run)+mix(.8,1.2,run)*(1.-cos(phase*tau*2.)));return popAxis(vec3(0,1,0),sin(phase*tau)*mix(.055,.09,run)*amount);}
 if(binding==2)return popMul(popAxis(vec3(0,1,0),-sin(phase*tau)*.1*amount),popAxis(vec3(0,0,1),-mix(.035,.13,run)*amount));
 if(b==6)return popMul(popAxis(vec3(1,0,0),-signSide*.07*amount),popAxis(vec3(0,0,1),-sin((phase+offset)*tau)*mix(.28,.7,run)*amount));
 if(b==7)return popAxis(vec3(0,0,1),(mix(.12,.8,run)+max(0.,sin((phase+offset)*tau))*mix(.18,.25,run))*amount);
 vec4 dims=left ? popLeft : popRight;float t=fract(phase+offset),x,y,toe,stance=mix(.62,.42,run),reach=mix(6.8,14.,run);
 if(t<stance){float u=t/stance;x=mix(reach,-reach,u);y=0.;toe=.16*(1.-u)-.38*pow(u,5.);}
 else{float u=(t-stance)/(1.-stance),e=u*u*(3.-2.*u);x=mix(-reach,reach,e);y=pow(max(0.,sin(3.14159265359*u)),1.5)*mix(4.5,8.,run);toe=mix(-.38,.16,e)+.12*sin(3.14159265359*u);}
 toe*=amount;float rootY=dims.x+unit*amount*(-mix(1.7,5.5,run)+mix(.8,1.2,run)*(1.-cos(phase*tau*2.)));
 float ankleY=dims.x+dims.y-dims.z-dims.w;
 vec2 foot=vec2(x*unit*amount,ankleY+unit*(y*amount+max(0.,max(-toe*6.8,toe*2.2)))-rootY-dims.y);
 float d=clamp(length(foot),abs(dims.z-dims.w)+.001,dims.z+dims.w-.001);
 float hip=atan(foot.x,-foot.y)+acos(clamp((dims.z*dims.z+d*d-dims.w*dims.w)/(2.*dims.z*d),-1.,1.));
 float knee=-acos(clamp((d*d-dims.z*dims.z-dims.w*dims.w)/(2.*dims.z*dims.w),-1.,1.));
 return popAxis(vec3(0,0,1),b==3 ? hip : b==4 ? knee : -hip-knee+toe);
}
vec3 popTransform(vec3 p,bool direction){
 int j=int(popBone+.5);float amount=popCycle.z*popEnabled;
 for(int depth=0;depth<4;depth++){
  if(j==0)break;float lift=0.;vec4 motion=vec4(0,0,0,1);int binding=popBinding[j];
  if(amount>.0001){
   if(binding>0)motion=popHuman(binding,popCycle.y,amount,lift);
   else{vec3 a=popSwing[j].xyz;float amplitude=length(a);if(amplitude>0.)motion=popAxis(a/amplitude,sin(popCycle.x*popRate[j]+popSwing[j].w)*amplitude*amount);}
  }
  ${sports ? `float play=sin(clamp(popPlay.y,0.,1.)*3.14159265)*popEnabled;
  if(popPlay.x>0.5 && play>0.){
   float action=popPlay.x;float angle=0.;
   if(action<1.5){if(binding==8)angle=1.05*play;if(binding==9)angle=-.45*play;if(binding==2)angle=-.18*play;}
   else if(action<2.5){if(binding==6 || binding==11)angle=1.7*play;if(binding==7 || binding==12)angle=-.65*play;}
   else{if(binding==8)angle=.8*play;if(binding==3)angle=-.3*play;if(binding==2)angle=-.3*play;}
   motion=popMul(motion,popAxis(vec3(0,0,1),angle));
  }` : ''}
  p=popRotate(popMul(popRot[j],motion),p);if(!direction)p+=popPos[j].xyz+vec3(0,lift,0);j=int(popPos[j].w+.5);
 }
 return p;
}`)
    .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=popTransform(objectNormal,true);')
    .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=popTransform(transformed,false);');
  };
  material.customProgramCacheKey=()=>`ambient-${key}-${JSON.stringify(rig)}-${depth}-${sports}`;return material;
}
