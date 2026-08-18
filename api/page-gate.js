import fs from 'node:fs/promises';
import path from 'node:path';
import {validGateCookie} from '../src/gate_api.js';

export default async function handler(req,res){
  const p=String(req.query?.path||'');
  if(!['key','key.html','check-key','check-key.html'].includes(p))return res.status(404).send('Not found');
  const request=new Request(`https://${req.headers.host}/${p}`,{method:'GET',headers:req.headers});
  if(!(await validGateCookie(request,process.env)))return res.redirect(302,'/');
  const file=p.startsWith('key')?'key-clean.html':'check-key.html';
  try{const body=await fs.readFile(path.join(process.cwd(),'public',file));res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');return res.status(200).send(body)}catch{return res.status(404).send('Not found')}}
