import {build} from 'esbuild';
import {mkdir,copyFile,rm,readFile,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});
const bundle=await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'esm',platform:'browser',target:['chrome110'],minify:true});
const assets={'/app.js':{body:bundle.outputFiles[0].text,type:'text/javascript; charset=utf-8'}};
for(const [name,type] of [['index.html','text/html'],['style.css','text/css']])assets['/'+name]={body:await readFile('src/'+name,'utf8'),type:type+'; charset=utf-8'};
// Generated assets contain public application code only, never environment files.
await writeFile('server/assets.generated.mjs','export default '+JSON.stringify(assets)+';');
try{await build({entryPoints:['server/worker.mjs'],bundle:true,outfile:'dist/server/index.js',format:'esm',platform:'browser',target:['es2022'],minify:true});}finally{await rm('server/assets.generated.mjs',{force:true});}
await mkdir('dist/.openai',{recursive:true});await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built authenticated Writing Room server into dist/server/');
