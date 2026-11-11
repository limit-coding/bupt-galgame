import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {buildCampus} from './campus-model.js';
import {landmarks} from './campus-data.js';
import {createSeasons,SEASONS} from './seasons.js';
import {createSignage} from './campus-life.js';
import {createNavigation,moveWithCollisions} from './navigation.js';
import {places,placeById,WEST_GATE} from './places.js';
import {createSave} from './save.js';
import {createAmbience} from './audio.js';
import {createMinimap} from './minimap.js';
import {createWorldAtmosphere} from './world-atmosphere.js';
import {createAvatar} from './avatar.js';
import {createCreative} from './creative.js';
import './style.css';

const $=selector=>document.querySelector(selector);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});}
catch(error){$('#loading span').textContent='当前浏览器无法启动 3D 画面。请启用硬件加速，或使用支持 WebGL 的浏览器。';throw error;}
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;$('#scene').appendChild(renderer.domElement);renderer.domElement.tabIndex=0;
const scene=new THREE.Scene();scene.background=new THREE.Color('#e7ecdf');scene.fog=new THREE.Fog('#e7ecdf',1000,2400);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.2,3000);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=25;orbit.maxDistance=2500;orbit.maxPolarAngle=Math.PI*.48;
const pointer=new PointerLockControls(camera,renderer.domElement);
const hemisphere=new THREE.HemisphereLight(0xf4f4e6,0x7b8a76,1.6);scene.add(hemisphere);
const sun=new THREE.DirectionalLight(0xfff1da,2.2);sun.position.set(-240,450,180);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-460,right:460,top:500,bottom:-500,far:1100});sun.shadow.bias=-.0004;sun.shadow.normalBias=.5;scene.add(sun);
const campus=buildCampus();scene.add(campus.root,createSignage(campus.furnishings.signs));
const navigation=createNavigation(campus.colliders);
let storage;try{storage=localStorage;}catch{storage=null;}
const save=createSave(storage),ambience=createAmbience(),seasons=createSeasons({campus,scene,sun,hemisphere});
const minimap=createMinimap($('#minimap'),campus.buildings);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');seasons.setAnimated(!reducedMotion.matches);seasons.setSeason(save.data.season);seasons.setTimeOfDay(save.data.timeOfDay);ambience.setVolume(save.data.volume);
const atmosphere=createWorldAtmosphere(scene,campus),avatar=createAvatar();scene.add(avatar.root);avatar.root.visible=false;
const player=new THREE.Vector3();let thirdPerson=true,jumpVelocity=0,groundY=1.75;
const creative=createCreative(scene,storage,campus.colliders,(count,persistent)=>{if($('#build-count'))$('#build-count').textContent=`${count} / 160 件 · ${persistent?'自动保存在本机':'仅本次会话'}`;});
let buildTool='none',buildRotation=0,buildPoint=null;const buildPointer=new THREE.Vector2(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
let mode='orbit',paused=false,labelsOn=true,transition=null,suppressUnlock=false,nearestPlace=null,targetId='west-gate',route=[],nextMapUpdate=0,toastTimer;
const keys=new Set(),raycaster=new THREE.Raycaster();const touchMode=()=>matchMedia('(pointer: coarse)').matches||innerWidth<850;
const routeMaterial=new THREE.LineBasicMaterial({color:0xb79151,transparent:true,opacity:.9});
let routeLine;
const targetRing=new THREE.Mesh(new THREE.RingGeometry(1.4,1.7,40),new THREE.MeshBasicMaterial({color:0xc79a57,side:THREE.DoubleSide,transparent:true,opacity:.85}));targetRing.rotation.x=-Math.PI/2;targetRing.visible=false;scene.add(targetRing);
const lampGlow=new THREE.Group();lampGlow.name='Evening_lamp_glow';scene.add(lampGlow);
const lampMaterial=new THREE.MeshBasicMaterial({color:0xffdf9f});
const lampBulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(.2,6,4),lampMaterial,campus.furnishings.lamps.length);
const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;const glowContext=glowCanvas.getContext('2d');const gradient=glowContext.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,215,150,.35)');gradient.addColorStop(1,'rgba(255,215,150,0)');glowContext.fillStyle=gradient;glowContext.fillRect(0,0,64,64);
const lampPools=new THREE.InstancedMesh(new THREE.PlaneGeometry(9,9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}),campus.furnishings.lamps.length);
const lampTransform=new THREE.Object3D();campus.furnishings.lamps.forEach(([x,y,z],index)=>{lampTransform.position.set(x,y,z);lampTransform.rotation.set(0,0,0);lampTransform.updateMatrix();lampBulbs.setMatrixAt(index,lampTransform.matrix);lampTransform.position.y=.29;lampTransform.rotation.x=-Math.PI/2;lampTransform.updateMatrix();lampPools.setMatrixAt(index,lampTransform.matrix);});lampGlow.add(lampBulbs,lampPools);

