import * as THREE from 'three';
import {canWalk} from './campus-model.js';

const KEY='bupt-creative-v1',LIMIT=160;
export const propTypes=['tree','bench','block'];
export function sanitizeProps(value){
 if(!Array.isArray(value))return [];
 return value.filter(p=>p&&propTypes.includes(p.type)&&[p.x,p.z,p.rotation].every(Number.isFinite)&&Math.abs(p.x)<250&&Math.abs(p.z)<375).slice(0,LIMIT).map(p=>({type:p.type,x:p.x,z:p.z,rotation:p.rotation}));
}
export function createCreative(scene,storage,colliders,onChange){
 const group=new THREE.Group();group.name='Personal_creative_layer';scene.add(group);
 const materials={tree:new THREE.MeshStandardMaterial({color:0x70985b,roughness:.95}),wood:new THREE.MeshStandardMaterial({color:0x966e46,roughness:.9}),block:new THREE.MeshStandardMaterial({color:0xc1aa83,roughness:.9})};
 const sizes={tree:[2.6,2.6],bench:[2.8,1.2],block:[3,3]};
 let records=[],undoStack=[],persistent=!!storage;
 try{records=sanitizeProps(JSON.parse(storage?.getItem(KEY)||'[]'));}catch{persistent=false;}
 function object(p){const root=new THREE.Group();root.position.set(p.x,0,p.z);root.rotation.y=p.rotation;
  const box=(x,y,z,w,h,d,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials[mat]);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);};
  if(p.type==='block')box(0,1.5,0,3,3,3,'block');
  if(p.type==='bench'){box(0,.72,0,2.8,.18,.9,'wood');box(0,1.17,-.45,2.8,.85,.14,'wood');for(const x of [-1,1])box(x,.35,0,.15,.7,.8,'block');}
  if(p.type==='tree'){box(0,1.7,0,.35,3.4,.35,'wood');for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1.6-i*.2,1),materials.tree);m.position.set(Math.sin(i*2)*.6,3.4+i*.7,Math.cos(i*2)*.5);m.castShadow=true;root.add(m);}}
  return root;
 }
 function rebuild(){for(const c of [...group.children]){c.traverse(o=>o.geometry?.dispose());group.remove(c);}records.forEach((p,index)=>{const obj=object(p);obj.userData.index=index;group.add(obj);});}
 function persist(){try{storage?.setItem(KEY,JSON.stringify(records));}catch{persistent=false;}onChange?.(records.length,persistent);}
 function checkpoint(){undoStack.push(records.map(p=>({...p})));if(undoStack.length>40)undoStack.shift();}
 function propCollider(p){const [w,d]=sizes[p.type],c=Math.abs(Math.cos(p.rotation)),s=Math.abs(Math.sin(p.rotation));return {minX:p.x-(w*c+d*s)/2,maxX:p.x+(w*c+d*s)/2,minZ:p.z-(d*c+w*s)/2,maxZ:p.z+(d*c+w*s)/2};}
 function valid(p){if(records.length>=LIMIT)return false;const c=propCollider(p);return [[c.minX,c.minZ],[c.maxX,c.maxZ]].every(([x,z])=>canWalk(x,z,[],.35))&&!colliders.some(a=>c.minX<a.maxX+.35&&c.maxX>a.minX-.35&&c.minZ<a.maxZ+.35&&c.maxZ>a.minZ-.35)&&!records.some(other=>{const a=propCollider(other);return c.minX<a.maxX&&c.maxX>a.minX&&c.minZ<a.maxZ&&c.maxZ>a.minZ;});}
 const ghostMaterial=new THREE.MeshBasicMaterial({color:0x8ecfa4,transparent:true,opacity:.45,depthWrite:false});
 const ghost=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),ghostMaterial);ghost.visible=false;scene.add(ghost);
 rebuild();persist();
 return {group,get count(){return records.length;},get colliders(){return records.map(propCollider);},get persistent(){return persistent;},
  preview(p){ghost.visible=!!p;if(!p)return;const [w,d]=sizes[p.type],h=p.type==='tree'?5:p.type==='bench'?1.5:3;ghost.position.set(p.x,h/2,p.z);ghost.rotation.y=p.rotation;ghost.scale.set(w,h,d);ghostMaterial.color.set(valid(p)?0x8ecfa4:0xe1796c);},
  add(p){if(!valid(p))return false;checkpoint();records.push({...p});rebuild();persist();return true;},
  remove(index){if(!records[index])return false;checkpoint();records.splice(index,1);rebuild();persist();return true;},
  undo(){if(!undoStack.length)return false;records=undoStack.pop();rebuild();persist();return true;},
  export(){return JSON.stringify({version:1,description:'Personal additions; original campus model is separate',props:records},null,2);}
 };
}
