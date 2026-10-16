// Shared backend for local Node and hosted Worker. No visitor event routes or logs.
const enc=new TextEncoder();
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const hex=b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0};
async function hash(password,salt){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
async function signature(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,enc.encode(value)))}
const slots=['sill','box','pocket','art','drawer','record','airdrop','tactical'];
const phases=['all','morning','day','evening','night'];
const types=['text','photo','drawing','audio','note','record','meme','egg'];
async function read(request){const length=Number(request.headers.get('content-length'));if(length>18000000)throw new Error('文件太大，请选择 12 MB 以内的文件');const text=await request.text();if(text.length>18000000)throw new Error('文件太大');try{return JSON.parse(text)}catch{throw new Error('内容格式不正确')}}
export async function api(request,store,env={}){const url=new URL(request.url),path=url.pathname,method=request.method,secure=url.protocol==='https:'?'; Secure':'';
  if(!path.startsWith('/api/'))return null;
  try{
    if(!['GET','HEAD'].includes(method)&&request.headers.get('Origin')!==url.origin)return json({error:'请从本站投递页操作'},403);
    if(path==='/api/room'&&method==='GET'){
      const [rawEntries,settingsValue,rawSignals]=await Promise.all([store.list('entries/'),store.get('settings'),store.list('signals/')]);
      const entries=rawEntries.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));const settings=settingsValue||{};const signals=rawSignals.filter(item=>Date.now()-Number(item.createdAt)<15000);
      return json({entries:entries.map(({createdAt,...entry})=>entry),birthday:settings.birthday||'',signals});
    }
    if(path.startsWith('/api/media/')&&method==='GET'){
      const id=path.split('/').pop();if(!/^[\w-]{20,50}$/.test(id))return json({error:'未找到'},404);
      const media=await store.get('media/'+id);if(!media)return json({error:'未找到'},404);
      if(media.objectPath&&typeof store.signRead==='function'){const signed=await store.signRead(media.objectPath);return Response.redirect(signed,302)}
      if(!media.base64)return json({error:'文件内容暂未就绪'},503);
      return new Response(Uint8Array.from(atob(media.base64),c=>c.charCodeAt(0)),{headers:{'Content-Type':media.mime,'Cache-Control':'public,max-age=86400,stale-while-revalidate=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
    }
    const auth=await store.get('admin-auth');
    const cookie=request.headers.get('cookie')?.match(/(?:^|;\s*)gugu_admin=([^;]+)/)?.[1]||'';
    const [expiry,sig]=cookie.split('.');
    const authorized=!!(auth&&Number(expiry)>Date.now()&&equal(sig,await signature(expiry,auth.sessionKey)));
    if(path==='/api/admin/status'&&method==='GET')return json({configured:!!auth,authorized});
    if(path==='/api/admin/setup'&&method==='POST'){
      if(auth)return json({error:'已经设置过密码，请登录'},409);
      const body=await read(request);
      if(!env.SETUP_KEY||!equal(body.setupKey,env.SETUP_KEY))return json({error:'需要创建者的初始化链接'},403);
      if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)return json({error:'密码需为 12–128 个字符'},400);
      const salt=crypto.randomUUID();await store.put('admin-auth',{salt,passwordHash:await hash(body.password,salt),sessionKey:crypto.randomUUID()+crypto.randomUUID()});return json({ok:true});
    }
    if(path==='/api/admin/login'&&method==='POST'){
      if(!auth)return json({error:'请先设置投递密码'},409);
      const body=await read(request);
      if(typeof body.password!=='string'||body.password.length>128||!equal(await hash(body.password,auth.salt),auth.passwordHash))return json({error:'密码不正确'},401);
      const exp=String(Date.now()+8*3600000);return json({ok:true},200,{'Set-Cookie':`gugu_admin=${exp}.${await signature(exp,auth.sessionKey)}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`});
    }
    if(!authorized)return json({error:'请先登录投递页'},401);
    if(path==='/api/admin/want-you'&&method==='POST'){const id=crypto.randomUUID();await store.put('signals/'+id,{id,text:'想你啦',createdAt:Date.now()});return json({ok:true});}
    if(path==='/api/admin/logout'&&method==='POST')return json({ok:true},200,{'Set-Cookie':`gugu_admin=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0${secure}`});
    if(path==='/api/admin/entries'&&method==='GET')return json({entries:await store.list('entries/'),settings:await store.get('settings')||{}});
    if(path==='/api/admin/settings'&&method==='PUT'){
      const {birthday}=await read(request);if(birthday&&!/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(birthday))return json({error:'请选择月份和日期'},400);
      if(birthday){const [m,d]=birthday.split('-').map(Number);if(new Date(2000,m-1,d).getMonth()!==m-1)return json({error:'日期不存在'},400)}
      await store.put('settings',{birthday:birthday||''});return json({ok:true});
    }
    if(path==='/api/admin/entries'&&method==='POST'){
      const body=await read(request);if(!slots.includes(body.slot)||!phases.includes(body.phase)||!types.includes(body.type))return json({error:'请选择有效落点和类型'},400);
      const text=String(body.text||'').slice(0,3000),title=String(body.title||'').slice(0,100);
      if(!text&&!body.media)return json({error:'放一点文字或文件再投递'},400);
      let mediaId=null,mime=null;
      if(body.media){
        const match=/^data:(image\/(?:png|jpeg|webp)|audio\/(?:mpeg|mp4|wav|x-wav|ogg|webm))(?:;codecs=[\w.-]+)?;base64,([A-Za-z0-9+/=]+)$/.exec(body.media);
        if(!match||match[2].length>16777216)return json({error:'仅支持 PNG/JPG/WebP 图片和常见音频，最大 12 MB'},400);
        let bytes;try{bytes=atob(match[2])}catch{return json({error:'文件内容损坏'},400)}
        if(bytes.length>12582912)return json({error:'文件超过 12 MB'},400);
        mime=match[1];if(mime==='image/png'&&!bytes.startsWith('\x89PNG'))return json({error:'PNG 格式错误'},400);
        if(mime==='image/jpeg'&&!bytes.startsWith('\xff\xd8'))return json({error:'JPEG 格式错误'},400);
        if(mime==='image/webp'&&!(bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP'))return json({error:'WebP 格式错误'},400);
        mediaId=crypto.randomUUID();await store.put('media/'+mediaId,{mime,base64:match[2]});
      }
      const id=crypto.randomUUID();const item={id,title,text,slot:body.slot,phase:body.phase,type:body.type,mediaId,mime,createdAt:new Date().toISOString()};
      await store.put('entries/'+id,item);return json({ok:true,item},201);
    }
    if(path.startsWith('/api/admin/entries/')&&method==='DELETE'){
      const id=path.split('/').pop();if(!/^[\w-]{20,50}$/.test(id))return json({error:'未找到'},404);
      const item=await store.get('entries/'+id);if(!item)return json({error:'未找到'},404);
      await store.delete('entries/'+id);if(item.mediaId)await store.delete('media/'+item.mediaId);return json({ok:true});
    }
    return json({error:'接口不存在'},404);
  }catch(error){return json({error:error.message||'暂时无法保存，请稍后重试'},400)}
}