function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function applyQuality(quality){renderer.setPixelRatio(quality==='low'?1:Math.min(devicePixelRatio,quality==='high'?2:1.5));renderer.shadowMap.enabled=quality!=='low';renderer.setSize(innerWidth,innerHeight);save.patch({quality});$('#quality').value=quality;}
applyQuality(save.data.quality);
function syncSeasonUI(){
 const state=seasons.state;
 document.querySelectorAll('[data-season]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.season===state.season)));
 $('#season-description').textContent=state.baseOnly?'固定建筑、道路与树干':SEASONS[state.season].description;
 $('#base-only').checked=state.baseOnly;$('#animate-season').checked=state.animated;$('#snow-controls').hidden=state.season!=='winter'||state.baseOnly;$('#season-buttons').disabled=state.baseOnly;
 $('#time-of-day').value=state.timeOfDay;$('#time-of-day').disabled=state.baseOnly;
 $('#snow-value').textContent=`${Math.round(state.snowAmount*100)}%`;
 const background=state.baseOnly?'#e7ecdf':state.timeOfDay==='night'?'#172534':state.timeOfDay==='sunset'?'#ead4bd':`#${SEASONS[state.season].sky.toString(16)}`;
 document.documentElement.style.setProperty('--season-bg',background);
 document.body.classList.toggle('night',state.timeOfDay==='night'&&!state.baseOnly);
 ambience.setSeason(state.season);save.patch({season:state.season,timeOfDay:state.timeOfDay});
}
document.querySelectorAll('[data-season]').forEach(button=>button.onclick=()=>{seasons.setSeason(button.dataset.season);syncSeasonUI();});
$('#season-menu').onclick=()=>{const expanded=document.body.classList.toggle('show-seasons');$('#season-menu').setAttribute('aria-expanded',String(expanded));};
$('#base-only').onchange=e=>{seasons.setBaseOnly(e.target.checked);syncSeasonUI();};
$('#animate-season').onchange=e=>{seasons.setAnimated(e.target.checked);syncSeasonUI();};
$('#snow-amount').oninput=e=>{seasons.setSnowAmount(Number(e.target.value)/100);syncSeasonUI();};
$('#time-of-day').onchange=e=>{seasons.setTimeOfDay(e.target.value);syncSeasonUI();};
reducedMotion.addEventListener('change',e=>{seasons.setAnimated(!e.matches);syncSeasonUI();});syncSeasonUI();

function updateProgress(){
 const {visited,completed}=save.data;
 $('#journey-progress').textContent=`校园手记 · ${visited.length} / ${places.length}${completed?' · 已收齐':''}`;
 $('#walk-progress').textContent=`${visited.length} / ${places.length} 处已收藏`;
 $('#start-journey').firstChild.textContent=visited.length?'继续校园漫游 ':'从西门开始漫游 ';
 $('#save-status').textContent=save.available?'已保存在这台设备上':'当前环境无法持久保存，进度仅在本次浏览中保留';
 $('#places-list').replaceChildren();
 places.forEach((place,i)=>{
  const row=document.createElement('div');row.className=`place-row${visited.includes(place.id)?' visited':''}`;
  const number=document.createElement('span');number.className='place-number';number.textContent=visited.includes(place.id)?'✓':String(i+1).padStart(2,'0');
  const text=document.createElement('div'),name=document.createElement('strong'),sub=document.createElement('small');name.textContent=place.name;sub.textContent=place.subtitle;text.append(name,sub);
  const button=document.createElement('button');button.textContent='到此漫游';button.dataset.place=place.id;button.onclick=()=>{$('#handbook').close();startWalking(place.id);setTarget(place.id);};
  row.append(number,text,button);$('#places-list').append(row);
 });
}
updateProgress();
function releasePointer(){if(pointer.isLocked){suppressUnlock=true;pointer.unlock();}}
function openDialog(id){if(mode!=='orbit'){paused=true;keys.clear();releasePointer();ambience.suspend();}const dialog=$(`#${id}`);if(!dialog.open)dialog.showModal();}
function closeDialog(id){$(`#${id}`).close();}
for(const dialog of document.querySelectorAll('dialog')){
 dialog.addEventListener('close',()=>{if(mode!=='orbit'&&!document.querySelector('dialog[open]')){paused=false;ambience.resume();updateControlHint();}});
}
document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>closeDialog(button.dataset.close));
function framing(){camera.far=5000;camera.fov=innerWidth<850?55:38;camera.near=3;camera.updateProjectionMatrix();camera.setViewOffset(innerWidth,innerHeight,innerWidth<850?0:-Math.min(innerWidth*.105,170),innerWidth<850?-innerHeight*.11:0,innerWidth,innerHeight);}
function overview(){
 mode='orbit';paused=false;transition=null;keys.clear();releasePointer();document.body.classList.remove('walking','touch-walk','flying','third-person');avatar.root.visible=false;creative.preview(null);$('#fly').classList.remove('active');orbit.enabled=true;
 $('#orbit').classList.add('active');$('#walk').classList.remove('active');$('#hint').textContent='拖动旋转 · 滚轮缩放 · 右键平移 · 点击建筑查看资料';
 camera.position.set(-710,760,885);if(innerWidth<850)camera.position.multiplyScalar(1.6);orbit.target.set(0,0,0);framing();orbit.update();
 targetRing.visible=false;if(routeLine)routeLine.visible=false;$('#interact').hidden=true;ambience.resume();
}
function requestPointer(){if(touchMode())return;try{const result=pointer.lock();result?.catch?.(()=>toast('可按住画面拖动转向，键盘仍可移动。'));}catch{toast('可按住画面拖动转向，键盘仍可移动。');}}
function startWalking(id='west-gate',captureMouse=true){
 const place=placeById.get(id)||places[0];nearestPlace=place;transition=null;mode='walk';paused=false;keys.clear();orbit.enabled=false;
 document.body.classList.remove('flying');$('#fly').classList.remove('active');document.body.classList.add('walking');document.body.classList.toggle('third-person',thirdPerson);avatar.root.visible=thirdPerson;avatar.root.rotation.y=Math.PI/2;creative.preview(null);document.body.classList.toggle('touch-walk',touchMode());$('#orbit').classList.remove('active');$('#walk').classList.add('active');$('#detail').hidden=true;
 camera.clearViewOffset();camera.far=5000;camera.near=.15;camera.fov=65;camera.updateProjectionMatrix();camera.position.set(place.x,1.75,place.z);
 player.copy(camera.position);jumpVelocity=0;
 const b=campus.buildings.find(b=>b.id===place.building);const view=place.id==='pine-grove'?[place.x,3,place.z-35]:place.id==='sports'?[place.x,1.75,place.z+60]:place.id==='motto'?[place.x-8,1.4,place.z]:[place.x+60,1.75,place.z];camera.lookAt(...(b?[b.x,Math.max(4,b.height*.35),b.z]:view));
 updateControlHint();
 setTarget(id);if(captureMouse)requestPointer();ambience.resume();
}
function setTarget(id){
 const place=placeById.get(id);if(!place)return;targetId=id;const position=mode==='walk'?player:WEST_GATE;
 route=navigation.findPath(position,place);
 if(routeLine){scene.remove(routeLine);routeLine.geometry.dispose();}
 const geometry=new THREE.BufferGeometry().setFromPoints(route.map(p=>new THREE.Vector3(p.x,.85,p.z)));
 routeLine=new THREE.Line(geometry,routeMaterial);routeLine.visible=mode==='walk';scene.add(routeLine);
 targetRing.position.set(place.x,.55,place.z);targetRing.visible=mode==='walk';$('#route-name').textContent=place.name;
 if(!route.length)toast('当前点无法规划路线。可通过校园手册换一个安全起点。');
}
function showPlace(){
 if(!nearestPlace||mode!=='walk'||paused)return;
 const place=nearestPlace,index=places.findIndex(p=>p.id===place.id);save.visit(place.id);updateProgress();
 $('#story-number').textContent=`校园手记 ${String(index+1).padStart(2,'0')} / ${places.length} · ${place.category}`;
 $('#story-name').textContent=place.name;$('#story-subtitle').textContent=place.subtitle;$('#story-body').textContent=place.description;$('#story-source').href=place.source;
 $('#story-next').textContent=save.data.completed?'翻到旅程最后一页':'前往下一处';openDialog('place-story');
}
$('#story-next').onclick=()=>{closeDialog('place-story');if(save.data.completed){openDialog('ending');return;}const next=places.find(p=>!save.data.visited.includes(p.id));setTarget(next.id);toast(`沿金色路线前往${next.name}`);};
$('#interact').onclick=showPlace;
$('#start-journey').onclick=()=>{startWalking();const next=places.find(p=>!save.data.visited.includes(p.id));setTarget(next?.id||'west-gate');if(save.data.sound){ambience.setEnabled(true).then(enabled=>$('#sound-enabled').checked=enabled);}};
$('#walk').onclick=()=>startWalking();$('#orbit').onclick=overview;
$('#map-button').onclick=$('#walk-map').onclick=()=>{updateProgress();openDialog('handbook');};
$('#reset-journey').onclick=()=>{save.resetJourney();updateProgress();setTarget('west-gate');toast('校园手记已清空，画面设置保持不变。');};
$('#pause-button').onclick=()=>openDialog('pause-menu');
$('#resume-walk').onclick=()=>{closeDialog('pause-menu');requestPointer();};
$('#pause-overview').onclick=()=>{overview();closeDialog('pause-menu');};
$('#settings-button').onclick=()=>{openDialog('settings');$('#sound-enabled').checked=ambience.enabled;$('#sound-volume').value=Math.round(save.data.volume*100);};
$('#sound-enabled').onchange=async e=>{const requested=e.target.checked;const enabled=await ambience.setEnabled(requested);e.target.checked=enabled;save.patch({sound:enabled});if(requested&&!enabled)toast('浏览器暂未允许声音，请再次点按开关。');};
$('#sound-volume').oninput=e=>{const volume=Number(e.target.value)/100;ambience.setVolume(volume);save.patch({volume});};
$('#quality').onchange=e=>applyQuality(e.target.value);
$('#sources-button').onclick=()=>openDialog('sources');$('#close-sources').onclick=()=>closeDialog('sources');

