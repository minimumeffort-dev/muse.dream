import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {labMedia} from './media';
const root=fileURLToPath(new URL('./',import.meta.url));
export default defineConfig({
  root,publicDir:false,cacheDir:'.cache/vite',plugins:[labMedia()],
  server:{host:'127.0.0.1',port:5180,strictPort:true,fs:{allow:[root]}},
  build:{outDir:'dist',emptyOutDir:true},
  preview:{host:'127.0.0.1',port:4180,strictPort:true},
});
