import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith('http://127.0.0.1:4173/'))return route.continue();external.push(url);return route.abort();});
await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.campusPreview?.stats.triangles>0);await page.locator('#loading').waitFor({state:'hidden'});
await page.locator('[data-season="winter"]').click();await page.locator('#time-of-day').selectOption('sunset');await page.waitForTimeout(1200);
await page.locator('#map-button').click();await page.locator('[data-place="library"]').click();await page.locator('#interact').waitFor({state:'visible'});await page.keyboard.press('KeyE');await page.locator('#place-story[open]').waitFor();
assert.equal((await page.evaluate(()=>window.campusPreview.stats.visited))[0],'library');await page.locator('[data-close="place-story"]').click();
await page.reload();await page.waitForFunction(()=>window.campusPreview?.stats.triangles>0);assert.equal((await page.evaluate(()=>window.campusPreview.stats.visited))[0],'library');assert.equal(await page.locator('#time-of-day').inputValue(),'sunset');
for(const name of ['bupt-haidian.glb','bupt-haidian-base.glb','colliders.json']){const response=await page.request.get(`http://127.0.0.1:4173/models/${name}`);assert.equal(response.status(),200);if(name.endsWith('glb'))assert.equal((await response.body()).toString('utf8',0,4),'glTF');}
assert.deepEqual(external,[]);assert.deepEqual(errors,[]);console.log('Packaged production build passed with all external requests blocked: scene, seasons, sunset, interaction, save/reload and both model downloads. No external resources or runtime errors.');await browser.close();
