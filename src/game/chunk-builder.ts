import * as THREE from 'three';
import type {Scene} from '../scene/schema';
import {buildEnvironmentSteps} from './environment';
import {finishBuild,tiledMesh} from './batching';
import {waterGeometry} from './landscape';
import {WorldScenery} from './scenery';
import {contains,overlaps,type RenderRegion,WORLD_CHUNK_SIZE} from './render-region';
import {pooledImpact} from '../scene/damage-pool';

/** Restored offscreen fragments use the same accepted scenery builder and worker. */
export function buildToppleChunk(doc:Scene,objectId:string):THREE.Group{
 const object=doc.objects.find(o=>o.id===objectId);
 if(!object || !pooledImpact(doc,object) || !object.spec || !('impact' in object.spec) || object.spec.impact?.kind!=='topple')throw Error('invalid topple prototype');
 return new WorldScenery(doc,[object]).group;
}

export function validChunkRegion(doc:Scene,region:RenderRegion):boolean{
  return [region.x0,region.y0,region.x1,region.y1].every(Number.isFinite) && region.x1-region.x0===WORLD_CHUNK_SIZE && region.y1-region.y0===WORLD_CHUNK_SIZE && region.x0%WORLD_CHUNK_SIZE===0 && region.y0%WORLD_CHUNK_SIZE===0 && region.x0>=-800 && region.y0>=-800 && region.x0<doc.canonical.width+800 && region.y0<doc.canonical.height+800;
}
export function buildWorldChunk(doc:Scene,region:RenderRegion):THREE.Group{
  if(!validChunkRegion(doc,region))throw Error('invalid render chunk');
  const group=finishBuild(buildEnvironmentSteps(doc,region));
  for(const water of doc.terrain.landscape?.waters??[]){
    if(!overlaps(region,water.polygon))continue;
    const material=new THREE.MeshBasicMaterial();material.userData.streamMaterial={kind:'water',id:water.id};
    const mesh=tiledMesh(waterGeometry(doc,water,region),material);mesh.name=`water-${water.id}`;mesh.traverse(n=>n.renderOrder=2);group.add(mesh);
  }
  const scenery=new WorldScenery(doc,doc.objects.filter(o=>contains(region,o.x,o.y)));group.add(scenery.group);group.userData.occlusion=scenery.group.userData.occlusion;
  return group;
}
