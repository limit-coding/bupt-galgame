import {placeById} from './places.js';
const KEY='bupt-campus-journey-v1';
export const defaults=()=>({version:1,visited:[],season:'summer',sound:false,volume:.35,quality:'balanced',timeOfDay:'day',completed:false});
export function sanitizeSave(value){const clean=defaults();if(!value||typeof value!=='object'||value.version!==1)return clean;
 if(Array.isArray(value.visited))clean.visited=[...new Set(value.visited.filter(id=>placeById.has(id)))];
 if(['spring','summer','autumn','winter'].includes(value.season))clean.season=value.season;
 if(['day','sunset','night'].includes(value.timeOfDay))clean.timeOfDay=value.timeOfDay;
 if(['balanced','high','low'].includes(value.quality))clean.quality=value.quality;
 if(typeof value.sound==='boolean')clean.sound=value.sound;
 if(Number.isFinite(value.volume))clean.volume=Math.max(0,Math.min(1,value.volume));
 clean.completed=clean.visited.length===placeById.size;
 return clean;
}
export function createSave(storage){let available=Boolean(storage);let data=defaults();
 try{const raw=storage?.getItem(KEY);if(raw){try{data=sanitizeSave(JSON.parse(raw));}catch{data=defaults();}}}catch{available=false;}
 function persist(){try{storage?.setItem(KEY,JSON.stringify(data));available=Boolean(storage);}catch{available=false;}}
 return {get data(){return structuredClone(data);},get available(){return available;},patch(partial){data=sanitizeSave({...data,...partial});persist();return this.data;},visit(id){if(placeById.has(id)){data=sanitizeSave({...data,visited:[...data.visited,id]});persist();}return this.data;},resetJourney(){data.visited=[];data.completed=false;persist();return this.data;}};
}
