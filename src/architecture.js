import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Reusable architectural detail. Unphotographed elevations are interpretations.
export function detailBuilding(g,b,box){
 const {width:w,depth:d,height:h,kind}=b;
 if(['h','u','historic','main','teaching3'].includes(kind))return;
 // Copings and roof parapets are real geometry, so silhouettes hold up in flight.
 for(const side of [-1,1]){
  box(g,side*(w/2-.25),h+.65,0,.5,1,d,'curb');
  box(g,0,h+.65,side*(d/2-.25),w,1,.5,'curb');
 }
 if(kind==='main'||kind==='teaching3')return;
 box(g,w*.2,h+1.4,d*.17,Math.min(9,w*.3),2.8,Math.min(7,d*.3),'white');
 for(let z=-d/2+2.5;z<d/2-1;z+=4.6){
  for(const side of [-1,1]){
   for(let f=0;f<Math.max(1,Math.round(h/3.8));f++){
    const y=2.1+f*(h-1)/Math.max(1,Math.round(h/3.8));
    box(g,side*(w/2+.09),y,z,.16,1.85,.075,'white');
    box(g,side*(w/2+.16),y-.94,z,.42,.14,2.45,'curb');
    if(kind==='dorm'&&f>0&&Math.round(z*10)%3===0){
     box(g,side*(w/2+.32),y-1.25,z+.8,.55,.55,.8,'white');
     box(g,side*(w/2+.61),y-1.25,z+.8,.025,.32,.55,'dark');
    }
   }
  }
 }
 for(let x=-w/2+2.5;x<w/2-1;x+=4.6)for(const side of [-1,1]){
  for(let f=0;f<Math.max(1,Math.round(h/3.8));f++){
   const y=2.1+f*(h-1)/Math.max(1,Math.round(h/3.8));
   box(g,x,y,side*(d/2+.09),.075,1.85,.16,'white');
   box(g,x,y-.94,side*(d/2+.16),2.45,.14,.42,'curb');
  }
 }
 // Entrance doors and projecting canopy on the south elevation.
 box(g,0,1.65,d/2+.12,3.4,3.3,.18,'blue');
 box(g,0,1.65,d/2+.23,.1,3.3,.12,'white');
 box(g,0,3.65,d/2+.8,5.2,.3,2,'dark');
 for(const side of [-1,1])box(g,side*2.35,1.8,d/2+1.4,.15,3.6,.15,'dark');
}

export function makeCrownGeometry(){
 const geoms=[];
 for(let i=0;i<7;i++){
  const g=new THREE.IcosahedronGeometry(i===0?.8:.57,1);
  if(i>0){const a=i*Math.PI/3;g.translate(Math.cos(a)*.5,(i%2)*.25-.12,Math.sin(a)*.5);}
  geoms.push(g);
 }
 const merged=mergeGeometries(geoms);geoms.forEach(g=>g.dispose());return merged;
}
