import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {toWorld,lawns} from './campus-data.js';

// Outdoor set dressing is designed for this world; it is not a site survey.
export function addLandscape(base){
 const group=new THREE.Group();group.name='Landscape_and_sports_details';group.userData.accuracy='Original landscape and sports details; approximate placements';base.add(group);
 const mats=Object.fromEntries(Object.entries({hedge:0x527b45,flower:0xd6b77e,stone:0xc9c6b6,white:0xefeee1,metal:0x5b7773,soil:0x877c58,seat:0x7597a5}).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:.86})]));
 const add=(geo,x,y,z,mat)=>{const mesh=new THREE.Mesh(geo,mats[mat]);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const box=(x,y,z,w,h,d,mat)=>add(new THREE.BoxGeometry(w,h,d),x,y,z,mat);
 // Low planted edges and flower beds set away from the open routes.
 for(const l of lawns){const [x1,z1]=toWorld(l[0],l[1]),[x2,z2]=toWorld(l[2],l[3]);
  for(const z of [z1+1,z2-1]){
   box((x1+x2)/2,.58,z,x2-x1-2,.5,.8,'hedge');
   for(let x=x1+2;x<x2-2;x+=1.3){const bloom=add(new THREE.IcosahedronGeometry(.15,0),x,.9,z+.1,'flower');bloom.scale.set(1.4,.6,1.2);}
  }
 }
 // Running-field furniture: open goals, fine netting and modest spectator terraces.
 const [sx,sz]=toWorld(1130,1223);
 for(const side of [-1,1]){
  const z=sz+side*52.5;
  for(const x of [-3.66,3.66])box(sx+x,1.9,z,.12,2.44,.12,'white');box(sx,3.12,z,7.44,.12,.12,'white');
  for(let x=-3.6;x<=3.6;x+=.4)box(sx+x,1.9,z+side*1.7,.024,2.44,.024,'white');
  for(let y=.68;y<=3.12;y+=.35)box(sx,y,z+side*1.7,7.4,.024,.024,'white');
 }
 const circle=new THREE.Mesh(new THREE.RingGeometry(8.9,9.05,64),mats.white);circle.rotation.x=-Math.PI/2;circle.position.set(sx,.79,sz);group.add(circle);
 for(let i=0;i<4;i++){box(sx+29+i*.95,1+i*.55,sz,.95,.6,68,'stone');box(sx+29+i*.95,1.36+i*.55,sz,.5,.1,66,'seat');}
 // Basketball hoops, backboards and center circles.
 for(let i=0;i<4;i++){
  const [x,z]=toWorld(937+(i%2)*69,666+Math.floor(i/2)*80);
  const line=new THREE.Mesh(new THREE.RingGeometry(2.9,3.02,40),mats.white);line.rotation.x=-Math.PI/2;line.position.set(x,.79,z);group.add(line);
  for(const side of [-1,1]){
   box(x,1.85,z+side*14.5,.18,3.1,.18,'metal');box(x,3.4,z+side*13.1,1.8,1.05,.1,'white');box(x,3.43,z+side*13.03,.65,.45,.02,'metal');
   const hoop=add(new THREE.TorusGeometry(.23,.035,6,20),x,3.13,z+side*12.68,'flower');hoop.rotation.x=Math.PI/2;
  }
 }
 // Fountain jets: translucent-looking pale streams, actual arches in 3D.
 const [fx,fz]=toWorld(703,1105);
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,points=[];
  for(let j=0;j<=20;j++){const t=j/20,r=2+t*7;points.push(new THREE.Vector3(fx+Math.cos(a)*r,1.15+Math.sin(t*Math.PI)*3.1,fz+Math.sin(a)*r*1.6));}
  const curve=new THREE.CatmullRomCurve3(points);add(new THREE.TubeGeometry(curve,20,.055,4,false),0,0,0,'white');
 }
 const buckets=new Map();for(const mesh of [...group.children]){mesh.updateMatrix();const geom=(mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()).applyMatrix4(mesh.matrix);if(!buckets.has(mesh.material))buckets.set(mesh.material,[]);buckets.get(mesh.material).push(geom);group.remove(mesh);mesh.geometry.dispose();}
 for(const [material,geometries]of buckets){const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);geometries.forEach(g=>g.dispose());}
 return group;
}
