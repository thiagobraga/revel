import fs from 'node:fs';
import coverage from 'istanbul-lib-coverage';
const {createCoverageMap}=coverage;
import report from 'istanbul-lib-report';
const {createContext}=report;
import reports from 'istanbul-reports';
const map=createCoverageMap({});for(const file of fs.readdirSync('coverage-reports/e2e'))if(file.endsWith('.json'))map.merge(JSON.parse(fs.readFileSync('coverage-reports/e2e/'+file,'utf8')));
const unit='coverage-reports/unit/coverage-final.json';if(fs.existsSync(unit))map.merge(JSON.parse(fs.readFileSync(unit,'utf8')));fs.mkdirSync('coverage-reports/merged',{recursive:true});fs.writeFileSync('coverage-reports/merged/coverage-final.json',JSON.stringify(map));
const context=createContext({dir:'coverage-reports/merged',coverageMap:map});reports.create('html').execute(context);reports.create('text').execute(context);
