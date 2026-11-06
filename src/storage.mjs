import {blankProject, validateProject, snapshot} from './model.mjs';
export const APP_DIR='Writing Room';
export const STATE_FILE='project.json';
async function child(directory,name) {
  try{return await directory.getDirectoryHandle(name);}catch(e){if(e.name==='NotFoundError')return null;throw e;}
}
export async function readState(root) {
  const dir=await child(root,APP_DIR);if(!dir)return {project:blankProject(),raw:null};
  try{
    const f=await (await dir.getFileHandle(STATE_FILE)).getFile();
    if(f.size>5_000_000)throw new Error('Project file exceeds 5 MB. Nothing was changed.');
    const raw=await f.text();return {project:validateProject(JSON.parse(raw)),raw};
  }catch(e){if(e.name==='NotFoundError')return {project:blankProject(),raw:null};throw e;}
}
export async function saveApproved(root, expectedRaw, proposed, approved=false) {
  if(!approved)throw new Error('Review and approve before saving.');
  validateProject(proposed);
  const current=await readState(root);
  if(current.raw!==expectedRaw)throw new Error('Project changed outside this window. Your proposed update is still here. Cancel, refresh the folder, then reapply it.');
  const dir=await root.getDirectoryHandle(APP_DIR,{create:true});
  const raw=snapshot(proposed);
  // Retain an exact recovery copy before replacing a prior snapshot.
  if(current.raw!==null){
    const backups=await dir.getDirectoryHandle('history',{create:true});
    const file=await backups.getFileHandle(`${Date.now()}-${crypto.randomUUID()}.json`,{create:true});
    const w=await file.createWritable();try{await w.write(current.raw);await w.close();}catch(e){await w.abort().catch(()=>{});throw e;}
  }
  const handle=await dir.getFileHandle(STATE_FILE,{create:true});
  const writer=await handle.createWritable();
  try{await writer.write(raw);await writer.close();}catch(e){await writer.abort().catch(()=>{});throw e;}
  const verified=await (await handle.getFile()).text();
  if(verified!==raw)throw new Error('Save could not be verified. Refresh the folder before continuing.');
  return {raw,project:validateProject(JSON.parse(raw))};
}
export async function saveRecording(root, blob, approved=false) {
  if(!approved)throw new Error('Approve before saving audio.');
  if(!blob || !blob.size)throw new Error('There is no recording to save.');
  const dir=await root.getDirectoryHandle(APP_DIR,{create:true});
  const recordings=await dir.getDirectoryHandle('recordings',{create:true});
  const ext=blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':'webm';
  const name=`idea-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID().slice(0,8)}.${ext}`;
  const handle=await recordings.getFileHandle(name,{create:true});const w=await handle.createWritable();
  try{await w.write(blob);await w.close();}catch(e){await w.abort().catch(()=>{});throw e;}
  if((await handle.getFile()).size!==blob.size)throw new Error('Audio save could not be verified.');
  return `${APP_DIR}/recordings/${name}`;
}
export async function listDocuments(root) {
  const results=[];let visited=0;
  async function walk(dir,prefix='',depth=0){
    if(depth>8)return;
    for await(const [name,handle]of dir.entries()){
      if(++visited>3000)throw new Error('This folder is too large. Choose a folder for one assignment.');
      if(name.startsWith('.') || name===APP_DIR || name==='node_modules')continue;
      const path=prefix+name;
      if(handle.kind==='directory')await walk(handle,path+'/',depth+1);
      else if(/\.(txt|md|pdf|docx|gdoc|doc)$/i.test(name))results.push({name,path,handle});
    }
  }
  await walk(root);return results.sort((a,b)=>a.path.localeCompare(b.path));
}
export async function rememberFolder(handle) {
  const db=await openDB();
  await new Promise((resolve,reject)=>{const tx=db.transaction('handles','readwrite');tx.objectStore('handles').put(handle,'last');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
}
export async function recallFolder(){const db=await openDB();try{return await new Promise((resolve,reject)=>{const req=db.transaction('handles').objectStore('handles').get('last');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}finally{db.close();}}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('writing-room',1);req.onupgradeneeded=()=>req.result.createObjectStore('handles');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
