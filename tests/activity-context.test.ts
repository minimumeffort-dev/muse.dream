import {it,expect} from 'vitest';
import {activityViews} from '../src/game/commerce';

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
