import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {addLandscape} from './campus-landscape.js';
import { detailBuilding, makeCrownGeometry } from './architecture.js';
import { addCampusLife } from './campus-life.js';
import { buildings, lawns, residentialZones, roads, toWorld } from './campus-data.js';
const palette={ground:0xd8ddd1,road:0xb1b7b4,curb:0xe7e7dd,grass:0x91ad75,white:0xeeeae0,roof:0xb86e53,wall:0xd8c4a9,glass:0x608c9c,dorm:0xe0c6ac,blue:0x3f788d,red:0xa65743,dark:0x657576,water:0x65b1c5,track:0xb97561,field:0x73996d,wood:0x867b61,tree:0x69875a,tree2:0x819b60,unknown:0xc2c6bd};
const mats=Object.fromEntries(Object.entries(palette).map(([k,color])=>{const material=new THREE.MeshStandardMaterial({color,roughness:k==='glass'?0.35:0.9,metalness:k==='glass'?0.16:0});material.name=k;return [k,material];}));
function box(g,x,y,z,w,h,d,mat='white') {const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mats[mat]);m.position.set(x,y,z);m.castShadow=h>1;m.receiveShadow=true;g.add(m);return m;}
function cylinder(g,x,y,z,r,h,mat,segments=24){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mats[mat]);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function optimize(g){g.updateMatrixWorld(true);const buckets=new Map();for(const m of [...g.children]){if(!m.isMesh)continue;m.updateMatrix();const geometry=m.geometry.clone().applyMatrix4(m.matrix);if(!buckets.has(m.material))buckets.set(m.material,[]);buckets.get(m.material).push(geometry);g.remove(m);m.geometry.dispose();}for(const [mat,geoms]of buckets){const m=new THREE.Mesh(mergeGeometries(geoms,false),mat);m.castShadow=true;m.receiveShadow=true;g.add(m);geoms.forEach(x=>x.dispose());}}
function pitchedRoof(g,x,z,w,d,y){const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(0,Math.min(4,w*.2));shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});const m=new THREE.Mesh(geo,mats.roof);m.position.set(x,y,z-d/2);g.add(m);}
export function buildCampus(){
 const root=new THREE.Group();root.name='BUPT_Xitucheng_Explorable_World';root.userData={version:'2.0',units:'approximate meters',axes:'+X east, +Y up, -Z north',accuracy:'Schematic-derived layout; estimated heights and dimensions; not surveyed',mapSource:'https://welcome.bupt.edu.cn/info/1003/1172.htm'};
 const colliders=[],selectables=[],trees=[];
 const terrain=new THREE.Group();terrain.name='Terrain_and_roads';root.add(terrain);box(terrain,0,-1.1,0,550,2,798,'ground');
 function rect(g,x1,y1,x2,y2,mat,y=.03,h=.15){const [x,z]=toWorld((x1+x2)/2,(y1+y2)/2);return box(g,x,y,z,(x2-x1)/1062*500,h,(y2-y1)/1534*750,mat);}
 for(const [a,b,width] of roads){const [x,z]=toWorld(...a),[xx,zz]=toWorld(...b);const len=Math.hypot(xx-x,zz-z);const curb=box(terrain,(x+xx)/2,0,(z+zz)/2,width+2,.25,len+width,'curb');curb.rotation.y=Math.atan2(xx-x,zz-z);const r=box(terrain,(x+xx)/2,.17,(z+zz)/2,width,.12,len+width,'road');r.rotation.y=curb.rotation.y;}
 for(const l of lawns)rect(terrain,...l,'grass',.3,.3);
 // Context blocks are explicitly generalized: the map only labels residential zones.
 for(const [i,l]of residentialZones.entries()){
  const block=new THREE.Group();block.name=`Residential_context_${i}`;block.userData={accuracy:'Illustrative residential rows inside mapped zones; footprints and elevations not surveyed'};root.add(block);
  const [west,north]=toWorld(l[0],l[1]),[east,south]=toWorld(l[2],l[3]);
  const columns=Math.max(1,Math.floor((east-west)/38)),rows=Math.max(1,Math.floor((south-north)/32));
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const w=(east-west)/columns-5,d=Math.min(12,(south-north)/rows-4),h=12+(i%3)*3;
   const x=west+(col+.5)*(east-west)/columns,z=north+(row+.5)*(south-north)/rows;
   box(block,x,h/2,z,w,h,d,'dorm');pitchedRoof(block,x,z,w+.6,d+.8,h);
   for(let f=0;f<h/3;f++)for(let wx=-w/2+2;wx<w/2-1;wx+=3.7)for(const side of [-1,1]){
    box(block,x+wx,2+f*3,z+side*(d/2+.03),1.7,1.5,.12,'glass');
    box(block,x+wx,1.15+f*3,z+side*(d/2+.25),2,.15,.6,'white');
   }
   colliders.push({building:`residential-${i}`,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
  }optimize(block);
 }
 for(const b of buildings){const g=new THREE.Group();g.name=b.id;g.position.set(b.x,0,b.z);g.userData={...b};root.add(g);selectables.push(g);
 const {width:w,depth:d,height:h}=b;const wall=b.kind==='historic'?'wall':b.kind==='dorm'?'dorm':'white';
 function body(x,z,bw,bd,bh=h,material=wall,roof=false){box(g,x,bh/2,z,bw,bh,bd,material);box(g,x,bh+.15,z,bw+.6,.45,bd+.6,'curb');colliders.push({building:b.id,minX:b.x+x-bw/2,maxX:b.x+x+bw/2,minZ:b.z+z-bd/2,maxZ:b.z+z+bd/2});const floors=b.id==='teaching4'?3:Math.max(1,Math.round(bh/3.8));for(let f=0;f<floors;f++){const y=2.1+f*(bh-1)/floors;for(let a=-bw/2+2.5;a<bw/2-1;a+=4.6){for(const s of [-1,1])box(g,x+a,y,z+s*(bd/2+.03),2.15,1.75,.09,'glass');}for(let a=-bd/2+2.5;a<bd/2-1;a+=4.6){for(const s of [-1,1])box(g,x+s*(bw/2+.03),y,z+a,.09,1.75,2.15,'glass');}}
 for(const side of [-1,1]){box(g,x,1,z+side*(bd/2+.02),bw,1.5,.12,material==='wall'?'red':'curb');box(g,x,bh-.4,z+side*(bd/2+.15),bw,.24,.4,'curb');}
 if(roof)pitchedRoof(g,x,z,bw+.6,bd+.6,bh+.5);}
 if(['h','historic','u'].includes(b.kind)){const wing=Math.min(w*.21,13);body(-w/2+wing/2,0,wing,d,h,wall,b.kind==='historic');body(w/2-wing/2,0,wing,d,h,wall,b.kind==='historic');body(0,b.kind==='u'?d*.32:0,w-2*wing,d*.35,h,wall,b.kind==='historic');}
 else if(b.kind==='main'){
 body(w*.14,0,w*.64,d*.75,h,'white');
 // The official front photograph shows a concave, low entrance wing.
 // Nine adjacent segments approximate that curve without baking photo lighting.
 for(let i=0;i<9;i++){const u=(i+.5)/9*2-1,front=-w*.52+w*.12*(1-u*u),back=w*.1;body((front+back)/2,-d/2+(i+.5)*d/9,back-front,d/9,11,'white');}
 box(g,-w*.185,h*.55,0,.2,h*.85,d*.68,'blue');
 for(let floor=0;floor<11;floor++)box(g,-w*.2,5+floor*3.55,0,.4,.45,d*.69,'white');
 for(let z=-d*.34;z<d*.36;z+=d*.061)box(g,-w*.19,h/2+1,z,1.1,h,1.1,'white');
 box(g,-w*.46,5,0,5,.65,d*.3,'white');box(g,-w*.406,2.5,0,.25,4.8,d*.2,'blue');
 for(let s=0;s<4;s++)box(g,-w*.425-s*.6,.25+s*.16,0,2,.5,d*.28,'curb');
 }else if(b.kind==='teaching3'){
 body(0,0,w,d*.74,h,'white');
 const r=d*.17;const tower=cylinder(g,0,h/2,-d*.34,r,h,'glass',32);
 for(let y=1;y<h;y+=3.8)cylinder(g,0,y,-d*.34,r+.3,1.1,'white',32);
 for(const side of [-1,1]){box(g,side*w*.31,h*.5,-d*.373,w*.27,h*.85,.4,'blue');for(let y=4;y<h;y+=4)box(g,side*w*.31,y,-d*.395,w*.29,.7,2,'white');}
 box(g,0,h+1.6,-d*.31,r*2.3,.7,r*2,'dark');
 // The rounded part also participates in coarse walk collision.
 colliders.push({building:b.id,minX:b.x-r,maxX:b.x+r,minZ:b.z-d*.34-r,maxZ:b.z-d*.34+r});
 }else if(b.kind==='auditorium'){
 body(0,0,w,d,h,'white');box(g,-w/2-.15,h*.46,0,.3,h*.78,d*.77,'red');box(g,-w/2-.4,h*.43,0,.2,h*.57,d*.57,'glass');for(let z=-d*.3;z<d*.34;z+=d*.14)box(g,-w/2-.7,h*.46,z,.7,h*.76,.65,'red');box(g,-w/2-2,4.5,0,5,.8,d*.3,'dark');
 }else{body(0,0,w,d,h,wall);if(b.kind==='library'){for(let z=-d/2+3;z<d/2-1;z+=4.6)box(g,-w/2-.35,h*.55,z,.7,h*.9,.6,'white');box(g,-w/2-2,4,0,5,.55,13,'dark');box(g,-w/2-.08,1.55,0,.16,3.1,4.8,'blue');for(const side of [-1,1])box(g,-w/2-3.8,1.85,side*5.8,.25,3.7,.25,'white');}if(b.kind==='gym')box(g,0,h+.8,0,w+1.5,1.4,d+1.5,'blue');}
 detailBuilding(g,b,box);optimize(g);
 }
 // West gate: four columns and horizontal lintels, referenced from the official photograph.
 const gate=new THREE.Group();gate.name='West_gate';root.add(gate);const [gx,gz]=toWorld(150,1114);
 for(const off of [-19,-10,10,19]){box(gate,gx,4.5,gz+off,2.4,9,2.4,'wall');box(gate,gx,.35,gz+off,2.9,.7,2.9,'curb');box(gate,gx,8.7,gz+off,2.8,.5,2.8,'curb');for(let y=1.8;y<8;y+=1.4)box(gate,gx-1.21,y,gz+off,.03,.025,2.4,'dark');colliders.push({minX:gx-1.2,maxX:gx+1.2,minZ:gz+off-1.2,maxZ:gz+off+1.2});}box(gate,gx,9.8,gz,3,1.7,43,'white');box(gate,gx,7.6,gz,2.5,1,41,'wall');box(gate,gx,10.7,gz,3.4,.3,44,'curb');for(let z=-20;z<=20;z+=1)box(gate,gx,8.65,gz+z,.5,.9,.2,'wall');optimize(gate);
 // Sports field, running lanes, courts and the music fountain.
 const sports=new THREE.Group();sports.name='Sports_and_plazas';root.add(sports);
 function capsule(x,z,width,depth,y,material){const r=width/2,L=depth-width;const shape=new THREE.Shape();shape.moveTo(-r,-L/2);shape.absarc(0,-L/2,r,Math.PI,2*Math.PI,false);shape.lineTo(r,L/2);shape.absarc(0,L/2,r,0,Math.PI,false);shape.closePath();const m=new THREE.Mesh(new THREE.ShapeGeometry(shape,32),mats[material]);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);sports.add(m);}
 const [sx,sz]=toWorld(1130,1223);capsule(sx,sz,51,168,.31,'track');for(let i=0;i<5;i++){capsule(sx,sz,49-i*1.9,166-i*1.9,.36+i*.05,'white');capsule(sx,sz,48.7-i*1.9,165.7-i*1.9,.38+i*.05,'track');}capsule(sx,sz,37,154,.65,'field');
 const line=(x,z,w,d)=>box(sports,x,.75,z,w,.05,d,'white');for(const s of [-1,1]){line(sx+s*16,sz,.15,105);line(sx,sz+s*52.5,32,.15);line(sx,sz+s*38,20,.15);line(sx+s*10,sz-45,.15,15);line(sx+s*10,sz+45,.15,15);}line(sx,sz,32,.15);
 for(let i=0;i<4;i++){const [cx,cz]=toWorld(937+(i%2)*69,666+Math.floor(i/2)*80);box(sports,cx,.31,cz,27,.2,33,i%2?'field':'track');for(const s of [-1,1]){line(cx+s*11,cz,.15,27);line(cx,cz+s*13.5,22,.15);}line(cx,cz,22,.15);}
 const [fx,fz]=toWorld(703,1105);const fountain=cylinder(sports,fx,.5,fz,13,1,'curb',48);fountain.scale.z=1.7;const water=cylinder(sports,fx,1.05,fz,11.8,.12,'water',48);water.scale.z=1.7;cylinder(sports,fx,1.6,fz,2,1.1,'white');
 // Flag pole and a simple, intentionally non-sculptural marker for the motto stone.
 const [flagX,flagZ]=toWorld(618,1114);cylinder(sports,flagX,8,flagZ,.12,16,'dark',8);box(sports,flagX+1.2,14.5,flagZ,2.5,1.5,.05,'red');const [mx,mz]=toWorld(404,1114);box(sports,mx,1.4,mz,4,2.8,1.7,'wall');optimize(sports);
 // Deterministic vegetation on mapped lawns and along the main north/south avenue.
 let seed=42;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(const l of lawns){const [x1,z1]=toWorld(l[0]+6,l[1]+6),[x2,z2]=toWorld(l[2]-6,l[3]-6);for(let i=0;i<Math.max(4,Math.floor((x2-x1)*(z2-z1)/120));i++)trees.push([x1+rand()*(x2-x1),z1+rand()*(z2-z1),5+rand()*4]);}
 for(let y=260;y<1380;y+=30)for(const x of [550,597]){if([358,481,611,809,1007,1114,1206].every(c=>Math.abs(c-y)>20)){const [tx,tz]=toWorld(x,y);trees.push([tx,tz,7]);}}
 const vegetation=new THREE.Group();vegetation.name='Permanent_tree_structure';root.add(vegetation);
 const seasonal=new THREE.Group();seasonal.name='Seasonal_layer';seasonal.userData={role:'Replaceable foliage, surface covers and effects; not surveyed species or phenology'};
 const foliage=[];
 const crownGeometry=makeCrownGeometry();
 for(const [i,[x,z,h]]of trees.entries()){
  cylinder(vegetation,x,h*.32,z,.35,h*.64,'wood',5);
  for(let branch=0;branch<3;branch++){
   const angle=branch*Math.PI*2/3+i*.7;
   const start=new THREE.Vector3(x,h*.45,z),end=new THREE.Vector3(x+Math.cos(angle)*h*.23,h*.85,z+Math.sin(angle)*h*.23);
   const delta=end.clone().sub(start);const limb=cylinder(vegetation,...start.clone().add(end).multiplyScalar(.5).toArray(),.14,delta.length(),'wood',5);
   limb.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }
  const m=new THREE.Mesh(crownGeometry,mats[i%2?'tree':'tree2']);m.name=`Crown_${i}`;
  m.position.set(x,h*.75,z);m.scale.set(h*.38,h*.456,h*.38);m.castShadow=true;m.receiveShadow=true;
  // The official schematic identifies 小松林; tree species elsewhere remain placeholders.
  const [pineWest,pineNorth]=toWorld(613,630),[pineEast,pineSouth]=toWorld(710,678);
  m.userData={evergreen:x>=pineWest&&x<=pineEast&&z>=pineNorth&&z<=pineSouth,restPosition:m.position.toArray(),restScale:m.scale.toArray()};
  foliage.push(m);seasonal.add(m);
 }
 optimize(vegetation);optimize(terrain);
 const base=new THREE.Group();base.name='Permanent_core';base.userData={role:'Fixed buildings, roads, terrain and woody structure',...root.userData};
 for(const child of [...root.children])base.add(child);
 const furnishings=addCampusLife(base,colliders);addLandscape(base);
 root.add(base,seasonal);
 // Each campus owns its materials; preview seasons cannot contaminate another export.
 const materials=new Map();root.traverse(o=>{if(o.isMesh){if(!materials.has(o.material))materials.set(o.material,o.material.clone());o.material=materials.get(o.material);}});
 root.updateMatrixWorld(true);return {root,base,seasonal,foliage,colliders,selectables,trees,buildings,furnishings};
}
export function canWalk(x,z,colliders,radius=.65){return x>-257&&x<257&&z>-383&&z<383&&!colliders.some(c=>x>c.minX-radius&&x<c.maxX+radius&&z>c.minZ-radius&&z<c.maxZ+radius);}
