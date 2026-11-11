import * as THREE from 'three';

// Original stylized student character; the rig is deliberately independent of camera control.
export function createAvatar(){
 const root=new THREE.Group();root.name='Student_avatar';
 const mats={shirt:new THREE.MeshStandardMaterial({color:0xe9eadb,roughness:.85}),blue:new THREE.MeshStandardMaterial({color:0x365b72,roughness:.85}),skin:new THREE.MeshStandardMaterial({color:0xdcb18a,roughness:.9}),hair:new THREE.MeshStandardMaterial({color:0x302d2b,roughness:1}),shoe:new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.8})};
 const box=(parent,x,y,z,w,h,d,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mats[mat]);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
 box(root,0,1.12,0,.46,.59,.28,'shirt');box(root,0,1.18,-.2,.34,.42,.17,'blue');
 box(root,0,1.6,0,.32,.35,.3,'skin');box(root,0,1.79,-.025,.35,.16,.34,'hair');box(root,0,1.64,-.15,.35,.25,.05,'hair');
 for(const x of [-.075,.075])box(root,x,1.65,.155,.025,.027,.012,'hair');
 const limbs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.3,1.36,0);root.add(arm);box(arm,0,-.14,0,.15,.32,.2,'shirt');box(arm,0,-.39,0,.12,.27,.14,'skin');limbs.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.125,.83,0);root.add(leg);box(leg,0,-.32,0,.19,.65,.24,'blue');box(leg,0,-.69,.035,.21,.16,.34,'shoe');limbs.push(leg);
 }
 let time=0;
 return {root,update(dt,position,direction,moving,sprinting){root.position.copy(position);root.position.y-=1.75;if(moving){root.rotation.y=Math.atan2(direction.x,direction.z);time+=dt*(sprinting?14:9);}for(let i=0;i<limbs.length;i++)limbs[i].rotation.x=THREE.MathUtils.lerp(limbs[i].rotation.x,moving?Math.sin(time+(i<2?0:Math.PI))*(i%2===0?.5:-.65):0,Math.min(1,dt*14));}};
}
