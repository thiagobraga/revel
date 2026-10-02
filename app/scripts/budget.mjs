import {readdir,stat} from 'node:fs/promises';
async function size(path){let total=0;for(const entry of await readdir(path,{withFileTypes:true})){const file=path+'/'+entry.name;total+=entry.isDirectory()?await size(file):entry.name.endsWith('.js')?(await stat(file)).size:0;}return total;}
const bytes=await size('.next/static');if(bytes>2500000)throw new Error('JavaScript output exceeds 2.5 MB budget: '+bytes);console.log('JS output bytes: '+bytes);
