import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {api} from './api.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=path.resolve(process.env.GUGU_DATA_DIR||path.join(root,'.local-data'));
await fs.mkdir(data,{recursive:true});
let setupKey=process.env.SETUP_KEY;
if(!setupKey){try{setupKey=await fs.readFile(path.join(data,'setup-key'),'utf8')}catch{setupKey=crypto.randomUUID()+crypto.randomUUID();await fs.writeFile(path.join(data,'setup-key'),setupKey,{mode:0o600})}}
const filename=k=>path.join(data,encodeURIComponent(k)+'.json');
const store={async get(k){try{return JSON.parse(await fs.readFile(filename(k),'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}},async put(k,v){const tmp=filename(k)+'.'+crypto.randomUUID();await fs.writeFile(tmp,JSON.stringify(v),{mode:0o600});await fs.rename(tmp,filename(k))},async delete(k){await fs.rm(filename(k),{force:true})},async list(prefix){const names=(await fs.readdir(data)).filter(n=>n.endsWith('.json')&&decodeURIComponent(n.slice(0,-5)).startsWith(prefix));return Promise.all(names.map(n=>fs.readFile(path.join(data,n),'utf8').then(JSON.parse)))}};
const mimes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const port=Number(process.env.PORT||8765);
http.createServer(async(req,res)=>{try{
  const host=req.headers.host||`127.0.0.1:${port}`;
  if(!new Set([`127.0.0.1:${port}`,`localhost:${port}`]).has(host)){res.writeHead(403);return res.end('Use localhost')}
  const url=new URL(req.url,`http://${host}`);let chunks=[],size=0;
  for await(const chunk of req){size+=chunk.length;if(size>18000000){res.writeHead(413);res.end();return}chunks.push(chunk)}
  const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  let response;
  if(url.pathname==='/local-setup'&&req.method==='GET'){response=new Response(null,{status:302,headers:{Location:'/deliver#setup='+setupKey}})}
  else response=await api(request,store,{SETUP_KEY:setupKey});
  if(!response){const route=url.pathname==='/'?'index.html':url.pathname==='/deliver'?'deliver.html':url.pathname.slice(1);if(!['index.html','deliver.html','style.css','v3.css','app.js','v3.js','admin.js','admin.css','playlist.js','deliveries.js'].includes(route)){response=new Response('Not found',{status:404})}else{response=new Response(await fs.readFile(path.join(root,'web',route)),{headers:{'Content-Type':mimes[path.extname(route)]||'text/plain','Cache-Control':'no-cache'}})}}
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch{res.writeHead(500);res.end('Server error')}}).listen(port,'127.0.0.1',()=>console.log(`房间：http://127.0.0.1:${port}/\n投递入口：http://127.0.0.1:${port}/deliver\n首次设置：http://127.0.0.1:${port}/local-setup`));