function detail(building){$('#detail').hidden=false;$('#detail-category').textContent=building.category;$('#detail-name').textContent=building.name;$('#detail-info').textContent=`${building.evidence.facade}。位置依据校园示意图；高度约 ${building.height} 米，为建模估计值。`;$('#detail-source').hidden=!building.evidence.source;$('#detail-source').href=building.evidence.source||'#';}
function focus(id){if(mode!=='orbit')overview();const b=campus.buildings.find(b=>b.id===id);if(!b)return;transition={start:performance.now(),from:camera.position.clone(),fromTarget:orbit.target.clone(),to:new THREE.Vector3(b.x-125,b.height+135,b.z+145),target:new THREE.Vector3(b.x,b.height*.3,b.z)};detail(b);}
document.querySelectorAll('[data-target]').forEach(el=>el.onclick=()=>focus(el.dataset.target));$('#close-detail').onclick=()=>$('#detail').hidden=true;
$('#top').onclick=()=>{overview();camera.position.set(0,1050,.01);orbit.target.set(0,0,0);orbit.update();};
$('#labels-button').onclick=()=>{labelsOn=!labelsOn;$('#labels-button').setAttribute('aria-pressed',String(labelsOn));};
pointer.addEventListener('unlock',()=>{if(suppressUnlock){suppressUnlock=false;return;}if(mode!=='orbit'&&!document.querySelector('dialog[open]'))openDialog('pause-menu');});
pointer.addEventListener('lock',()=>{if(mode!=='walk'||paused||document.querySelector('dialog[open]')){releasePointer();return;}paused=false;});
document.addEventListener('pointerlockerror',()=>{if(mode==='walk')toast('未捕获鼠标，可按住画面拖动转向。');});
addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 if(e.code==='Escape'&&mode!=='orbit'&&!document.querySelector('dialog[open]')){e.preventDefault();openDialog('pause-menu');return;}
 if(document.querySelector('dialog[open]'))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&mode!=='orbit')e.preventDefault();
 if(e.code==='KeyV'&&!e.repeat&&mode==='walk'){thirdPerson=!thirdPerson;avatar.root.visible=thirdPerson;document.body.classList.toggle('third-person',thirdPerson);updateControlHint();return;}
 if(e.code==='KeyF'&&!e.repeat){if(mode==='fly')landFromFlight();else startFlying();return;}
 if(e.code==='KeyR'&&!e.repeat&&mode==='fly')buildRotation+=Math.PI/2;
 if(e.code==='Space'&&!e.repeat&&mode==='walk'&&player.y<=groundY+.01)jumpVelocity=6.3;
 if(e.code==='KeyE'&&!e.repeat&&mode==='walk')showPlace();else keys.add(e.code);
});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();ambience.suspend();if(mode!=='orbit'&&!document.querySelector('dialog[open]'))openDialog('pause-menu');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();ambience.suspend();}else if(!paused)ambience.resume();});
for(const button of document.querySelectorAll('[data-move]')){
 button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.move);};
 button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>keys.delete(button.dataset.move);
}
let down=null,drag=null;const lookEuler=new THREE.Euler(0,0,0,'YXZ');
renderer.domElement.addEventListener('pointerdown',e=>{renderer.domElement.focus({preventScroll:true});buildPointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);down=[e.clientX,e.clientY];transition=null;if(mode!=='orbit'&&!paused&&!pointer.isLocked){drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}});
renderer.domElement.addEventListener('pointermove',e=>{buildPointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);if(!drag||mode==='orbit'||paused||pointer.isLocked)return;lookEuler.setFromQuaternion(camera.quaternion);lookEuler.y-=(e.clientX-drag.x)*.004;lookEuler.x=THREE.MathUtils.clamp(lookEuler.x-(e.clientY-drag.y)*.004,-1.35,1.35);camera.quaternion.setFromEuler(lookEuler);drag={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{
 drag=null;if(!down)return;const clicked=Math.hypot(e.clientX-down[0],e.clientY-down[1])<5;down=null;
 if(mode==='fly'){if(clicked&&!paused&&e.button===0&&buildTool!=='none')applyBuild();return;}
 if(mode==='walk'){if(clicked&&!paused&&!pointer.isLocked&&!touchMode())requestPointer();return;}
 if(!clicked||e.button!==0)return;raycaster.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1),camera);
 const hit=raycaster.intersectObjects(campus.selectables,true)[0];if(hit){let object=hit.object;while(object&&!object.userData.evidence)object=object.parent;if(object)detail(object.userData);}
});renderer.domElement.addEventListener('pointercancel',()=>{drag=null;down=null;});

