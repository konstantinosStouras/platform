import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const root=resolve('.'), types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json'};
http.createServer(async(req,res)=>{
  try {
    let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/marketplace\/?/,'/');
    if(path.endsWith('/')) path+='index.html';
    const file=resolve(root,'.'+path);
    if(!file.startsWith(root+sep)||path.split('/').some(p=>p.startsWith('.'))||!['/index.html','/app.mjs','/style.css','/favicon.svg','/firebase-config.json'].includes(path)&&!path.startsWith('/src/')) throw Error();
    res.writeHead(200,{'Content-Type':types[extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Marketplace Lab: http://127.0.0.1:4173/marketplace/'));
