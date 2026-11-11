import {canWalk} from './campus-model.js';

export function moveWithCollisions(position,dx,dz,colliders,radius=.65){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
 let x=position.x,z=position.z;
 for(let i=0;i<steps;i++){
  if(canWalk(x+dx/steps,z,colliders,radius))x+=dx/steps;
  if(canWalk(x,z+dz/steps,colliders,radius))z+=dz/steps;
 }
 return {x,z};
}

class MinHeap{
 constructor(){this.items=[];}
 push(node){const a=this.items;let i=a.length;a.push(node);while(i>0){const p=(i-1)>>1;if(a[p].score<=node.score)break;a[i]=a[p];i=p;}a[i]=node;}
 pop(){const a=this.items,result=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1].score<a[child].score)child++;if(a[child].score>=last.score)break;a[i]=a[child];i=child;}a[i]=last;}return result;}
 get length(){return this.items.length;}
}

export function createNavigation(colliders){
 const step=2.5,minX=-255,minZ=-380,width=205,depth=305,total=width*depth;
 const free=new Uint8Array(total);
 const point=id=>({x:minX+(id%width)*step,z:minZ+Math.floor(id/width)*step});
 for(let i=0;i<total;i++){const p=point(i);free[i]=Number(canWalk(p.x,p.z,colliders,.95));}
 function segmentClear(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.4));for(let i=0;i<=n;i++)if(!canWalk(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,colliders,.8))return false;return true;}
 function nearest(p){
  const col=Math.round((p.x-minX)/step),row=Math.round((p.z-minZ)/step);
  for(let radius=0;radius<=12;radius++){
   let best=-1,distance=Infinity;
   for(let y=row-radius;y<=row+radius;y++)for(let x=col-radius;x<=col+radius;x++){
    if(x<0||x>=width||y<0||y>=depth||Math.max(Math.abs(x-col),Math.abs(y-row))!==radius)continue;
    const id=y*width+x;if(!free[id])continue;const next=point(id),d=Math.hypot(p.x-next.x,p.z-next.z);
    if(d<distance&&segmentClear(p,next)){best=id;distance=d;}
   }if(best>=0)return best;
  }return -1;
 }
 function findPath(start,end){
  if(!canWalk(start.x,start.z,colliders,.8)||!canWalk(end.x,end.z,colliders,.8))return [];
  if(segmentClear(start,end))return [{...start},{...end}];
  const from=nearest(start),to=nearest(end);if(from<0||to<0)return [];
  const costs=new Float64Array(total);costs.fill(Infinity);costs[from]=0;const parent=new Int32Array(total);parent.fill(-1);const closed=new Uint8Array(total);
  const heap=new MinHeap(),target=point(to);const heuristic=id=>{const p=point(id);return Math.hypot(p.x-target.x,p.z-target.z);};heap.push({id:from,score:heuristic(from)});
  let found=false;
  while(heap.length){const current=heap.pop().id;if(closed[current])continue;if(current===to){found=true;break;}closed[current]=1;
   const col=current%width,row=Math.floor(current/width);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const x=col+dx,y=row+dy;if(x<0||x>=width||y<0||y>=depth)continue;
    const next=y*width+x;if(!free[next]||closed[next])continue;
    if(dx&&dy&&(!free[row*width+x]||!free[y*width+col]))continue;
    const cost=costs[current]+step*Math.hypot(dx,dy);if(cost>=costs[next])continue;
    // Grid vertices alone are insufficient for slender obstacles such as lamp posts.
    if(!segmentClear(point(current),point(next)))continue;
    parent[next]=current;costs[next]=cost;heap.push({id:next,score:cost+heuristic(next)});
   }
  }
  if(!found)return [];
  const path=[{...end}];for(let id=to;id!==from;id=parent[id]){if(id<0)return [];path.push(point(id));}path.push(point(from),{...start});path.reverse();
  const smooth=[path[0]];let index=0;
  while(index<path.length-1){let next=path.length-1;while(next>index+1&&!segmentClear(path[index],path[next]))next--;smooth.push(path[next]);index=next;}
  return smooth;
 }
 return {findPath,segmentClear};
}
