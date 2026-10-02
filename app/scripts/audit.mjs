import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
mkdirSync('dist/lighthouse',{recursive:true});
const result=spawnSync(process.execPath,['node_modules/lighthouse/cli/index.js','http://localhost:3000','--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage','--only-categories=performance,accessibility,best-practices,seo','--output=json','--output=html','--output-path=dist/lighthouse/report'],{stdio:'inherit'});if(result.status)process.exit(result.status);
const report=JSON.parse(readFileSync('dist/lighthouse/report.report.json','utf8'));for(const name of ['accessibility','best-practices','seo'])if(report.categories[name].score<0.9)throw new Error(name+' score below 90');
