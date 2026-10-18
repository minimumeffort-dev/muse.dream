// Engine-owned UI shapes; world/model text never becomes markup.
const paths={
 walking:'M14 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM9 8l5 1 3 4m-8-5-3 5-4 1m10-5-2 7-4 6m4-6 6 2 2 4',
 swim:'M15 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM3 12l6-4 5 4 7-2M2 17q3-4 6 0t6 0 6 0M2 22q3-4 6 0t6 0 6 0',
 coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-3 0a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM12 8v8m-2-6h4m-4 4h4',
 minus:'M5 12h14',
 plus:'M5 12h14M12 5v14',
 food:'M15 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM2 3v5m3-5v5M2 8h3m-1 0v13M20 3c-4 4-4 8 0 9V3Zm0 9v9',
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
 bicycle:'M10 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm12 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM6 17l5-10 7 10H6l-2-7m5-3h5m2-4h3l-1 14',
 boat:'M3 13h18l-4 7H7l-4-7Zm9-10v10m0-10 7 7h-7M2 23l4-1 4 1 4-1 4 1 4-1',
 plane:'m12 2-2 8-8 5v2l8-2v4l-3 2v1l5-1 5 1v-1l-3-2v-4l8 2v-2l-8-5-2-8Z',
 seat:'M5 3v11h14V8M5 9h10v5M5 14v7m14-7v7',
 exit:'M10 3H4v18h6m3-14 5 5-5 5m-5-5h13',
 sport:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-13-8c7 5 7 11 0 16M3 12h18m-5-8c-7 5-7 11 0 16',
 close:'m6 6 12 12M6 18 18 6',
} as const;
export type Icon=keyof typeof paths;
export function icon(name:Icon):string{return `<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}"/></svg>`;}
export function setIcon(element:HTMLElement,name:Icon):void{if(element.dataset.icon!==name){element.dataset.icon=name;element.innerHTML=icon(name);}}

export function controlIcon(control:string|undefined):Icon{return control==='bicycle' || control==='scooter' || control==='skateboard' || control==='boat' || control==='plane' ? control : 'ride';}