const labelIds=[...landmarks,'teaching1','teaching2','gym','dining1','tech'];
const labelItems=labelIds.map(id=>{const b=campus.buildings.find(b=>b.id===id),el=document.createElement('button');el.className='label';el.textContent=b.name.replace('（原主楼）','');el.onclick=()=>focus(id);$('#labels').appendChild(el);return {b,el};});
function savePostcard(){
 renderer.render(scene,camera);const canvas=document.createElement('canvas');canvas.width=renderer.domElement.width;canvas.height=renderer.domElement.height;
 const ctx=canvas.getContext('2d');ctx.drawImage(renderer.domElement,0,0);const scale=canvas.width/1440;
 ctx.fillStyle='#f5f4e7e8';ctx.fillRect(0,canvas.height-110*scale,canvas.width,110*scale);ctx.fillStyle='#315442';ctx.font=`${27*scale}px sans-serif`;ctx.fillText('西土城四季 · 北邮校园漫游',45*scale,canvas.height-62*scale);
 ctx.font=`${13*scale}px sans-serif`;ctx.fillText(`${SEASONS[seasons.state.season].label}日记忆  /  校园手记 ${save.data.visited.length} · ${places.length}  /  公开资料重建，艺术化场景`,45*scale,canvas.height-28*scale);
 canvas.toBlob(blob=>{if(!blob){toast('照片生成失败，请再试一次。');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`西土城四季-${seasons.state.season}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('校园明信片已生成。');});
}
$('#photo-button').onclick=$('#ending-photo').onclick=savePostcard;
let narrowLayout=innerWidth<850;
addEventListener('resize',()=>{const narrow=innerWidth<850;if(mode==='orbit'&&narrow!==narrowLayout){camera.position.sub(orbit.target).multiplyScalar(narrow?1.6:1/1.6).add(orbit.target);}narrowLayout=narrow;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);document.body.classList.toggle('touch-walk',mode!=='orbit'&&touchMode());if(mode==='orbit')framing();});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;$('#loading').hidden=false;$('#loading span').textContent='3D 画面暂时中断，请刷新页面。校园手记已经保存。';});

function updateControlHint(){
 $('#hint').textContent=mode==='fly'?'WASD 飞行 · 空格上升 · Q / Ctrl 下降 · Shift 加速 · F 落地 · R 旋转物件':touchMode()?'方向按钮移动 · 拖动画面转向 · 点按地点提示':`WASD 行走 · Shift 奔跑 · 空格跳跃 · V ${thirdPerson?'第一':'第三'}人称 · F 飞行 · Esc 暂停`;
 $('#perspective').textContent=thirdPerson?'切换第一人称':'切换第三人称';
}
function startFlying(){
 const fromWalk=mode==='walk';releasePointer();mode='fly';paused=false;transition=null;keys.clear();orbit.enabled=false;avatar.root.visible=false;
 document.body.classList.remove('third-person');document.body.classList.add('walking','flying');document.body.classList.toggle('touch-walk',touchMode());
 if(fromWalk){camera.position.copy(player);camera.position.y+=18;}else{camera.position.set(-200,160,260);camera.lookAt(20,0,30);}
 camera.clearViewOffset();camera.near=.15;camera.far=5000;camera.fov=65;camera.updateProjectionMatrix();
 $('#fly').classList.add('active');$('#orbit').classList.remove('active');$('#walk').classList.remove('active');$('#detail').hidden=true;$('#interact').hidden=true;
 targetRing.visible=false;if(routeLine)routeLine.visible=false;updateControlHint();toast('自由飞行已开启。按住画面拖动转向；选择物件后点地面放置。');
}
function landFromFlight(){
 let target=null;const obstacles=[...campus.colliders,...creative.colliders];
 // Search outward to avoid dropping the player inside a building or personal prop.
 for(let radius=0;radius<90&&!target;radius+=2)for(let i=0;i<24;i++){
  const p={x:camera.position.x+Math.cos(i*Math.PI/12)*radius,z:camera.position.z+Math.sin(i*Math.PI/12)*radius};
  if(navigation.segmentClear(p,p)&&!obstacles.some(c=>p.x>c.minX-1&&p.x<c.maxX+1&&p.z>c.minZ-1&&p.z<c.maxZ+1)){target=p;break;}
 }
 if(!target){toast('附近没有可落脚地面，请飞回校园内再落地。');return;}
 const rotation=camera.quaternion.clone();startWalking(targetId,false);player.set(target.x,groundY,target.z);camera.position.copy(player);camera.quaternion.copy(rotation);setTarget(targetId);toast('已回到附近安全地面。');
}
function updateBuildPreview(){
 buildPoint=null;if(buildTool==='none'||buildTool==='remove'){creative.preview(null);return;}
 raycaster.setFromCamera(buildPointer,camera);const point=new THREE.Vector3();
 if(raycaster.ray.intersectPlane(groundPlane,point)&&Math.abs(point.x)<250&&Math.abs(point.z)<375){buildPoint={type:buildTool,x:Math.round(point.x),z:Math.round(point.z),rotation:buildRotation};}
 creative.preview(buildPoint);
}
function applyBuild(){
 if(buildTool==='remove'){raycaster.setFromCamera(buildPointer,camera);const hit=raycaster.intersectObjects(creative.group.children,true)[0];if(hit){let obj=hit.object;while(obj.parent!==creative.group)obj=obj.parent;creative.remove(obj.userData.index);}else toast('点选你添加的物件即可移除。');return;}
 updateBuildPreview();if(!buildPoint||!creative.add(buildPoint))toast('请选择校园内的空地，避开建筑和已有物件；最多放置 160 件。');
}
$('#fly').onclick=$('#fly-shortcut').onclick=startFlying;
$('#land').onclick=landFromFlight;
$('#perspective').onclick=()=>{thirdPerson=!thirdPerson;avatar.root.visible=thirdPerson;document.body.classList.toggle('third-person',thirdPerson);updateControlHint();};
$('#return-overview').onclick=overview;
$('#build-tool').onchange=e=>{buildTool=e.target.value;creative.preview(null);};
$('#rotate-prop').onclick=()=>buildRotation+=Math.PI/2;
$('#undo-prop').onclick=()=>{if(!creative.undo())toast('暂时没有可撤销的编辑。');};
$('#export-props').onclick=()=>{const url=URL.createObjectURL(new Blob([creative.export()],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='北邮-我的场景.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

const clock=new THREE.Clock(),projected=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3(),velocity=new THREE.Vector3();
let initialized=false;
function animate(){
 requestAnimationFrame(animate);if(document.hidden)return;const elapsed=Math.min(clock.getDelta(),.25),dt=Math.min(elapsed,.1);let moving=false;
 if(transition){const t=Math.min(1,(performance.now()-transition.start)/(reducedMotion.matches?1:1000)),ease=1-(1-t)**3;camera.position.lerpVectors(transition.from,transition.to,ease);orbit.target.lerpVectors(transition.fromTarget,transition.target,ease);if(t===1)transition=null;}
 if(mode==='orbit')orbit.update();
 else if(!paused){
  camera.getWorldDirection(forward);if(mode==='walk')forward.y=0;forward.normalize();right.crossVectors(forward,camera.up).normalize();
  const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const r=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
  velocity.copy(forward).multiplyScalar(f).addScaledVector(right,r);
  if(mode==='fly')velocity.y+=Number(keys.has('Space'))-Number(keys.has('ControlLeft')||keys.has('ControlRight')||keys.has('KeyQ'));
  velocity.normalize().multiplyScalar((mode==='fly'?(sprint?100:32):(sprint?9:4.5))*dt);
  if(mode==='fly'){
   camera.position.add(velocity);camera.position.x=THREE.MathUtils.clamp(camera.position.x,-700,700);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-850,850);camera.position.y=THREE.MathUtils.clamp(camera.position.y,2,800);
   $('#altitude').textContent=`高度 ${Math.round(camera.position.y)} m`;
   updateBuildPreview();
  }else{
   const obstacles=creative.count?[...campus.colliders,...creative.colliders]:campus.colliders;
   const next=moveWithCollisions(player,velocity.x,velocity.z,obstacles);moving=Math.hypot(next.x-player.x,next.z-player.z)>.001;
   player.x=next.x;player.z=next.z;jumpVelocity-=18*dt;player.y=Math.max(groundY,player.y+jumpVelocity*dt);if(player.y===groundY)jumpVelocity=0;
   avatar.update(dt,player,velocity,moving,sprint);
   camera.position.copy(player);
   if(thirdPerson){
    camera.getWorldDirection(forward);const boom=forward.clone().multiplyScalar(-6.5);boom.y+=1.15;
    const origin=player.clone();origin.y+=.35;
    raycaster.set(origin,boom.clone().normalize());raycaster.far=boom.length();
    const hit=raycaster.intersectObjects(campus.base.children,true)[0];
    camera.position.copy(origin).addScaledVector(boom,hit?Math.max(.05,(hit.distance-.35)/boom.length()):1);camera.position.y=Math.max(.55,camera.position.y);raycaster.far=Infinity;
   }
  }
 }
 if(mode==='walk'){
  const target=placeById.get(targetId),distance=Math.hypot(player.x-target.x,player.z-target.z);
  $('#route-distance').textContent=distance<7?'已经到达 · 查看地点，收下手记':`距离约 ${Math.round(distance)} 米 · 沿金色路线前行`;
  nearestPlace=places.reduce((best,p)=>{const d=Math.hypot(player.x-p.x,player.z-p.z);return d<7&&(!best||d<Math.hypot(player.x-best.x,player.z-best.z))?p:best;},null);
  $('#interact').hidden=!nearestPlace||paused;if(nearestPlace)$('#interact-text').textContent=`${save.data.visited.includes(nearestPlace.id)?'重读':'收藏'} · ${nearestPlace.name}`;
  nextMapUpdate+=elapsed;if(nextMapUpdate>.15){nextMapUpdate=0;camera.getWorldDirection(forward);minimap.draw({x:player.x,z:player.z,heading:Math.atan2(forward.x,-forward.z),target:targetId,path:route,visited:save.data.visited});}
 }
 camera.updateMatrixWorld();
 const north=new THREE.Vector3(0,0,-100).project(camera),center=new THREE.Vector3().project(camera);$('.compass svg').style.transform=`rotate(${Math.atan2((north.x-center.x)*innerWidth,(north.y-center.y)*innerHeight)}rad)`;
 const occupied=[];
 for(const {b,el}of labelItems){
  projected.set(b.x,b.height+5,b.z).project(camera);const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;
  const blockedByPanel=x>innerWidth-270&&y>265&&y<650;
  const visible=labelsOn&&mode==='orbit'&&projected.z<1&&projected.z>-1&&x>Math.min(350,innerWidth*.3)&&x<innerWidth-25&&y>110&&y<innerHeight-125&&!blockedByPanel&&!occupied.some(p=>Math.abs(p.x-x)<105&&Math.abs(p.y-y)<32);
  el.style.display=visible?'block':'none';if(visible){el.style.left=`${x}px`;el.style.top=`${y}px`;occupied.push({x,y});}
 }
 if(mode==='orbit'){const viewDistance=camera.position.distanceTo(orbit.target);scene.fog.near=Math.max(250,viewDistance*.95);scene.fog.far=Math.max(1400,viewDistance+1800);}else{scene.fog.near=180;scene.fog.far=950;}
 seasons.update(paused?0:elapsed);
 const shadowSpan=mode==='walk'?100:500;const shadowX=mode==='walk'?player.x:0,shadowZ=mode==='walk'?player.z:0;sun.position.x=shadowX-240;sun.position.z=shadowZ+180;sun.target.position.set(shadowX,0,shadowZ);sun.target.updateMatrixWorld();if(sun.shadow.camera.right!==shadowSpan){Object.assign(sun.shadow.camera,{left:-shadowSpan,right:shadowSpan,top:shadowSpan,bottom:-shadowSpan});sun.shadow.camera.updateProjectionMatrix();}
 atmosphere.update(paused?0:elapsed,camera,seasons.state);lampGlow.visible=seasons.state.timeOfDay!=='day'&&!seasons.state.baseOnly;ambience.update(paused?0:elapsed,moving&&!paused);
 renderer.render(scene,camera);if(!initialized){initialized=true;$('#loading').hidden=true;}
}
overview();animate();
window.campusPreview={get stats(){return {buildings:campus.buildings.length,colliders:campus.colliders.length,trees:campus.trees.length,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,mode,paused,pointerLocked:pointer.isLocked,nearest:nearestPlace?.id||null,position:{x:mode==='walk'?player.x:camera.position.x,y:mode==='walk'?player.y:camera.position.y,z:mode==='walk'?player.z:camera.position.z},cameraPosition:camera.position.toArray(),thirdPerson,creativeCount:creative.count,target:targetId,visited:save.data.visited,seasons:seasons.state};}};
