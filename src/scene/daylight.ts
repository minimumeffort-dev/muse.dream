import {z} from 'zod';

export const daylightSchema=z.object({cycleSeconds:z.number().finite().min(120).max(3600),startHour:z.number().finite().min(0).lt(24)}).strict();
export type Daylight=z.infer<typeof daylightSchema>;
export const MAX_LIGHT_POOLS=512;
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

/** A stylized, periodic sky. Sun/moon exchange direction only while their direct light is dark. */
export function sampleDaylight(config:Daylight,elapsed:number){
  const hour=((config.startHour+elapsed/config.cycleSeconds*24)%24+24)%24;
  const angle=(hour-6)/12*Math.PI,altitude=Math.sin(angle),day=smooth(-.12,.24,altitude),night=1-smooth(-.2,.12,altitude);
  const moon=altitude<0,arc=moon ? angle+Math.PI : angle;
  const x=-.75*Math.cos(arc),y=Math.max(.32,.9*Math.sin(arc)),z=.28,length=Math.hypot(x,y,z);
  return {hour,day,night,warm:day*(1-smooth(.18,.65,altitude)),moon,
    intensity:(moon ? .32 : 2.4)*smooth(.01,.25,Math.abs(altitude)),
    direction:{x:x/length,y:y/length,z:z/length}};
}
