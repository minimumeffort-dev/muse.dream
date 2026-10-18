import {it,expect} from 'vitest';
import human from '../docs/examples/humanoid.dream?raw';
import {compileDream,formatDream,checkDream} from '../src/scene/dream';
import {buildObject} from '../src/game/world3d';
import {CharacterAnimator} from '../src/game/character-animation';
import {Vector3} from 'three';
const hat='mount headwear(bone=spine){part cap(shape=box,material=cream,at=[0,30,0],size=[10,2,10]);}';
const source=human.replace(/\n}\s*$/,'\n'+hat+'\n}');
it('mounts a reusable visual in the actual bone frame and carries it through animation and formatting',()=>{
 const [person]=compileDream(source),[original]=compileDream(human),part=person!.parts.at(-1)!,spine=person!.joints!.find(j=>j.bone==='spine')!;
 expect(person!.joints).toEqual(original!.joints);expect(part.parent).toBe(spine.id);expect(part.position).toEqual([0,30,0]);expect(compileDream(formatDream(source))).toEqual([person]);
 const object=buildObject({id:'person',labelText:'Person',kind:'custom',x:0,y:0,scale:1,spec:person!}),cap=object.getObjectByName(part.id)!;
 const animation=new CharacterAnimator(object,person!);for(let f=0;f<60;f++)animation.update({speed:95,swimming:false,grounded:true,verticalSpeed:0,time:f/60,enabled:true},1/60);
 object.updateMatrixWorld(true);const local=object.getObjectByName(spine.id)!.worldToLocal(cap.getWorldPosition(new Vector3()));expect(local.distanceTo(new Vector3(0,30,0))).toBeLessThan(1e-8);
});
it('rejects an early, missing or cross-object bone with a repairable reference diagnostic',()=>{
 for(const text of [human.replace('  joint pelvis',hat+'\n  joint pelvis'),source.replace('bone=spine){part cap','bone=left_elbow){part cap').replace('bone=left_elbow,','bone=right_elbow,')]){
  const result=checkDream(text);expect(result.ok).toBe(false);if(!result.ok){expect(result.diagnostics[0]!.code).toBe('E_REFERENCE');expect(result.diagnostics[0]!.path).toContain('headwear/bone');}
 }
 const another='object other(label="Other"){body(interaction=decor,radius=2,height=4);'+hat+'}';expect(checkDream(human+another).ok).toBe(false);
});
it('counts mounted accessories in the original object part limit and rejects nested mount contexts',()=>{
 expect(checkDream(human.replace(/\n}\s*$/,'\nmount details(bone=spine){repeat copies(index=i,count=32){part detail(shape=box,material=cream,at=[0,30,0],size=[1,1,1]);}}\n}')).ok).toBe(false);
 expect(checkDream(human.replace('  joint pelvis','  group nested{'+hat+'}\n  joint pelvis')).ok).toBe(false);
});
