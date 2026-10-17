import fs from 'node:fs/promises';
const names=['index.html','deliver.html','style.css','v3.css','app.js','v3.js','admin.css','admin.js','playlist.js'];
await fs.mkdir('public',{recursive:true});
for(const name of names)await fs.copyFile('web/'+name,'public/'+name);
await fs.cp('web/gugu-assets','public/gugu-assets',{recursive:true});
console.log('Vercel public assets ready; server code and local data are excluded.');
