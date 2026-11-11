import * as THREE from 'three';

// Art-directed seasonal presets. They are not dated observations of this campus.
export const SEASONS = {
 spring: { label:'春', description:'新绿 · 花瓣随风', leaves:[0x90b56c,0xb4c783,0xe4b4c1], grass:0xa4bb83, field:0x81a779, sky:0xe8eee1, light:0xfff0dd, sun:2.1, density:.86, particles:360, particle:0xecc8d0, speed:1.1 },
 summer: { label:'夏', description:'浓荫 · 树冠轻摇', leaves:[0x4c8059,0x6e985b,0x60904e], grass:0x82a56a, field:0x6f986b, sky:0xe0e9df, light:0xfff4e5, sun:2.4, density:1.08, particles:0, particle:0xffffff, speed:0 },
 autumn: { label:'秋', description:'金黄 · 落叶飘动', leaves:[0xc69243,0xd8ae57,0xb87546], grass:0xb0a178, field:0x99966c, sky:0xeee7d8, light:0xffd4a1, sun:2.0, density:.82, particles:640, particle:0xcc923d, speed:1.65 },
 winter: { label:'冬', description:'裸枝 · 薄雪覆盖', leaves:[0x597b69,0x698374,0x718779], grass:0xaaa898, field:0x929b8a, sky:0xe0e7eb, light:0xdeebff, sun:1.55, density:0, particles:2400, particle:0xffffff, speed:3.8 },
};

