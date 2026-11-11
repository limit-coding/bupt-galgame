import * as THREE from 'three';

export function createWorldAtmosphere(scene,campus){
 const skyMaterial=new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,
  uniforms:{zenith:{value:new THREE.Color('#79b7e4')},horizon:{value:new THREE.Color('#e1edf0')},night:{value:0},time:{value:0}},
  vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec3 vDirection; uniform vec3 zenith; uniform vec3 horizon; uniform float night; uniform float time;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.);vec3 col=mix(horizon,zenith,pow(h,.55));
    vec2 uv=d.xz/max(d.y+.12,.1)*2.;float n=noise(uv+time*.004)*.6+noise(uv*2.1+time*.006)*.3+noise(uv*4.3)*.1;
    float clouds=smoothstep(.57,.78,n)*smoothstep(.02,.18,h);col=mix(col,vec3(.97,.97,.92),clouds*(1.-night)*.7);
    float stars=step(.9985,hash(floor(d.xz/max(d.y+.2,.1)*600.)))*smoothstep(.05,.4,h)*night;
    gl_FragColor=vec4(col+stars*.65,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const sky=new THREE.Mesh(new THREE.SphereGeometry(2200,32,16),skyMaterial);sky.name='Atmospheric_sky';sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
 const surroundings=new THREE.Mesh(new THREE.PlaneGeometry(12000,12000),new THREE.MeshStandardMaterial({color:0x899c80,roughness:1}));surroundings.rotation.x=-Math.PI/2;surroundings.position.y=-1.8;surroundings.receiveShadow=true;scene.add(surroundings);
 // Procedural world-space microtexture: no external images or baked sunlight.
 const seen=new Set();campus.root.traverse(m=>{
  if(!m.isMesh||seen.has(m.material))return;const mat=m.material;seen.add(mat);
  if(['glass','blue'].includes(mat.name)){mat.roughness=.24;mat.metalness=.28;return;}
  const kind=['wall','dorm','roof'].includes(mat.name)?1:['road','ground','curb','grass','field','white'].includes(mat.name)?2:0;
  if(!kind)return;
  mat.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSurface;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=(modelMatrix*vec4(position,1.)).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vSurface;\nfloat surfaceHash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}`)
    .replace('#include <color_fragment>',`#include <color_fragment>
     float grain=surfaceHash(floor(vSurface*90.));
     diffuseColor.rgb*=.94+grain*.12;
     ${kind===1?`float by=fract(vSurface.y/.28);float bx=fract((vSurface.x+vSurface.z)/.6+mod(floor(vSurface.y/.28),2.)*.5);
     float mortar=max(1.-smoothstep(.025,.06,by),1.-smoothstep(.025,.055,bx));diffuseColor.rgb*=1.-mortar*.13;`:mat.name==='curb'||mat.name==='ground'?`vec2 tile=abs(fract(vSurface.xz/2.)-.5);float seam=smoothstep(.486,.497,max(tile.x,tile.y));diffuseColor.rgb*=1.-seam*.13;`:''}`);
  };mat.customProgramCacheKey=()=>`campus-surface-${mat.name}-${kind}`;
 });
 // Batch animated crowns by their current seasonal material, keeping individual transforms.
 const crownBatches=new Map(),matrix=new THREE.Matrix4();
 for(const crown of campus.foliage)campus.seasonal.remove(crown);
 function updateCrowns(){
  for(const batch of crownBatches.values())batch.count=0;
  for(const crown of campus.foliage){
   if(!crown.visible)continue;
   let batch=crownBatches.get(crown.material);
   if(!batch){batch=new THREE.InstancedMesh(crown.geometry,crown.material,campus.foliage.length);batch.name='Batched_seasonal_crowns';batch.castShadow=batch.receiveShadow=true;batch.frustumCulled=false;batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.count=0;campus.seasonal.add(batch);crownBatches.set(crown.material,batch);}
   crown.updateMatrix();matrix.copy(crown.matrix);batch.setMatrixAt(batch.count++,matrix);
  }
  for(const batch of crownBatches.values()){batch.visible=batch.count>0;batch.instanceMatrix.needsUpdate=true;}
 }
 const color=new THREE.Color();let time=0;
 return {update(dt,camera,state){time+=state.animated?dt:0;updateCrowns();sky.position.copy(camera.position);skyMaterial.uniforms.time.value=time;
  const night=state.timeOfDay==='night'&&!state.baseOnly,sunset=state.timeOfDay==='sunset'&&!state.baseOnly;
  const mix=1-Math.exp(-dt*4);skyMaterial.uniforms.zenith.value.lerp(color.set(night?'#0c1830':sunset?'#697fba':state.season==='winter'?'#9abbd6':'#70aee0'),mix);
  skyMaterial.uniforms.horizon.value.lerp(scene.background,mix);skyMaterial.uniforms.night.value=THREE.MathUtils.lerp(skyMaterial.uniforms.night.value,night?1:0,mix);
 }};
}
