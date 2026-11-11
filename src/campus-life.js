import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {toWorld} from './campus-data.js';

// Designed scene furnishings, not a survey of the university's actual furniture.
export function addCampusLife(base,colliders){
 const group=new THREE.Group();group.name='Campus_furnishings';group.userData={accuracy:'Art-directed benches, lamps, paving and bicycles; placements are not surveyed'};base.add(group);
 const colors={metal:0x44564d,wood:0x9d7752,stone:0xd9d3c6,light:0xf8e8bd,tire:0x454b45,bike:0x8aab9a};
 const materials=Object.fromEntries(Object.entries(colors).map(([name,color])=>{const material=new THREE.MeshStandardMaterial({color,roughness:.85});material.name=`furnishing_${name}`;return [name,material];}));
 const add=(geometry,x,y,z,mat)=>{const mesh=new THREE.Mesh(geometry,materials[mat]);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const box=(x,y,z,w,h,d,mat)=>add(new THREE.BoxGeometry(w,h,d),x,y,z,mat);
 const pole=(x,y,z,r,h,mat)=>add(new THREE.CylinderGeometry(r,r,h,8),x,y,z,mat);
 const lamps=[],signs=[];
 const isClear=(x,z,w,d)=>!colliders.some(c=>x+w/2+.5>c.minX&&x-w/2-.5<c.maxX&&z+d/2+.5>c.minZ&&z-d/2-.5<c.maxZ);
 const solid=(x,z,w,d,id)=>colliders.push({building:id,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
 for(let y=300;y<1370;y+=105)for(const x of [548,598]){
  const [px,pz]=toWorld(x,y);if(!isClear(px,pz,1,1))continue;
  pole(px,2.5,pz,.12,5,'metal');box(px,5,pz,1.2,.18,.6,'metal');box(px,4.89,pz,.92,.08,.42,'light');lamps.push([px,4.85,pz]);solid(px,pz,.45,.45,'lamp');
 }
 for(let x=272;x<737;x+=72)for(const y of [1099,1129]){
  const [px,pz]=toWorld(x,y);if(!isClear(px,pz,1,1))continue;
  pole(px,2.5,pz,.12,5,'metal');box(px,5,pz,1.2,.18,.6,'metal');box(px,4.89,pz,.92,.08,.42,'light');lamps.push([px,4.85,pz]);solid(px,pz,.45,.45,'lamp');
 }
 const benches=[[296,1083],[365,1083],[457,1083],[521,1083],[297,1143],[456,1143],[624,688],[683,688],[623,732],[681,732]];
 for(const point of benches){const [x,z]=toWorld(...point);if(!isClear(x,z,2.6,1))continue;
  for(let i=0;i<4;i++)box(x,.72,z-.3+i*.2,2.5,.12,.14,'wood');
  box(x,1.18,z+.43,2.5,.65,.12,'wood');for(const side of [-1,1]){box(x+side*.93,.38,z,.12,.7,.62,'metal');box(x+side*1.17,.98,z,.08,.08,.8,'metal');}
  solid(x,z,2.5,1,'bench');
 }
 // Footpath paving accents on the approach from the west gate.
 for(let x=267;x<650;x+=9){const [px,pz]=toWorld(x,1114);box(px,.245,pz,.12,.02,7.5,'stone');}
 for(const [px,py,text,angle]of [[150,1114,'北京邮电大学',-Math.PI/2],[740,1114,'未来学习大楼',-Math.PI/2],[727,711,'图书馆',-Math.PI/2],[405,1215,'教三楼',Math.PI],[405,990,'教四楼',0],[904,1114,'科学会堂',-Math.PI/2],[581,480,'宿舍 · 食堂  ↑',Math.PI/2]]){
  let [x,z]=toWorld(px,py);if(text!=='北京邮电大学'){x+=Math.cos(angle)*4.5;z-=Math.sin(angle)*4.5;}signs.push({text,x,z,y:text==='北京邮电大学'?7.5:2.2,angle});
  if(text!=='北京邮电大学'){const m=box(x,2.2,z,2.3,.7,.1,'metal');m.rotation.y=angle;pole(x,1,z,.06,2,'metal');}
 }
 // A few parked bicycles outside the dorm zone; all original simple geometry.
 for(let i=0;i<9;i++){
  const [x,z]=toWorld(429+i*8,803);if(!isClear(x,z,1.8,.7))continue;
  for(const dx of [-.58,.58]){const wheel=add(new THREE.TorusGeometry(.33,.045,5,14),x+dx,.38,z,'tire');wheel.rotation.y=0;}
  const points=[[-.58,.38],[0,.42],[-.14,.96],[.58,.38],[.35,1.04],[0,.42]];
  for(let j=1;j<points.length;j++){
   const a=new THREE.Vector3(x+points[j-1][0],points[j-1][1],z),b=new THREE.Vector3(x+points[j][0],points[j][1],z),delta=b.clone().sub(a);
   const beam=add(new THREE.CylinderGeometry(.035,.035,delta.length(),5),...a.clone().add(b).multiplyScalar(.5).toArray(),'bike');beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }box(x-.14,1.04,z,.32,.08,.16,'metal');box(x+.35,1.12,z,.08,.06,.45,'metal');
 }
 // Merge by material so the decorative scene adds only a handful of draw calls.
 const buckets=new Map();for(const mesh of [...group.children]){mesh.updateMatrix();const g=mesh.geometry.clone().applyMatrix4(mesh.matrix);if(!buckets.has(mesh.material))buckets.set(mesh.material,[]);buckets.get(mesh.material).push(g);group.remove(mesh);mesh.geometry.dispose();}
 for(const [material,geometries]of buckets){const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);geometries.forEach(g=>g.dispose());}
 return {lamps,signs};
}

export function createSignage(signs){
 const group=new THREE.Group();group.name='Readable_campus_signs';
 for(const sign of signs){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const ctx=canvas.getContext('2d');
  ctx.fillStyle=sign.text==='北京邮电大学'?'#e7dfca':'#31483b';ctx.fillRect(0,0,768,160);
  ctx.fillStyle=sign.text==='北京邮电大学'?'#5f563e':'#f5f0df';ctx.font='600 72px "PingFang SC", "Microsoft YaHei", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sign.text,384,85,700);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshStandardMaterial({map:texture,roughness:.9,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(sign.text==='北京邮电大学'?15:2.25,sign.text==='北京邮电大学'?2.5:.68),material);mesh.position.set(sign.x,sign.y,sign.z);mesh.rotation.y=sign.angle;
  mesh.position.x+=Math.sin(sign.angle)*.065;mesh.position.z+=Math.cos(sign.angle)*.065;group.add(mesh);
 }return group;
}
