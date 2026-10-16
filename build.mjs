import fs from 'node:fs/promises';
const files=['index.html','deliver.html','style.css','v3.css','app.js','v3.js','admin.js','admin.css','playlist.js'];
const assets=Object.fromEntries(await Promise.all(files.map(async name=>[name,await fs.readFile('web/'+name,'utf8')])));
const api=(await fs.readFile('server/api.mjs','utf8')).replace('export async function api','async function api');
const handler=`
const assets=${JSON.stringify(assets)};
const mimes={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
export default {async fetch(request,env){
 const url=new URL(request.url);
 const store={async get(k){const obj=await env.BUCKET.get(k);return obj?obj.json():null},async put(k,v){await env.BUCKET.put(k,JSON.stringify(v),{httpMetadata:{contentType:'application/json'}})},async delete(k){await env.BUCKET.delete(k)},async list(prefix){let cursor,values=[];do{const page=await env.BUCKET.list({prefix,cursor,limit:500});const records=await Promise.all(page.objects.map(o=>this.get(o.key)));values.push(...records.filter(Boolean));cursor=page.truncated?page.cursor:undefined}while(cursor);return values}};
 if(url.pathname.startsWith('/api/')){if(!env.BUCKET)return new Response(JSON.stringify({error:'存储尚未连接'}),{status:503,headers:{'Content-Type':'application/json'}});return api(request,store,env)}
 const file=url.pathname==='/'?'index.html':url.pathname==='/deliver'?'deliver.html':url.pathname.slice(1);
 if(!Object.hasOwn(assets,file))return new Response('Not found',{status:404});
 return new Response(assets[file],{headers:{'Content-Type':mimes[file.split('.').pop()]||'text/plain','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'"}})
}};
`;
await fs.mkdir('dist/server',{recursive:true});await fs.mkdir('dist/.openai',{recursive:true});
await fs.writeFile('dist/server/index.js',api+'\n'+handler);
await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built Worker with embedded room, delivery page and persistent storage API.');
