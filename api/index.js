import { api } from '../server/api.mjs';
import { cloudStore } from '../server/supabase.mjs';
const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const allowed=/^(image\/(png|jpeg|webp)|audio\/(mpeg|mp4|wav|x-wav|ogg|webm))$/;
export async function handle(request,env=process.env,providedStore){
 try{
  const url=new URL(request.url),path=url.pathname;
  const store=providedStore||cloudStore(env);
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return reply({error:'请从本站投递页操作'},403);
  if(path==='/api/admin/status'&&request.method==='GET'){
   const r=await api(request,store,env);return reply({...await r.json(),directUpload:true},r.status);
  }
  if(path.startsWith('/api/media/')&&request.method==='GET'){
   const id=path.split('/').pop();if(!/^[\w-]{20,50}$/.test(id))return reply({error:'未找到'},404);
   const media=await store.get('media/'+id);if(!media?.objectPath)return reply({error:'未找到'},404);
   return new Response(null,{status:302,headers:{Location:await store.signRead(media.objectPath),'Cache-Control':'no-store'}});
  }
  if(path==='/api/admin/upload'&&request.method==='POST'||path==='/api/admin/entries'&&request.method==='POST'){
   const check=await api(new Request(url.origin+'/api/admin/status',{headers:request.headers}),store,env);
   if(!(await check.json()).authorized)return reply({error:'请先登录投递页'},401);
   const raw=await request.text();if(raw.length>100000)return reply({error:'请通过文件上传入口投递'},413);
   const body=JSON.parse(raw);
   if(path.endsWith('/upload')){
    if(!allowed.test(body.mime)||!Number.isInteger(body.size)||body.size<1||body.size>12582912)return reply({error:'请选择 12 MB 以内的图片或音频'},400);
    const id=crypto.randomUUID(),objectPath='pending/'+id;
    const signedUrl=await store.signUpload(objectPath);
    await store.put('uploads/'+id,{objectPath,mime:body.mime,size:body.size,expires:Date.now()+2*3600000});
    return reply({uploadId:id,signedUrl});
   }
   let pending;
   if(body.uploadId){
    if(!/^[\w-]{20,50}$/.test(body.uploadId))return reply({error:'上传编号无效'},400);
    pending=await store.get('uploads/'+body.uploadId);
    if(!pending||pending.expires<Date.now())return reply({error:'上传已过期，请重新选择文件'},400);
    const bytes=await store.readUpload(pending.objectPath);
    if(bytes.length!==pending.size)return reply({error:'文件未完整上传，请重试'},400);
    body.media='data:'+pending.mime+';base64,'+bytes.toString('base64');
   }else if(body.media)return reply({error:'请使用云端文件上传入口'},400);
   const forwarded=new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json',Origin:url.origin,Cookie:request.headers.get('cookie')||''},body:JSON.stringify(body)});
   const result=await api(forwarded,store,env);
   if(result.ok&&pending){try{await store.removeObject(pending.objectPath);await store.delete('uploads/'+body.uploadId)}catch{/* Published entry remains valid; orphan can be removed in Storage. */}}
   return result;
  }
  return await api(request,store,env)||reply({error:'未找到'},404);
 }catch{return reply({error:'云端暂时未连接。请检查 Supabase 初始化和 Vercel 环境变量。'},503)}
}
export default {fetch:request=>handle(request)};
