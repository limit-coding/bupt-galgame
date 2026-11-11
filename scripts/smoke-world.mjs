import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.setDefaultTimeout(60000);
try {
await page.goto(process.env.CAMPUS_URL||'http://127.0.0.1:5174');await page.waitForFunction(()=>window.campusPreview?.stats.triangles>0);await page.waitForTimeout(1500);
console.log('overview',await page.evaluate(()=>window.campusPreview.stats));await page.screenshot({path:'artifacts/world-overview.png'});
await page.locator('#settings-button').click();await page.locator('#quality').selectOption('low');await page.locator('[data-close="settings"]').click();
await page.locator('#walk').click();await page.waitForTimeout(700);await page.screenshot({path:'artifacts/world-third-person.png'});
const before=await page.evaluate(()=>window.campusPreview.stats.position);
await page.keyboard.down('KeyW');await page.waitForFunction(p=>Math.hypot(window.campusPreview.stats.position.x-p.x,window.campusPreview.stats.position.z-p.z)>.6,before);await page.keyboard.up('KeyW');
const after=await page.evaluate(()=>window.campusPreview.stats.position);assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.5,'character moves');
await page.keyboard.press('Space');await page.waitForFunction(()=>window.campusPreview.stats.position.y>1.75);assert.ok((await page.evaluate(()=>window.campusPreview.stats.position.y))>1.75,'jump lifts player');await page.waitForFunction(()=>window.campusPreview.stats.position.y===1.75);assert.equal(await page.evaluate(()=>window.campusPreview.stats.position.y),1.75);
await page.keyboard.press('KeyV');assert.equal(await page.evaluate(()=>window.campusPreview.stats.thirdPerson),false);await page.screenshot({path:'artifacts/world-first-person.png'});
await page.keyboard.press('KeyF');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.campusPreview.stats.mode),'fly');
let height=await page.evaluate(()=>window.campusPreview.stats.position.y);await page.keyboard.down('Space');await page.waitForFunction(y=>window.campusPreview.stats.position.y>y+2,height);await page.keyboard.up('Space');assert.ok((await page.evaluate(()=>window.campusPreview.stats.position.y))>height+2,'flight climbs');
await page.locator('#return-overview').click();await page.locator('#fly').click();await page.waitForTimeout(700);await page.screenshot({path:'artifacts/world-flight.png'});
// From the canonical flight camera, find a visible clear patch without internal mutations.
await page.locator('#build-tool').selectOption('block');const initial=await page.evaluate(()=>window.campusPreview.stats.creativeCount);
for(const [x,y] of [[800,620],[900,650],[700,690],[1000,730],[650,730]]){await page.mouse.move(x,y);await page.waitForTimeout(100);await page.mouse.click(x,y);if((await page.evaluate(()=>window.campusPreview.stats.creativeCount))>initial)break;}
assert.equal(await page.evaluate(()=>window.campusPreview.stats.creativeCount),initial+1,'places personal prop');
await page.screenshot({path:'artifacts/world-creative.png'});await page.reload();await page.waitForFunction(()=>window.campusPreview?.stats.triangles>0);assert.equal(await page.evaluate(()=>window.campusPreview.stats.creativeCount),initial+1,'prop survives reload');
await page.locator('#fly').click();await page.locator('#land').click();assert.equal(await page.evaluate(()=>window.campusPreview.stats.mode),'walk');
await page.keyboard.press('Escape');await page.waitForTimeout(200);if(await page.locator('#pause-menu').isVisible())await page.locator('#pause-overview').click();
await page.setViewportSize({width:390,height:844});await page.locator('#fly').click();await page.screenshot({path:'artifacts/world-mobile-flight.png'});
assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: third/first person, movement, jump, flight, safe landing, creative placement and persistence; no JS/WebGL errors.');} finally {await browser.close();}
