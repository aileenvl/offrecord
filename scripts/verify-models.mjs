import {chromium} from '@playwright/test';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
const output=resolve(process.env.OFFRECORD_TEST_OUTPUT??'test-results/model-verification');await mkdir(output,{recursive:true});
const extension=resolve('dist');
const context=await chromium.launchPersistentContext(resolve(output,'profile'),{channel:'chromium',headless:false,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],viewport:{width:480,height:1050}});
const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
const id=new URL(worker.url()).host;const page=await context.newPage();
const errors=[];context.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('BROWSER:',m.text().slice(0,350));}});
await page.goto(`chrome-extension://${id}/sidepanel.html`);
await page.locator('#setup').click();await page.locator('#prepare').click();
let prior='';const start=Date.now();
while(Date.now()-start<15*60*1000){
 const status=await page.locator('#activity').textContent();
 if(status!==prior){console.log(status);prior=status;}
 if(!(await page.locator('#prepare').isDisabled()))break;
 await new Promise(r=>setTimeout(r,2500));
}
console.log('READINESS:',await page.locator('#readiness').textContent());
await page.screenshot({path:resolve(output,'models.png'),fullPage:true});
if(!(await page.locator('#readiness').textContent()).includes('Gemma: ready')){await writeFile(resolve(output,'errors.json'),JSON.stringify(errors,null,2));await context.close();process.exitCode=1;}
else {
 await page.getByText('Bring your own transcript',{exact:true}).click();
 await page.locator('#import-text').fill('Maya: We decided to launch the Chrome extension on Friday.\nLuis: I will test audio capture by Thursday.\nMaya: Can the model work offline? We have not tested that yet.');
 await page.locator('#import').click();await page.locator('#analyze').click();
 await page.waitForFunction(()=>document.querySelector('#activity').textContent.includes('Notes updated'),null,{timeout:180000});
 const result=await page.evaluate(()=>chrome.runtime.sendMessage({target:'offscreen',type:'state'}));
 await writeFile(resolve(output,'notes.json'),JSON.stringify(result,null,2));await page.screenshot({path:resolve(output,'notes.png'),fullPage:true});console.log('REAL NOTES:',JSON.stringify(result.state.session.notes));
 await context.close();
}
