import {it,expect} from 'vitest';
import {InstancedMesh,OrthographicCamera,DirectionalLight} from 'three';
import source from '../docs/examples/team-sports.dream?raw';
import {compileDreamScene} from '../src/scene/dream';
import {SportsTeamsVisuals} from '../src/game/sports';
import {createCarAtSpawn} from '../src/sim/car';
import {matchStride,matchRoster} from '../src/scene/sports-match';

it('renders one shared eleven-person squad with bone/finish channels and releases its owned buffers',()=>{
 const scene=compileDreamScene(source.replace('home_kit(style=toon','home_kit(style=wood').replaceAll('team_size=6','roster=park_players,team_size=6'),{sceneId:'team-render',revisionId:'r1',sourceHash:'test'}),state=createCarAtSpawn(scene),teams=new SportsTeamsVisuals(scene),camera=new OrthographicCamera(-4000,4000,4000,-4000,.1,10000),sun=new DirectionalLight();
 camera.position.set(0,2000,2000);camera.lookAt(0,0,0);camera.updateMatrixWorld();sun.shadow.camera.updateMatrixWorld();teams.update(state,camera,sun);
 const poses=new Set<string>();let disposed=0,finished=0;
 for(const mesh of teams.group.children as InstancedMesh[]){
  expect(mesh.geometry.getAttribute('popBone').count).toBe(mesh.geometry.getAttribute('position').count);const finish=mesh.geometry.getAttribute('surfacePosition');if(finish){finished++;expect(finish.count).toBe(mesh.geometry.getAttribute('position').count);}
  expect(mesh.geometry.getAttribute('popPlay')).toMatchObject({meshPerAttribute:1});expect(mesh.customDepthMaterial).toBeDefined();
  for(let i=0;i<mesh.count;i++)poses.add(Array.from(mesh.instanceMatrix.array.slice(i*16+12,i*16+15)).join(','));
  mesh.geometry.addEventListener('dispose',()=>disposed++);
 }
 expect(poses.size).toBe(11);expect(finished).toBeGreaterThan(0);state.sports[0]!.match!.status='resting';state.sports[0]!.match!.members[0]!.action='kick';state.sports[0]!.match!.members[0]!.actionUntilS=.4;teams.update(state,camera,sun);for(const mesh of teams.group.children as InstancedMesh[])for(let i=0;i<mesh.count;i++)expect(mesh.geometry.getAttribute('popPlay').getX(i)).toBe(0);const meshes=teams.group.children.length;teams.dispose();expect(disposed).toBe(meshes);expect(teams.group.children).toHaveLength(0);
});

it('uses longer distance-driven running strides without changing resting dimensions',()=>{
 const scene=compileDreamScene(source,{sceneId:'strides',revisionId:'r1',sourceHash:'test'}),spec=matchRoster(scene.sports[0]!.id,scene.sports[0]!.match!)[1]!.spec;
 expect(matchStride(spec,58)).toBeGreaterThan(matchStride(spec,14)*2);expect(matchStride(spec,14)).toBe(matchStride(spec,0));expect(spec.measure!.meters).toBe(1.72);
});