function snowSurface(base) {
 const positions=[];base.updateMatrixWorld(true);
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),edge=new THREE.Vector3();
 const allowed=new Set(['white','roof','curb','grass','field','ground','unknown','blue']);
 base.traverse(mesh=>{
  if(!mesh.isMesh||!allowed.has(mesh.material.name))return;
  const p=mesh.geometry.attributes.position,idx=mesh.geometry.index;
  for(let i=0;i<(idx?idx.count:p.count);i+=3){
   a.fromBufferAttribute(p,idx?idx.getX(i):i).applyMatrix4(mesh.matrixWorld);
   b.fromBufferAttribute(p,idx?idx.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
   c.fromBufferAttribute(p,idx?idx.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
   normal.subVectors(b,a).cross(edge.subVectors(c,a)).normalize();
   if(normal.y<.62||Math.max(a.y,b.y,c.y)<-.15)continue;
   for(const v of [a,b,c])positions.push(v.x,v.y+.09,v.z);
  }
 });
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:0xf3f6f7,roughness:1,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Seasonal_snow_cover';mesh.receiveShadow=true;mesh.userData={role:'Visual snow cover on upward-facing surfaces; not physical snow simulation'};return mesh;
}

export function createSeasons({campus,scene,sun,hemisphere}) {
 const {base,seasonal,foliage,trees,colliders,buildings}=campus;
 const original={sky:scene.background.clone(),fog:scene.fog.color.clone(),sunColor:sun.color.clone(),sunIntensity:sun.intensity,position:sun.position.clone(),ground:hemisphere.groundColor.clone()};
 // Foliage gets dedicated materials. Permanent geometry and materials never change.
 const leafMaterials=[0,1,2].map(()=>new THREE.MeshStandardMaterial({roughness:.93}));
 const evergreenMaterial=new THREE.MeshStandardMaterial({color:0x527a60,roughness:.94});
 foliage.forEach((m,i)=>{m.material=m.userData.evergreen?evergreenMaterial:leafMaterials[i%3];});
 const land=[];
 base.traverse(mesh=>{if(mesh.isMesh&&['grass','field'].includes(mesh.material.name)){
  const overlay=new THREE.Mesh(mesh.geometry,mesh.material.clone());overlay.name=`Seasonal_${mesh.material.name}`;
  overlay.applyMatrix4(mesh.matrixWorld);overlay.position.y+=.035;overlay.receiveShadow=true;land.push(overlay);
 }});seasonal.add(...land);
 const snow=snowSurface(base);seasonal.add(snow);
 const capacity=2400,positions=new Float32Array(capacity*3),seeds=new Float32Array(capacity*4);
 let seed=202608;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<seeds.length;i++)seeds[i]=random();
 const particlesGeometry=new THREE.BufferGeometry();particlesGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
 const particleMaterial=new THREE.PointsMaterial({color:0xffffff,size:.5,transparent:true,opacity:.85,depthWrite:false,sizeAttenuation:true});
 // Round snowflakes and petals, no downloaded texture needed.
 particleMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;');};
 const particles=new THREE.Points(particlesGeometry,particleMaterial);particles.name='Seasonal_particles';particles.frustumCulled=false;seasonal.add(particles);
 const heights=new Map(buildings.map(b=>[b.id,b.height]));
 const snowFloors=new Float32Array(capacity);
 for(let i=0;i<capacity;i++){
  const x=(seeds[i*4]-.5)*500,z=(seeds[i*4+1]-.5)*750;
  let height=0;for(const c of colliders)if(x>=c.minX&&x<=c.maxX&&z>=c.minZ&&z<=c.maxZ)height=Math.max(height,heights.get(c.building)||8);
  snowFloors[i]=height+1;
 }
 let timeOfDay='day';
 let season='summer',animated=true,baseOnly=false,snowAmount=.7,time=0;
 let density=1.08,targetDensity=1.08,snowOpacity=0,targetSnow=0;
 let targetSky=new THREE.Color(),targetSun=new THREE.Color(),targetGrass=new THREE.Color(),targetField=new THREE.Color();
 const targetLeaves=[new THREE.Color(),new THREE.Color(),new THREE.Color()];
 function applyTargets(instant=false){
  const config=SEASONS[season];
  foliage.forEach((m,i)=>{if(!m.userData.evergreen)m.material=leafMaterials[season==='spring'?(i%7===2?2:i%2):i%3];});
  targetSky.set(baseOnly?original.sky:config.sky);targetSun.set(baseOnly?original.sunColor:config.light);
  if(!baseOnly&&timeOfDay==='sunset'){targetSky.lerp(new THREE.Color(0xeac3a3),.65);targetSun.set(0xffb76e);}
  if(!baseOnly&&timeOfDay==='night'){targetSky.set(0x172534);targetSun.set(0xb9d5ef);}
  targetGrass.set(config.grass);targetField.set(config.field);targetLeaves.forEach((color,i)=>color.set(config.leaves[i]));
  targetDensity=config.density;targetSnow=season==='winter'?snowAmount:0;
  if(instant){density=targetDensity;snowOpacity=targetSnow;scene.background.copy(targetSky);scene.fog.color.copy(targetSky);sun.color.copy(targetSun);leafMaterials.forEach((m,i)=>m.color.copy(targetLeaves[i]));land.forEach(m=>m.material.color.copy(m.material.name==='grass'?targetGrass:targetField));}
  seasonal.visible=!baseOnly;
  particlesGeometry.setDrawRange(0,config.particles);particleMaterial.color.set(config.particle);particleMaterial.size=season==='winter'?.65:.42;
  particles.visible=animated&&!baseOnly&&config.particles>0&&(season!=='winter'||snowAmount>0);
 }
 function setSeason(value){if(!Object.hasOwn(SEASONS,value))throw new Error(`Unknown season: ${value}`);season=value;applyTargets(!animated);}
 function setAnimated(value){animated=Boolean(value);applyTargets(!animated);}
 function setBaseOnly(value){baseOnly=Boolean(value);applyTargets(!animated);}
 function setSnowAmount(value){if(!Number.isFinite(value))throw new TypeError('Snow amount must be finite');snowAmount=THREE.MathUtils.clamp(value,0,1);applyTargets(!animated);}
 function update(dt){
  dt=Math.min(Math.max(dt,0),.25);if(animated&&!baseOnly)time+=dt;
  const config=SEASONS[season],mix=animated?1-Math.exp(-dt*5):1;
  density=THREE.MathUtils.lerp(density,targetDensity,mix);snowOpacity=THREE.MathUtils.lerp(snowOpacity,targetSnow,mix);
  scene.background.lerp(targetSky,mix);scene.fog.color.copy(scene.background);sun.color.lerp(targetSun,mix);
  sun.intensity=THREE.MathUtils.lerp(sun.intensity,baseOnly?original.sunIntensity:timeOfDay==='night'?.32:timeOfDay==='sunset'?1.65:config.sun,mix);
  hemisphere.intensity=THREE.MathUtils.lerp(hemisphere.intensity,baseOnly?1.6:timeOfDay==='night'?.8:1.6,mix);
  const winter=!baseOnly&&season==='winter';sun.position.y=THREE.MathUtils.lerp(sun.position.y,timeOfDay==='sunset'&&!baseOnly?120:winter?240:450,mix);
  hemisphere.groundColor.lerp(baseOnly?original.ground:new THREE.Color(winter?0x97a3ab:0x7b8a76),mix);
  leafMaterials.forEach((m,i)=>m.color.lerp(targetLeaves[i],mix));
  land.forEach(m=>m.material.color.lerp(m.material.name==='grass'?targetGrass:targetField,mix));
  snow.material.opacity=snowOpacity;snow.visible=snowOpacity>.003;
  foliage.forEach((mesh,i)=>{
   const rest=mesh.userData.restScale,position=mesh.userData.restPosition;
   const scale=mesh.userData.evergreen?1:density;
   mesh.visible=scale>.025;mesh.scale.set(rest[0]*scale,rest[1]*scale,rest[2]*scale);
   mesh.position.set(position[0]+(animated?Math.sin(time*1.4+i*2.3)*.13:0),position[1],position[2]+(animated?Math.cos(time+i)*.1:0));
   mesh.rotation.z=animated?Math.sin(time*1.2+i)*.018:0;
  });
  if(particles.visible){
   for(let i=0;i<config.particles;i++){
    const a=seeds[i*4],b=seeds[i*4+1],c=seeds[i*4+2],d=seeds[i*4+3];
    if(season==='winter'){
     positions[i*3]=(a-.5)*500+Math.sin(time*.5+d*20)*1.8;
     positions[i*3+1]=snowFloors[i]+(c*85-time*config.speed*(.7+d*.6)%85+85)%85;
     positions[i*3+2]=(b-.5)*750+Math.cos(time*.4+d*12)*1.2;
    }else{
     // Petals come only from the same minority of crowns that are colored pink.
     const treeIndex=season==='spring'?(i*7+2)%trees.length:i%trees.length;
     const [x,z,h]=trees[treeIndex];
     positions[i*3]=x+Math.sin(time*.8+a*10)*2+(a-.5)*5;
     positions[i*3+1]=.5+(b*h-time*config.speed*(.8+d*.4)%h+h)%h;
     positions[i*3+2]=z+Math.cos(time*.6+c*10)*2+(c-.5)*5;
    }
   }
   particlesGeometry.attributes.position.needsUpdate=true;
  }
 }
 applyTargets(true);update(0);
 return {setTimeOfDay(value){if(!['day','sunset','night'].includes(value))throw new Error('Invalid time of day');timeOfDay=value;applyTargets(!animated);},setSeason,setAnimated,setBaseOnly,setSnowAmount,update,get state(){return {season,timeOfDay,animated,baseOnly,snowAmount,snowVisible:!baseOnly&&snow.visible,particles:particles.visible?configCount():0,time};}};
 function configCount(){return SEASONS[season].particles;}
}
