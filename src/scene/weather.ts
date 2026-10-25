import {z} from 'zod';

export const weatherSchema=z.object({
 cycleSeconds:z.number().finite().min(120).max(3600),
 rainStartS:z.number().finite().min(10),rainEndS:z.number().finite().min(20),
 wetGrip:z.number().finite().min(.45).max(1),
}).strict().superRefine((w,ctx)=>{
 if(w.rainEndS-w.rainStartS<10 || w.rainEndS>w.cycleSeconds-30)ctx.addIssue({code:'custom',path:['rainEndS'],message:'rain needs at least 10 seconds and 30 dry seconds before the next cycle'});
});
export type Weather=z.infer<typeof weatherSchema>;
const smooth=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
/** Authored periodic weather uses saved simulation time, never a wall clock or renderer state. */
export function sampleWeather(config:Weather|undefined,timeS:number){
 if(!config)return {rain:0,wetness:0,grip:1,raining:false};
 const t=((timeS%config.cycleSeconds)+config.cycleSeconds)%config.cycleSeconds;
 const rain=smooth(config.rainStartS,config.rainStartS+5,t)*(1-smooth(config.rainEndS-5,config.rainEndS,t));
 const wetness=smooth(config.rainStartS,config.rainStartS+10,t)*(1-smooth(config.rainEndS,config.rainEndS+30,t));
 return {rain,wetness,grip:1-wetness*(1-config.wetGrip),raining:t>=config.rainStartS && t<config.rainEndS};
}
