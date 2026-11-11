import {roads,toWorld} from './campus-data.js';
import {places} from './places.js';
export function createMinimap(canvas,buildings){
 const ctx=canvas.getContext('2d');const width=220,height=310;canvas.width=width*2;canvas.height=height*2;
 const project=(x,z)=>[12+(x+260)/520*(width-24),12+(z+390)/780*(height-24)];
 return {draw({x,z,heading,target,path=[],visited=[]}){
 ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#eef0e5';ctx.fillRect(0,0,width,height);
 ctx.strokeStyle='#cbd1c3';ctx.lineWidth=3;for(const [a,b]of roads){ctx.beginPath();ctx.moveTo(...project(...toWorld(...a)));ctx.lineTo(...project(...toWorld(...b)));ctx.stroke();}
 ctx.fillStyle='#b9c4b1';for(const b of buildings){const [bx,bz]=project(b.x-b.width/2,b.z-b.depth/2),[ex,ez]=project(b.x+b.width/2,b.z+b.depth/2);ctx.fillRect(bx,bz,ex-bx,ez-bz);}
 if(path.length){ctx.strokeStyle='#cc9655';ctx.lineWidth=2.5;ctx.setLineDash([4,3]);ctx.beginPath();path.forEach((p,i)=>{const q=project(p.x,p.z);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.stroke();ctx.setLineDash([]);}
 for(const place of places){const [px,pz]=project(place.x,place.z);ctx.beginPath();ctx.arc(px,pz,place.id===target?5:2.5,0,Math.PI*2);ctx.fillStyle=place.id===target?'#bb8547':visited.includes(place.id)?'#557b5c':'#f9faf3';ctx.fill();ctx.strokeStyle='#667c62';ctx.lineWidth=1;ctx.stroke();}
 const [px,pz]=project(x,z);ctx.save();ctx.translate(px,pz);ctx.rotate(heading);ctx.fillStyle='#254d3e';ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,5);ctx.lineTo(0,2);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();ctx.fillStyle='#667b5e';ctx.font='10px sans-serif';ctx.fillText('北 N',12,13);
 }};
}
