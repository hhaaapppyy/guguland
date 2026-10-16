const room=document.querySelector('.room'),panel=document.querySelector('#panel'),content=document.querySelector('#panel-content');
const key='gugu-room-positions-v1';let positions={};try{positions=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
const phrases={morning:'早晨，光慢慢落进来',day:'午后，窗边暖暖的',evening:'傍晚，小灯亮起来了',night:'夜深了，小灯还亮着'};
function phaseAt(h){return h>=5&&h<11?'morning':h>=11&&h<17?'day':h>=17&&h<22?'evening':'night'}
function time(){let phase=phaseAt(new Date().getHours());document.body.dataset.phase=phase;document.querySelector('#period').textContent=phrases[phase]}
time();setInterval(time,60000);
function save(){try{localStorage.setItem(key,JSON.stringify(positions))}catch{}}
const clamp=(v,max)=>Math.min(Math.max(v,0),max);
function move(el,x,y){const b=room.getBoundingClientRect();x=clamp(x,100-el.offsetWidth/b.width*100);y=clamp(y,100-el.offsetHeight/b.height*100);el.style.left=x+'%';el.style.top=y+'%';positions[el.dataset.item]={x,y}}
function apply(){document.querySelectorAll('.movable').forEach(el=>{const p=positions[el.dataset.item];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))move(el,p.x,p.y)})}
apply();window.addEventListener('resize',apply);
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
let pocket=['🍬','✿','☆','🍃'];
function react(el,belly){if(el.dataset.item==="gugu"&&belly&&window.dropDelivery?.())return;if(el.dataset.item==='gugu'){if(belly){if(!pocket.length)return;const i=Math.floor(random()*pocket.length),obj=document.querySelector('#pocket-object');obj.textContent=pocket.splice(i,1)[0];obj.style.left=(parseFloat(el.style.left)||el.offsetLeft/room.clientWidth*100)+10+'%';obj.style.top=(el.offsetTop+el.offsetHeight*.8)/room.clientHeight*100+'%';obj.classList.remove('drop');void obj.offsetWidth;obj.classList.add('drop');return}if(random()<.33)return}el.classList.remove('reaction');void el.offsetWidth;el.classList.add('reaction');setTimeout(()=>el.classList.remove('reaction'),1900)}
document.querySelectorAll('.movable').forEach(el=>{let drag=null;el.addEventListener('pointerdown',e=>{if(e.button!==0||room.classList.contains('hand-mode'))return;const r=room.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,l:el.offsetLeft/r.width*100,t:el.offsetTop/r.height*100,moved:false,belly:e.target.classList.contains('belly-hit')};el.setPointerCapture(e.pointerId)});el.addEventListener('pointermove',e=>{if(!drag)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)drag.moved=true;if(drag.moved){const r=room.getBoundingClientRect();move(el,drag.l+dx/r.width*100,drag.t+dy/r.height*100)}});el.addEventListener('pointerup',()=>{if(!drag)return;if(drag.moved)save();else react(el,drag.belly);drag=null});el.addEventListener('pointercancel',()=>{drag=null;save()});el.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();move(el,el.offsetLeft/room.clientWidth*100+d[0],el.offsetTop/room.clientHeight*100+d[1]);save()}else if(e.key==='Enter'||e.key===' '){e.preventDefault();react(el,e.shiftKey)}})});
function show(title,text,note='',art=''){content.replaceChildren();if(art){const a=document.createElement('div');a.className='card-art';a.textContent=art;content.append(a)}const h=document.createElement('h2'),p=document.createElement('p'),s=document.createElement('small');h.textContent=title;p.textContent=text;s.textContent=note;content.append(h,p,s);panel.showModal()}
document.querySelector('.close').onclick=()=>panel.close();panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)panel.close()}});
document.querySelectorAll('[data-delivery]').forEach(b=>b.onclick=()=>{window.openSlot?.(b.dataset.delivery)});
document.querySelector('#about').onclick=()=>show('只是一个小房间','咕咕住在这里。窗外的光跟着这台设备的时间变化。房间里的东西，可以随意摆放。','摆放只保存在这个浏览器里，不上传。没有访问分析，也没有已读。');
document.querySelector('#help').onclick=()=>show('房间里的东西','咕咕、猫、狗和绿色小摆件都可以拖动。碰一碰咕咕，或轻轻点它的肚子。窗台上的卡片、小盒子也可以打开。','键盘：Tab 选择，方向键移动；Enter 轻碰咕咕，Shift + Enter 打开口袋。');
document.querySelector('#reset').onclick=()=>{positions={};try{localStorage.removeItem(key)}catch{}document.querySelectorAll('.movable').forEach(el=>{el.style.left='';el.style.top=''})};

