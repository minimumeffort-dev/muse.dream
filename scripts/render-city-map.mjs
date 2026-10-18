import {createServer} from 'vite';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null},appType:'custom'});
try{
 const {compileDreamScene}=await server.ssrLoadModule('/src/scene/dream.ts');
 const {streetFootprints,streetCycleTracks}=await server.ssrLoadModule('/src/scene/streets.ts');
 const {unionPolygons}=await server.ssrLoadModule('/src/scene/polygons.ts');
 const {roadFootprint}=await server.ssrLoadModule('/src/scene/road.ts');
 const {sitePath}=await server.ssrLoadModule('/src/scene/sites.ts');
 const {assemblyBounds}=await server.ssrLoadModule('/src/scene/measure.ts');
 const {bridgePolygon}=await server.ssrLoadModule('/src/scene/landscape-dsl.ts');
 const modules=Object.fromEntries(readdirSync('src/scene/world').filter(f=>f.endsWith('.dream')).map(f=>[f.slice(0,-6),readFileSync('src/scene/world/'+f,'utf8')]));
 for(const [id,file] of [['dream_creations','dream-creations'],['interactive_world','interactive-world'],['impact_creations','impact-creations']])modules[id]=readFileSync('src/scene/'+file+'.dream','utf8');
 const scene=compileDreamScene(modules['open-world'],{sceneId:'map',revisionId:'map',sourceHash:'map'},modules);
 const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const points=p=>p.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
 const polygon=(p,color)=>`<polygon points="${points(p)}" fill="${color}"/>`;
 const ring=roadFootprint(scene),streets=streetFootprints(scene);
 const reserved=unionPolygons(streets.reserved,[...streets.roads,...ring]);
 const roads=[...ring,...unionPolygons(streets.roads)],riding=streetCycleTracks(scene);
 const destinations=scene.sites.filter(s=>['market','hospital','school','work','civic','station','airport','park'].includes(s.kind) && !s.id.includes('oldtown_'));
 const height=1300+Math.ceil(destinations.length/4)*20;
 const s=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 ${height}" role="img" aria-labelledby="title desc"><title id="title">River town, compiled Dream geometry</title><desc id="desc">Roads and intersections are unions of the actual world geometry. Building footprints, entrances, transit stops and bridges come from the same compiled Dream source as the game.</desc><rect width="1500" height="${height}" fill="#fafaf7"/><g font-family="system-ui,sans-serif" fill="#171717"><text x="50" y="52" font-size="30" font-weight="700">A city has to make sense.</text><text x="50" y="86" font-size="17" fill="#5e5e56">Compiled Dream geometry · 1.4 × 1.1 km · roads, entrances, platforms and bridges share the game source</text></g><g transform="translate(50 120) scale(.1)"><rect width="14000" height="11000" fill="#dce2d1"/>`];
 for(const h of scene.terrain.hills)s.push(`<ellipse cx="${h.x}" cy="${h.y}" rx="${h.radiusX}" ry="${h.radiusY}" fill="#becbb0"/>`);
 for(const w of scene.terrain.landscape.waters)s.push(polygon(w.polygon,'#9fc4d0'));
 for(const p of scene.surfaces.filter(s=>s.finish!=='terrain'))s.push(polygon(p.points,p.color));
 for(const b of scene.terrain.landscape.bridges)s.push(polygon(bridgePolygon(b),'#8c9490'));
 for(const p of reserved)s.push(polygon(p,'#f2eee0'));
 for(const p of riding)s.push(polygon(p,'#9caf8f'));
 for(const p of roads)s.push(polygon(p,'#737d7c'));
 // Entrance paths and real building footprints, rather than colored zoning rectangles.
 for(const site of scene.sites)s.push(`<polyline points="${points(sitePath(scene,site))}" fill="none" stroke="#b8aa89" stroke-width="${site.width}"/>`);
 for(const o of scene.objects){
  const spec=o.spec;if(spec?.dslVersion!==2)continue;
  if(spec.measure?.kind==='tree'){s.push(`<circle cx="${o.x}" cy="${o.y}" r="32" fill="#789266"/>`);continue;}
  if(spec.measure?.kind!=='building')continue;
  const b=assemblyBounds(spec),c=Math.cos(o.headingRad??0),sn=Math.sin(o.headingRad??0);
  const p=[[b.min.x,b.min.z],[b.max.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z]].map(([x,y])=>({x:o.x+(x*c-y*sn)*o.scale,y:o.y+(x*sn+y*c)*o.scale}));
  s.push(`<g><title>${esc(spec.displayName)} · ${esc(o.id)}</title>${polygon(p,'#827565')}</g>`);
 }
 for(const route of scene.routes.filter(r=>['rail','tram','street'].includes(r.kind))){
  const color=route.kind==='rail' ? '#333e45' : route.kind==='tram' ? '#af563c' : '#735b98';
  s.push(`<polyline points="${points(route.points)}" fill="none" stroke="${color}" stroke-width="${route.kind==='rail' ? 18:14}" ${route.kind==='street' ? 'stroke-dasharray="40 30"':''}/>`);
  for(const stop of route.stops??[]){const p=route.points[stop.anchor];s.push(`<circle cx="${p.x}" cy="${p.y}" r="22" fill="#fafaf7" stroke="${color}" stroke-width="10"/>`);}
 }
 for(let i=0;i<destinations.length;i++){
  const site=destinations[i],o=scene.objects.find(o=>o.id===site.objectId);
  s.push(`<circle cx="${o.x}" cy="${o.y}" r="85" fill="#f7c843"/><text x="${o.x}" y="${o.y+40}" font-family="system-ui,sans-serif" font-size="115" text-anchor="middle" fill="#171717">${i+1}</text>`);
 }
 s.push('</g><g font-family="system-ui,sans-serif" fill="#3d3d38" font-size="15">');
 s.push('<text x="50" y="1250">Charcoal: rail · Rust: tram · Violet: buses · Green: cycle tracks · Tan: entrance paths · Dots: route stops</text>');
 for(let i=0;i<destinations.length;i++){const site=destinations[i],o=scene.objects.find(o=>o.id===site.objectId);s.push(`<text x="${50+(i%4)*360}" y="${1280+Math.floor(i/4)*20}">${i+1}. ${esc(site.label??o.spec.displayName)}</text>`);}
 s.push('</g></svg>');writeFileSync('docs/media/city-plan.svg',s.join('\n'));console.log('Map rendered from compiled geometry:',scene.streets.length,'streets',scene.sites.length,'entrances');
}finally{await server.close();}
