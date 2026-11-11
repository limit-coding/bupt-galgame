import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.CAMPUS_PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.glb':'model/gltf-binary','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 try{
  const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+(requestPath==='/'?'/index.html':requestPath));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
  const info=await stat(file);if(!info.isFile()){res.writeHead(404);res.end('Not found');return;}
  const contents=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':contents.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(contents);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('File not found');}
});
function openBrowser(url){if(!process.argv.includes('--open'))return;const command=process.platform==='darwin'?'open':process.platform==='win32'?'explorer':'xdg-open';const child=spawn(command,[url],{stdio:'ignore'});child.on('error',()=>{});}
server.on('error',error=>{
 if(error.code!=='EADDRINUSE'){console.error(error.message);process.exitCode=1;return;}
 const url=`http://127.0.0.1:${port}`;const fail=()=>{console.error(`端口 ${port} 已被其他程序占用。可设置 CAMPUS_PORT 选择其他端口。`);process.exitCode=1;};
 const probe=http.get(url,response=>{let content='';response.setEncoding('utf8');response.on('data',chunk=>{content+=chunk;if(content.length>65536)response.destroy();});response.on('end',()=>{if(content.includes('<title>西土城四季 · 北邮校园漫游</title>')){console.log(`西土城四季已在运行：${url}`);openBrowser(url);}else fail();});response.on('error',fail);});probe.setTimeout(2000,()=>probe.destroy());probe.on('error',fail);
});
server.listen(port,'127.0.0.1',()=>{const url=`http://127.0.0.1:${port}`;console.log(`西土城四季已启动：${url}\n关闭此窗口或按 Ctrl+C 停止。`);openBrowser(url);});
