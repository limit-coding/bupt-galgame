import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(process.env.CAMPUS_TEST_URL||'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.campusPreview?.stats.triangles>0);await page.locator('#loading').waitFor({state:'hidden'});await page.waitForTimeout(1000);await page.screenshot({path:'artifacts/release-overview.png'});
const ids=['west-gate','motto','main','teaching4','teaching3','library','pine-grove','auditorium','sports'];
for(const [i,id]of ids.entries()){
 await page.locator('#map-button').click();await page.locator(`[data-place="${id}"]`).click();await page.waitForFunction(()=>window.campusPreview.stats.mode==='walk'&&!window.campusPreview.stats.paused);await page.locator('#interact').waitFor({state:'visible'});await page.waitForFunction(id=>window.campusPreview.stats.nearest===id,id);
 if(id==='west-gate'||id==='library'){await page.waitForTimeout(500);await page.screenshot({path:`artifacts/release-walk-${id}.png`});}
 await page.keyboard.press('KeyE');await page.locator('#place-story[open]').waitFor();assert.equal((await page.evaluate(()=>window.campusPreview.stats.visited)).length,i+1);
 await page.locator('#story-next').click();
}
await page.locator('#ending[open]').waitFor();await page.screenshot({path:'artifacts/release-ending.png'});
const postcardPromise=page.waitForEvent('download');await page.locator('#ending-photo').click();const postcard=await postcardPromise;assert.match(postcard.suggestedFilename(),/\.png$/);assert.equal(await postcard.failure(),null);
await page.locator('[data-close="ending"]').click();await page.locator('#pause-button').click();await page.locator('#pause-menu[open]').waitFor();await page.locator('#pause-overview').click();
await page.locator('#time-of-day').selectOption('night');await page.waitForTimeout(1800);await page.screenshot({path:'artifacts/release-night.png'});
await page.locator('#settings-button').click();await page.locator('#quality').selectOption('low');await page.locator('#sound-enabled').check();await page.locator('#sound-enabled').uncheck();await page.locator('[data-close="settings"]').click();
await page.reload();await page.waitForFunction(()=>window.campusPreview?.stats.triangles>0);assert.equal((await page.evaluate(()=>window.campusPreview.stats.visited)).length,9);assert.equal(await page.locator('#time-of-day').inputValue(),'night');
await page.locator('#time-of-day').selectOption('day');await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);await page.screenshot({path:'artifacts/release-mobile-overview.png'});
const mobileColors=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const c=document.createElement('canvas');c.width=64;c.height=64;const ctx=c.getContext('2d');ctx.drawImage(document.querySelector('#scene canvas'),0,0,64,64);const pixels=ctx.getImageData(0,0,64,64).data,colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add([pixels[i]>>4,pixels[i+1]>>4,pixels[i+2]>>4].join(','));resolve(colors.size);})));assert.ok(mobileColors>8,'mobile canvas must show the campus, not only fog');
await page.locator('#season-menu').click();await page.locator('#season-panel').waitFor({state:'visible'});await page.locator('[data-season=autumn]').click();await page.locator('#season-menu').click();await page.locator('#season-panel').waitFor({state:'hidden'});await page.locator('#start-journey').click();await page.waitForFunction(()=>window.campusPreview.stats.mode==='walk');const before=await page.evaluate(()=>window.campusPreview.stats.position);
const up=await page.locator('[data-move="KeyW"]').boundingBox();await page.mouse.move(up.x+up.width/2,up.y+up.height/2);await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();const after=await page.evaluate(()=>window.campusPreview.stats.position);assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.3,'touch direction pad moves player');
await page.screenshot({path:'artifacts/release-mobile-walk.png'});await page.locator('#pause-button').click();assert.ok(await page.locator('#pause-menu').isVisible());
assert.deepEqual(errors,[]);console.log('Full journey passed: 9 location interactions, ending, postcard download, save/reload, night mode, quality, sound toggle, desktop pause and mobile movement.');await browser.close();
