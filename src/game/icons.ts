import {bicyclePath} from './bicycle-symbol';
// Engine-owned UI shapes; world/model text never becomes markup.
const paths={
 walking:'M14 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM9 8l5 1 3 4m-8-5-3 5-4 1m10-5-2 7-4 6m4-6 6 2 2 4',
 swim:'M15 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM3 12l6-4 5 4 7-2M2 17q3-4 6 0t6 0 6 0M2 22q3-4 6 0t6 0 6 0',
 coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-3 0a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM12 8v8m-2-6h4m-4 4h4',
 minus:'M5 12h14',
 plus:'M5 12h14M12 5v14',
 strike:'M5 12V8a2 2 0 0 1 4 0v3M9 8V6a2 2 0 0 1 4 0v5M13 7a2 2 0 0 1 4 0v5M17 9a2 2 0 0 1 4 0v7l-4 5H9l-4-5v-4h6a2 2 0 0 1 0 4H8',
 pass:'M7 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 12h8m-3-3 3 3-3 3',
 food:'M4 3v5a2 2 0 0 0 4 0V3M6 3v18M18 21V3c-3 3-4 6-4 9h4',
 box:'m3 7 9-4 9 4v13l-9 3-9-3V7Zm0 0 9 4 9-4M12 11v12M8 5l8 4',
 repair:'m14 4 3 3 4-3c2 8-4 10-7 7L5 21l-3-3 10-9c-3-3-1-7 2-5Z',
 plant:'M12 22V11M12 15C3 14 3 8 3 6c7 0 9 3 9 9Zm0-4c0-7 5-9 9-9 1 6-2 10-9 9Z',
 bag:'M6 7h12l2 14H4L6 7Zm3 0V5a3 3 0 0 1 6 0v2',
 market:'m3 10 2-7h14l2 7M4 10v11h16V10M9 21v-7h6v7M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0',
 work:'M8 7V4h8v3M3 7h18v14H3V7Zm0 6 9 3 9-3M12 13v5',
 business:'M3 5h18v15H3V5Zm0 4h18M7 15h3M16 13v4m-2-2h4',
 talk:'M4 4h16v12H9l-5 4V4Zm4 5h8m-8 3h5',
 ride:'M3 14 5 8h14l2 6M3 14h18v5H3v-5Zm3 5v2m12-2v2M7 8l1-4h8l1 4M6 16h2m8 0h2',
 scooter:'M8 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm14 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 18h10l4-5-3-10h-5M16 3l3 15',
 skateboard:'M3 12c0 3 2 5 5 5h8c3 0 5-2 5-5M7 17v3m10-3v3M4 20h6m4 0h6',
 bicycle:bicyclePath,
 boat:'M3 13h18l-4 7H7l-4-7Zm9-10v10m0-10 7 7h-7M2 23l4-1 4 1 4-1 4 1 4-1',
 plane:'m12 2-2 8-8 5v2l8-2v4l-3 2v1l5-1 5 1v-1l-3-2v-4l8 2v-2l-8-5-2-8Z',
 seat:'M5 3v11h14V8M5 9h10v5M5 14v7m14-7v7',
 exit:'M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M15 7l5 5-5 5M9 12h11',
 view:'M3 8h18v12H3V8Zm5 0 2-4h4l2 4M16 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 keys:'M3 5h18v14H3V5Zm4 4h1m3 0h1m3 0h1m-9 4h1m3 0h1m3 0h1M7 16h10',
 play:'m8 5 11 7-11 7V5Z',
 sport:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-13-8c7 5 7 11 0 16M3 12h18m-5-8c-7 5-7 11 0 16',
 close:'m6 6 12 12M6 18 18 6',
} as const;
export type Icon=keyof typeof paths;
export function icon(name:Icon):string{return `<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}"/></svg>`;}
export function setIcon(element:HTMLElement,name:Icon):void{if(element.dataset.icon!==name){element.dataset.icon=name;element.innerHTML=icon(name);}}

export function controlIcon(control:string|undefined):Icon{return control==='bicycle' || control==='scooter' || control==='skateboard' || control==='boat' || control==='plane' ? control : 'ride';}
