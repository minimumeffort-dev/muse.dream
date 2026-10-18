import {createServer} from 'vite';import fs from 'node:fs/promises';
const v=await createServer({configFile:false,cacheDir:'.npm-cache/road-review/audit-ssr',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
try{
 const {buildStreets}=await v.ssrLoadModule('/src/game/streets.ts'),{streetFootprints,onPolygon}=await v.ssrLoadModule('/src/scene/streets.ts');
 const {createWorldScene,worldSource,worldModules}=await v.ssrLoadModule('/src/scene/world-fixture.ts'),{sha256}=await v.ssrLoadModule('/src/scene/save-compatibility.ts');
 const source=await sha256(JSON.stringify([worldSource,Object.entries(worldModules).sort(([a],[b])=>a<b ? -1 : a>b ? 1 : 0)])),scene=createWorldScene(source),root=buildStreets(scene),bounds=streetFootprints(scene),bins=new Map();let triangles=0;
 const add=(t)=>{const xs=[t[0],t[2],t[4]],ys=[t[1],t[3],t[5]];for(let y=Math.floor(Math.min(...ys)/64);y<=Math.floor(Math.max(...ys)/64);y++)for(let x=Math.floor(Math.min(...xs)/64);x<=Math.floor(Math.max(...xs)/64);x++){const key=x+','+y,row=bins.get(key)??[];row.push(t);bins.set(key,row);}};
 root.getObjectByName('street-carriageways').traverse(n=>{if(!n.isMesh)return;const p=n.geometry.getAttribute('position'),index=n.geometry.index;for(let j=0;j<(index?.count??p.count);j+=3){const ids=[0,1,2].map(k=>index?.getX(j+k)??j+k),t=ids.flatMap(i=>[p.getX(i)+scene.canonical.width/2,p.getZ(i)+scene.canonical.height/2]);if(Math.abs((t[2]-t[0])*(t[5]-t[1])-(t[3]-t[1])*(t[4]-t[0]))>1e-7){triangles++;add(t);}}});
 const contains=(t,x,y)=>{const [ax,ay,bx,by,cx,cy]=t,area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax),u=((bx-x)*(cy-y)-(by-y)*(cx-x))/area,w=((cx-x)*(ay-y)-(cy-y)*(ax-x))/area;return u>=-1e-5 && w>=-1e-5 && u+w<=1.00001;};
 let checked=0;const missing=[],points=new Map();for(const s of scene.streets)for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i],len=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/len,dy=(b.y-a.y)/len;for(let d=0;d<=len;d+=5)for(const across of [0,s.width/2-11,11-s.width/2]){const x=a.x+dx*d-dy*across,y=a.y+dy*d+dx*across;points.set(x.toFixed(3)+','+y.toFixed(3),{x,y,street:s.id});}}
 for(const {x,y,street} of points.values()){if(!bounds.roads.some(p=>onPolygon(p,x,y)))continue;checked++;if(!(bins.get(Math.floor(x/64)+','+Math.floor(y/64))??[]).some(t=>contains(t,x,y)))missing.push({x,y,street});}
 const anchors=new Map(),shallowForks=[];
 for(const street of scene.streets)for(const [i,p] of street.points.entries())for(const j of [i-1,i+1]){
  const q=street.points[j];if(!q)continue;const length=Math.hypot(q.x-p.x,q.y-p.y),arm={street:street.id,dx:(q.x-p.x)/length,dy:(q.y-p.y)/length},key=p.x+','+p.y,arms=anchors.get(key)??[];
  if(!arms.some(a=>a.dx*arm.dx+a.dy*arm.dy>.99999))arms.push(arm);anchors.set(key,arms);
 }
 for(const [at,arms] of anchors)for(let i=0;i<arms.length;i++)for(let j=i+1;j<arms.length;j++){
  const a=arms[i],b=arms[j],angle=Math.acos(Math.max(-1,Math.min(1,a.dx*b.dx+a.dy*b.dy)))*180/Math.PI;
  if(angle<30)shallowForks.push({at,streets:[a.street,b.street],degrees:angle});
 }
 const report={source:scene.sourceHash,revision:scene.revisionId,streets:scene.streets.length,triangles,checked,missing,shallowForks,limits:'Projected carriageway coverage only. This does not establish topmost paint, streamed seams, vehicle turn clearance or complete visual correctness.'};await fs.writeFile('docs/evidence/cycle-junctions/road-coverage.json',JSON.stringify(report,null,2));console.log({streets:report.streets,triangles,checked,missing:missing.length,examples:missing.slice(0,15)});
 root.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();}});
}finally{await v.close();}
