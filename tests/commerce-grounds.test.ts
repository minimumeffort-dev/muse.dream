import {it,expect} from 'vitest';
import {compileDreamWorld,formatDream,DreamError} from '../src/scene/dream';
import {COMMERCE_LIMITS} from '../src/scene/commerce';
import {DREAM_V2_CONTRACT} from '../src/scene/dream-contract';
import {dreamAgentContext} from '../src/scene/dream-agent';

const groups={account:'accounts',station:'stations',delivery:'deliveries',repair:'repairs',meal:'meals',social:'socials',rest:'rests',shift:'shifts'} as const;
const commands=Object.keys(groups) as (keyof typeof groups)[];
const extras=Array.from({length:11},(_,i)=>`yard_${i}`);
// Parser/schema boundary only. Complete-world acceptance separately proves the named grounds and routes.
function source(command:keyof typeof groups,grounds:string[]|undefined):string{
 const groundFields=`on=home${grounds ? `,grounds=[${grounds}]` : ''}`;
 const account=`account ${command==='account' ? 'test' : 'worker'}(actor=neighbor,credits=20,capacity=8,satiety=80,drain_s=0${command==='account' ? `,commute=true,work=bake,${groundFields}` : ''});`;
 const declaration={
  account:'',
  station:`station test(object=table,at=[0,0],hands=[4,8,0],${groundFields});`,
  delivery:`delivery test(label="Bread",from=counter,to=receiver,good=bread,quantity=1,pay=1,capacity=1,${groundFields});`,
  repair:`repair test(label="Benches",market=counter,kind=bench,input=flour,take=1,seconds=1,pay=1,effort=1,${groundFields});`,
  meal:`meal test(good=bread,markets=[counter],eat_s=1,${groundFields});`,
  social:`social test(good=bread,seats=[bench],eat_s=1,${groundFields});`,
  rest:`rest test(energy=40,drain_s=0,recover_s=1,below=40,until=80,seats=[bench],${groundFields});`,
  shift:`shift test(market=counter,rest=[200,200],${groundFields});`,
 }[command];
 return `dream 2;economy(){
 good flour(label="Flour");good bread(label="Bread",food=20);
 account pocket(actor=player,credits=20,capacity=8,satiety=80,drain_s=0);
 ${account}
 market counter(label="Counter",actor=seller,credits=100,radius=40,hours=[6,22]){
  lot flour(good=flour,quantity=8,limit=20);lot bread(good=bread,quantity=4,limit=20,price=1);
 }
 market receiver(label="Receiver",actor=recipient,credits=100,radius=40){lot bread(good=bread,quantity=0,limit=20,price=1);}
 work bake(label="Bake",market=counter,input=flour,take=1,output=bread,make=2,seconds=1,pay=1,effort=1,capacity=1,target=10);
 ${declaration}
 }`;
}

it.each(commands)('accepts twelve total grounds for %s, without changing canonical data',command=>{
 const text=source(command,extras),world=compileDreamWorld(text),items=world.economy![groups[command]];
 expect(items?.find(item=>item.id==='test')?.grounds).toEqual(extras);
 expect(compileDreamWorld(formatDream(text))).toEqual(world);
 expect(()=>compileDreamWorld(source(command,undefined))).not.toThrow();
});

it.each(commands)('rejects excessive, empty, duplicate and primary grounds for %s at the located field',command=>{
 for(const grounds of [[...extras,'yard_11'],[],[...extras.slice(0,-1),extras[0]!],[...extras.slice(0,-1),'home']]){
  try{compileDreamWorld(source(command,grounds));throw Error('Expected bounded grounds rejection');}
  catch(error){expect(error).toBeInstanceOf(DreamError);const diagnostic=(error as DreamError).diagnostic;expect(diagnostic.code).toBe('E_ECONOMY');expect(diagnostic.path).toContain('/grounds');}
 }
});

it('exports the same common bound to model packets while retaining sample, graph and path budgets',()=>{
 expect(COMMERCE_LIMITS).toMatchObject({repairGrounds:12,repairNodes:4096,repairNetworkNodes:8192,repairNetworkLinks:32768,repairPath:128});
 expect(DREAM_V2_CONTRACT.commerce.grounds).toMatchObject({commands,total:12,extra:11});
 const packet=dreamAgentContext(['commerce']);expect(packet).toHaveProperty('contract.commerce.grounds',expect.objectContaining({commands,total:12,extra:11}));expect(packet).toHaveProperty('contract.commerce.limits.repairGrounds',12);
 expect(packet.instructions).toContain('on plus 0..11 unique extra grounds, 12 total');
});
