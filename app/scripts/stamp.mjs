import {writeFileSync,rmSync} from 'node:fs';
writeFileSync('BUILD_ID',process.env.BUILD_ID??new Date().toISOString().replace(/[^0-9T]/g,'')+'-'+(process.env.BUILD_REVISION??'local'));
if(process.env.COVERAGE==='true')writeFileSync('.babelrc',JSON.stringify({presets:['next/babel'],plugins:[['istanbul',{coverageGlobalScope:'globalThis',coverageGlobalScopeFunc:false,include:['src/**/*.ts','src/**/*.tsx'],exclude:['**/*.test.*']}]]}));else rmSync('.babelrc',{force:true});
