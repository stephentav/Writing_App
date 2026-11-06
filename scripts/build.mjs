import {build} from 'esbuild';
import {mkdir,copyFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await build({entryPoints:['src/app.js'],bundle:true,outfile:'dist/app.js',format:'esm',platform:'browser',target:['chrome110'],minify:true});
for(const f of ['index.html','style.css'])await copyFile(`src/${f}`,`dist/${f}`);
console.log('Built Writing Room into dist/');
