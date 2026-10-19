import instructions from '../../docs/dream-v2-model.txt?raw';
import {DREAM_V2_CONTRACT as contract,DREAM_V2_COMMANDS} from './dream-contract';
import {fail} from './dream-syntax';

type Feature={commands:readonly string[];rules:readonly (keyof typeof contract)[];requires:readonly string[]};
const feature=(commands:string,rules:(keyof typeof contract)[],requires:string[]=[]):Feature=>({commands:commands.split(' '),rules,requires});
export const DREAM_AGENT_FEATURES={
  objects:feature('material let component object body measure ground foundation contact seat rideable emit group joint mount repeat use part beam spin roll sway swing stride open deform',['components','geometry','humanoid','proportions','seating']),
  world:feature('world road junction checkpoint hill tint bridge water watercourse route point place effect unresolved',['worldLimits','agents','transit'],['objects']),
  modules:feature('asset include',['modules'],['objects']),
  interactions:feature('rule impact fragment zone bounce break topple',['interactionRules','destruction'],['objects']),
  city:feature('street surface marking site crossing stop',['urbanGround','cityAccess','transit'],['world','npcs']),
  interiors:feature('interior portal',['interiors'],['city']),
  npcs:feature('behavior state on',['agents'],['world']),
  commerce:feature('economy good account market lot work ingredient delivery repair milestone meal shift social',['commerce'],['npcs','city','lighting']),
  population:feature('furnish flock walk roam',['population'],['city','modules','interactions']),
  lighting:feature('daylight lamp',['daylight'],['objects']),
  scenarios:feature('scenario item location link stock service agent objective',['scenarios']),
  voxels:feature('voxels fill cut voxel_world',['voxels'],['objects','interactions']),
  sports:feature('sport team',['sports'],['city','interactions']),
} as const satisfies Record<string,Feature>;
export type DreamAgentFeature=keyof typeof DREAM_AGENT_FEATURES;
const names=Object.keys(DREAM_AGENT_FEATURES) as DreamAgentFeature[];
const sections=new Map<string,string>();
for(const match of instructions.matchAll(/^## ([a-z]+)\n([\s\S]*?)(?=^## [a-z]+\n|$(?![\s\S]))/gm)){
  if(sections.has(match[1]!))throw new Error('Duplicate Dream instruction section: '+match[1]);
  sections.set(match[1]!,match[2]!.trim());
}
if(sections.size!==names.length+1 || ['core',...names].some(name=>!sections.has(name)))throw new Error('Dream instruction sections must match agent features');

/** Prompt context is a compiler-owned subset, never a relaxed acceptance boundary. */
export function dreamAgentContext(requested:readonly string[]=['objects']){
  if(!requested.length || requested.length>16)fail('choose 1..16 Dream context features',undefined,'E_CONTEXT',names);
  if(requested.some(name=>name!=='all' && !Object.hasOwn(DREAM_AGENT_FEATURES,name)))fail('unknown Dream context feature',undefined,'E_CONTEXT',['all',...names]);
  if(requested.includes('all') && requested.length!==1)fail('all must be selected alone',undefined,'E_CONTEXT',names);
  const selected=new Set<DreamAgentFeature>();
  const include=(name:DreamAgentFeature)=>{
    if(selected.has(name))return;selected.add(name);
    for(const dependency of DREAM_AGENT_FEATURES[name].requires)include(dependency as DreamAgentFeature);
  };
  for(const name of requested[0]==='all' ? names : requested)include(name as DreamAgentFeature);
  const features=names.filter(name=>selected.has(name));
  const commands=new Set(features.flatMap(name=>DREAM_AGENT_FEATURES[name].commands));
  const rules=new Set(features.flatMap(name=>DREAM_AGENT_FEATURES[name].rules));
  const {language,version,header,syntax,identifiers,coordinates,expressions,types,limits,projectLimits,output}=contract;
  return {
    features,availableFeatures:[...names],
    instructions:[sections.get('core')!, 'This packet is a scoped context, not the complete language. Use only its vocabulary. Request another feature when needed. The full compiler still enforces every source, expansion, geometry and scene bound.',...features.map(name=>`## ${name}\n${sections.get(name)!}`)].join('\n\n'),
    contract:{language,version,header,syntax,identifiers,coordinates,expressions,types,limits,projectLimits,output,
      commands:Object.fromEntries(Object.entries(DREAM_V2_COMMANDS).filter(([name])=>commands.has(name))),
      ...Object.fromEntries([...rules].map(key=>[key,contract[key]]))},
  };
}
