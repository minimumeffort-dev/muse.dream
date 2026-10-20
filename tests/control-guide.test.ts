import {it,expect} from 'vitest';
import {controlSections,guideSection,type GuideContext} from '../src/game/control-guide';
const actions=(context:GuideContext)=>controlSections(context).find(s=>s.id===guideSection(context))!.rows;
it('opens on the current movement context, including seated people, swimming and matches',()=>{
 for(const context of ['foot','swim','seated'] as const)expect(guideSection(context)).toBe('explore');
 for(const context of ['car','bicycle','scooter','skateboard','boat','plane','passenger'] as const)expect(guideSection(context)).toBe('vehicles');
 expect(guideSection('sport')).toBe('sports');
 expect(actions('seated').find(r=>r.keys.includes('F'))!.action).toBe('Stand up');expect(actions('swim').find(r=>r.keys.includes('Shift'))!.action).toBe('Swim faster');expect(actions('swim').find(r=>r.keys.includes('Space'))!.action).toBe('Swim faster');expect(actions('swim').some(r=>r.action==='Jump')).toBe(false);
});
it('teaches only the actual controls for the occupied vehicle',()=>{
 expect(actions('car').find(r=>r.keys.includes('Shift'))!.action).toBe('Boost');
 for(const context of ['bicycle','skateboard','scooter'] as const){expect(actions(context).find(r=>r.keys.includes('Space'))!.action).toBe('Jump');expect(actions(context).some(r=>r.keys.includes('Shift'))).toBe(false);}
 expect(actions('boat').find(r=>r.keys.includes('Space'))!.action).toBe('Hop');expect(actions('boat').some(r=>r.keys.includes('Shift'))).toBe(false);
 expect(actions('plane').find(r=>r.keys.includes('Space'))!.action).toBe('Climb');expect(actions('plane').find(r=>r.keys.includes('Shift'))!.action).toBe('Descend');expect(actions('plane').find(r=>r.keys.includes('F'))!.action).toBe('Exit after landing');
 expect(actions('passenger')).toEqual([{keys:['F'],action:'Leave transport'}]);
});
it('keeps discoverable controls for camera, bags, transactions and keyboard selection in every context',()=>{
 for(const context of ['foot','swim','seated','car','bicycle','boat','plane','sport','passenger'] as const){
  const groups=controlSections(context);expect(new Set(groups.map(s=>s.id)).size).toBe(5);const keys=groups.flatMap(g=>g.rows.flatMap(r=>r.keys));
  for(const key of ['M','I','Enter','1–4','B','V','H','G','C','+','−','0','Q','E','R','P','Esc','Tab'])expect(keys,context).toContain(key);
 }
});
