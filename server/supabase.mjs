// Server-only credentials. The browser receives short-lived, object-scoped URLs.
export function cloudStore(env,fetcher=fetch){
 const base=env.SUPABASE_URL?.replace(/\/$/,'');
 const secret=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!secret)throw Error('请先配置 Supabase 环境变量');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base))throw Error('Supabase 项目网址格式不正确');
 const headers={apikey:secret,Authorization:'Bearer '+secret};
 async function call(path,options={}){
  const r=await fetcher(base+path,{...options,headers:{...headers,...options.headers}});
  if(!r.ok)throw Error('云端存储未就绪，请检查 SQL 初始化和环境变量');
  return r;
 }
 const table='/rest/v1/gugu_records';
 const store={
  async get(key){const r=await call(table+'?key=eq.'+encodeURIComponent(key)+'&select=value');return (await r.json())[0]?.value??null},
  async put(key,value){
   if(key.startsWith('media/')){
    const bytes=Buffer.from(value.base64,'base64');
    await call('/storage/v1/object/gugu-media/'+key,{method:'POST',headers:{'Content-Type':value.mime,'x-upsert':'false'},body:bytes});
    value={mime:value.mime,objectPath:key};
   }
   await call(table,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({key,value})});
  },
  async list(prefix){let result=[];for(let offset=0;;offset+=500){const r=await call(table+'?key=like.'+encodeURIComponent(prefix+'*')+'&select=value&order=key&limit=500&offset='+offset);const page=await r.json();result.push(...page.map(x=>x.value));if(page.length<500)return result}},
  async delete(key){if(key.startsWith('media/'))await store.removeObject(key);await call(table+'?key=eq.'+encodeURIComponent(key),{method:'DELETE'})},
  async removeObject(path){await call('/storage/v1/object/gugu-media',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})})},
  async signUpload(path){const r=await call('/storage/v1/object/upload/sign/gugu-media/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const data=await r.json();return base+'/storage/v1'+data.url},
  async signRead(path){const r=await call('/storage/v1/object/sign/gugu-media/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});return base+'/storage/v1'+(await r.json()).signedURL},
  async readUpload(path){const r=await call('/storage/v1/object/authenticated/gugu-media/'+path);const reader=r.body.getReader();let size=0;const parts=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>12582912){await reader.cancel();throw Error('文件超过 12 MB')}parts.push(value)}return Buffer.concat(parts)}
 };
 return store;
}
