import assert from 'node:assert/strict';
import {buildCampus,canWalk} from '../src/campus-model.js';
import {createNavigation,moveWithCollisions} from '../src/navigation.js';
import {places,WEST_GATE} from '../src/places.js';
import {createSave,sanitizeSave} from '../src/save.js';
const campus=buildCampus(),navigation=createNavigation(campus.colliders);
let previous=WEST_GATE,total=0;
for(const place of places){
 const path=navigation.findPath(previous,place);assert.ok(path.length>=2,`${place.name} must be reachable`);
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i];assert.ok(navigation.segmentClear(a,b),`route to ${place.name} crosses an obstacle`);
  const moved=moveWithCollisions(a,b.x-a.x,b.z-a.z,campus.colliders);assert.ok(Math.hypot(moved.x-b.x,moved.z-b.z)<.05,`walking route to ${place.name} gets stuck`);total+=Math.hypot(b.x-a.x,b.z-a.z);
 }previous=place;
}
const wall=[{minX:0,maxX:.1,minZ:-5,maxZ:5}];const stopped=moveWithCollisions({x:-3,z:0},8,0,wall);assert.ok(stopped.x<-.6,'large frame must not tunnel through a thin wall');
assert.ok(!canWalk(stopped.x+1,0,wall));assert.deepEqual(navigation.findPath({x:10000,z:0},WEST_GATE),[]);
const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};let save=createSave(storage);save.visit('main');save.visit('main');save.visit('bad');assert.deepEqual(save.data.visited,['main']);save.patch({season:'winter',volume:.8});save=createSave(storage);assert.equal(save.data.season,'winter');assert.deepEqual(save.data.visited,['main']);
for(const place of places)save.visit(place.id);assert.ok(save.data.completed);save.resetJourney();assert.equal(save.data.visited.length,0);assert.equal(save.data.season,'winter');
assert.equal(sanitizeSave({version:1,volume:Infinity,visited:['main','__proto__'],season:'bad'}).volume,.35);
assert.deepEqual(sanitizeSave({version:500,visited:['main']}).visited,[]);
assert.equal(createSave(null).available,false);const denied=createSave({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});denied.visit('main');assert.equal(denied.available,false);assert.deepEqual(denied.data.visited,['main']);
console.log(`Exploration checks passed: all 9 stops reachable, ${Math.round(total)} m of collision-safe routes, no wall tunneling, persistent/invalid/unavailable saves handled.`);
