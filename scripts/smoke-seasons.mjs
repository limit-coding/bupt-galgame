import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} ${m.location().url}`);});
await page.goto(process.env.CAMPUS_TEST_URL||'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.campusPreview?.stats.triangles>0);await mkdir('artifacts',{recursive:true});
const original=await page.evaluate(()=>window.campusPreview.stats.colliders);
for(const season of ['spring','summer','autumn','winter']){
 await page.locator(`[data-season="${season}"]`).click();
 await page.waitForFunction(s=>window.campusPreview.stats.seasons.season===s,season);await page.waitForTimeout(1500);
 assert.equal(await page.locator(`[data-season="${season}"]`).getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>window.campusPreview.stats.colliders),original);
 await page.screenshot({path:`artifacts/campus-${season}.png`});
}
await page.locator('#snow-amount').fill('0');await page.waitForFunction(()=>window.campusPreview.stats.seasons.snowVisible===false);
await page.locator('#animate-season').uncheck();const state=await page.evaluate(()=>window.campusPreview.stats.seasons);await page.waitForTimeout(300);assert.equal((await page.evaluate(()=>window.campusPreview.stats.seasons)).time,state.time);
await page.locator('#base-only').check();assert.ok(await page.locator('[data-season="spring"]').isDisabled());await page.screenshot({path:'artifacts/campus-base.png'});
const downloadPromise=page.waitForEvent('download');await page.locator('.base-download').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'bupt-haidian-base.glb');assert.equal(await download.failure(),null);
await page.locator('#base-only').uncheck();await page.locator('[data-season="autumn"]').click();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1200);await page.screenshot({path:'artifacts/seasons-mobile.png'});
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>window.campusPreview?.stats.triangles>0);assert.equal((await page.evaluate(()=>window.campusPreview.stats.seasons)).animated,false);
assert.deepEqual(errors,[]);console.log('Browser checks passed: four seasons, zero snow, animation pause, base-only controls, model download, mobile layout, reduced motion; no browser or shader errors.');await browser.close();
