import {test as base,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
export const test=base.extend({page:async({page},use)=>{await use(page);if(process.env.PLAYWRIGHT_COVERAGE){const coverage=await page.evaluate(()=>Reflect.get(window,'__coverage__'));if(coverage){await mkdir('coverage-reports/e2e',{recursive:true});await writeFile('coverage-reports/e2e/'+crypto.randomUUID()+'.json',JSON.stringify(coverage));}}}});
export {expect};
