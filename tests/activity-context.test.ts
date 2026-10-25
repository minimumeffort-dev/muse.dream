import {it,expect} from 'vitest';
import {activityViews} from '../src/game/commerce';

it('offers work, bag and optional ownership at a service business without an empty stock view',()=>{
 expect(activityViews({foot:true,market:true,stock:false,work:true,task:false,business:false})).toEqual(['work','bag']);
 expect(activityViews({foot:true,market:true,stock:false,work:true,task:false,business:true})).toEqual(['work','bag','business']);
});

it('keeps irrelevant shops, work and business finances out of exploration and driving',()=>{
 expect(activityViews({foot:true,market:false,work:true,task:false,business:true})).toEqual(['bag']);
 expect(activityViews({foot:false,market:true,work:true,task:false,business:true})).toEqual(['bag']);
 expect(activityViews({foot:true,market:true,work:false,task:false,business:false})).toEqual(['market','bag']);
 expect(activityViews({foot:true,market:true,work:true,task:false,business:true})).toEqual(['market','work','bag','business']);
});

it('keeps an active task inspectable away from its counter or while carrying cargo in a vehicle',()=>{
 for(const foot of [true,false])expect(activityViews({foot,market:false,work:false,task:true,business:false})).toEqual(['work','bag']);
 expect(activityViews({foot:false,market:true,work:true,task:true,business:true})).toEqual(['work','bag']);
});

it('prioritizes the committed task over new shopping, work and cash transfers at a counter',()=>{
 expect(activityViews({foot:true,market:true,work:true,task:true,business:true})).toEqual(['work','bag']);
 expect(activityViews({foot:true,market:true,work:true,task:true,business:true,sharing:true})).toEqual(['bag']);
});

import {workDetailText} from '../src/game/commerce';
it('keeps complete work details on separate lines and a blocked reason in its single status',()=>{
 const recipe='Timber boards ×1 + Fasteners ×1 → Repair kit ×1';
 expect(workDetailText([recipe,'Staff · Assemble a repair kit · 6.0s left','The shelf is full','Staff · Assemble a repair kit · 6.0s left',false,undefined],'The shelf is full')).toBe(recipe+'\nStaff · Assemble a repair kit · 6.0s left');
 expect(workDetailText(['Walk beside the object. Keep the work area clear.','Closed · opens 06:00'])).toBe('Walk beside the object. Keep the work area clear.\nClosed · opens 06:00');
 expect(workDetailText([undefined,false,''])).toBe('');
});

it('offers work and the bag at an upstairs bench without exposing shop or business controls',()=>{
 expect(activityViews({foot:true,market:false,station:true,work:true,task:false,business:true})).toEqual(['work','bag']);
 expect(activityViews({foot:false,market:false,station:true,work:true,task:false,business:true})).toEqual(['bag']);
});
