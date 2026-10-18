import {it,expect} from 'vitest';
import {compileDreamWorld,compileDreamScene,checkDream,formatDream} from '../src/scene/dream';
import {objectDslSchema} from '../src/scene/object-dsl';
import {measuredScale} from '../src/scene/measure';
const identity={sceneId:'clearance',revisionId:'r1',sourceHash:'test'};
const person=(width:number,clearance=',clearance=14',radius=13)=>`dream 2;material blue(style=toon,colors=[#537eaa,#3c5f87]);object resident(label="Resident"){measure(kind=person,axis=y,meters=1.8);body(interaction=decor,radius=${radius},height=57${clearance});part body(shape=box,material=blue,at=[0,28.6,0],size=[${width},57.2,14]);}`;
const neighborhood=(width:number,clearance=',clearance=14',radius=13)=>person(width,clearance,radius)+`world(size=[1600,1200],spawn=[800,600],heading_deg=0);street main(width=100,sidewalk=24,points=[[200,600],[1400,600]]);furnish residents(objects=[resident],streets=[main],spacing=160,setback=0,seed=33,on=sidewalk,facing=varied,jitter=.2);`;
it('round-trips bounded v2 layout clearance without changing the measured physical cylinder',()=>{
 const source=person(12),a=compileDreamWorld(source).assemblies[0]!,b=compileDreamWorld(formatDream(source)).assemblies[0]!;
 expect(a).toEqual(b);expect(a.body.clearanceRadius).toBe(14);const ordinary=compileDreamWorld(person(12,'')).assemblies[0]!;
 expect(a.body.colliderRadius*measuredScale(a)).toBe(ordinary.body.colliderRadius*measuredScale(ordinary));expect(a.body.colliderHeight!*measuredScale(a)).toBe(ordinary.body.colliderHeight!*measuredScale(ordinary));
 const {measure,...legacy}=a,{clearanceRadius,...legacyBody}=legacy.body;
 expect(objectDslSchema.safeParse({...legacy,dslVersion:1,body:legacyBody}).success).toBe(true);
 expect(objectDslSchema.safeParse({...legacy,dslVersion:1}).success).toBe(false);
 for(const n of [3,12.9,129]){const result=checkDream(person(12,`,clearance=${n}`));expect(result.ok).toBe(false);if(!result.ok)expect(result.diagnostics[0]!.message).toMatch(/clearance/i);}
});
it('keeps furnishing identities, positions and headings stable when clothing shrinks inside its reserved space',()=>{
 const wide=compileDreamScene(neighborhood(12),identity),narrow=compileDreamScene(neighborhood(6),identity),poses=(s:typeof wide)=>s.objects.map(({id,x,y,headingRad,labelText,scale})=>({id,x,y,headingRad,labelText,scale}));
 expect(wide.objects).toHaveLength(14);expect(poses(narrow)).toEqual(poses(wide));
 expect(poses(compileDreamScene(neighborhood(6,''),identity))).not.toEqual(poses(compileDreamScene(neighborhood(12,''),identity)));
});
it('never uses a smaller reservation to fit oversized geometry on a narrow sidewalk',()=>{
 expect(compileDreamScene(neighborhood(60,',clearance=4',4),identity).objects).toEqual([]);
});
