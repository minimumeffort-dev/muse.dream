import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const body=await readFile(path.join(root,'workspace.html'),'utf8');
let css=(await readFile(path.join(root,'preview.css'),'utf8')).replaceAll('\n','');
for(const [token,file] of [['MANROPE_FONT','manrope-latin.woff2'],['ARCHIVO_FONT','archivo-latin.woff2']]){
 const font=await readFile(path.join(root,'fonts',file));css=css.replace(token,'data:font/woff2;base64,'+font.toString('base64'));
}
const html='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Morning delivery · Dreams Lab</title><style>'+css+'</style></head>\n<body class="preview workspace-page"><a class="skip-link" href="#workspace">Skip to experiment</a><header class="topbar"><a class="brand" href="#workspace"><b class="mark">me.</b>Dreams Lab</a><span class="pill" aria-label="Agents use scripted test policies"><i class="dot yellow"></i>Scripted agents</span></header>'+body+'<script type="module" src="/src/main.ts"></script></body></html>\n';
await writeFile(path.join(root,'index.html'),html);
console.log('Rendered Dreams Lab workspace.');
