import { mkdir,writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildCampus } from '../src/campus-model.js';
// GLTFExporter only needs FileReader for its output buffers; no textures or DOM.
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();});}};
const {root,base,colliders}=buildCampus();const glb=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});await mkdir('public/models',{recursive:true});await writeFile('public/models/bupt-haidian.glb',Buffer.from(glb));await writeFile('public/models/colliders.json',JSON.stringify({units:'approximate meters',axes:'+X east, +Y up, -Z north',colliders},null,2));console.log(`Exported ${(glb.byteLength/1024/1024).toFixed(2)} MB GLB and ${colliders.length} collision boxes.`);

const baseGlb=await new GLTFExporter().parseAsync(base,{binary:true,onlyVisible:true});await writeFile('public/models/bupt-haidian-base.glb',Buffer.from(baseGlb));console.log(`Exported permanent core: ${(baseGlb.byteLength/1024/1024).toFixed(2)} MB, without seasonal foliage or weather.`);
