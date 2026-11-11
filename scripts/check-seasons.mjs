import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildCampus} from '../src/campus-model.js';
import {createSeasons} from '../src/seasons.js';
const campus=buildCampus(),scene=new THREE.Scene();scene.background=new THREE.Color('#e7ecdf');scene.fog=new THREE.Fog('#e7ecdf',1000,2400);
const sun=new THREE.DirectionalLight(),hemisphere=new THREE.HemisphereLight();
scene.add(campus.root,sun,hemisphere);
function fingerprint(){const hash=createHash('sha256');campus.base.updateMatrixWorld(true);campus.base.traverse(o=>{hash.update(o.name+o.matrixWorld.elements.join(','));if(o.isMesh){hash.update(new Uint8Array(o.geometry.attributes.position.array.buffer));hash.update(JSON.stringify(o.material.toJSON()));}});hash.update(JSON.stringify(campus.colliders));return hash.digest('hex');}
const original=fingerprint();const seasons=createSeasons({campus,scene,sun,hemisphere});
for(const season of ['spring','summer','autumn','winter']){
 seasons.setSeason(season);for(let i=0;i<120;i++)seasons.update(1/60);
 assert.equal(fingerprint(),original,`${season} must not change the permanent core or colliders`);
 assert.equal(seasons.state.season,season);
}
assert.ok(campus.foliage.filter(m=>!m.userData.evergreen).every(m=>!m.visible),'winter deciduous crowns disappear');
assert.ok(campus.foliage.some(m=>m.userData.evergreen&&m.visible),'pine grove remains green');
assert.ok(seasons.state.snowVisible);seasons.setSnowAmount(0);for(let i=0;i<120;i++)seasons.update(1/60);assert.equal(seasons.state.snowVisible,false);assert.equal(seasons.state.particles,0);
seasons.setAnimated(false);const paused=seasons.state.time;seasons.update(1);assert.equal(seasons.state.time,paused);assert.equal(seasons.state.particles,0);
seasons.setSeason('summer');seasons.update(0);assert.ok(campus.foliage.every(m=>m.visible),'summer restores all crowns');
seasons.setBaseOnly(true);seasons.update(0);assert.equal(campus.seasonal.visible,false);assert.equal(fingerprint(),original);
seasons.setBaseOnly(false);assert.ok(campus.seasonal.visible);
for(const name of ['bupt-haidian','bupt-haidian-base']){
 const file=await readFile(`public/models/${name}.glb`);const model=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
 assert.ok(model.scene.getObjectByName('Permanent_core'));assert.ok(model.scene.getObjectByName('main'));
 if(name.endsWith('base'))assert.ok(!model.scene.getObjectByName('Seasonal_layer'),'base export contains no seasonal layer');
}
console.log('Season checks passed: permanent geometry/materials/colliders unchanged; winter/summer foliage, no-snow winter, reduced animation, base-only view and both GLB imports verified.');
