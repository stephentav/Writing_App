import mammoth from 'mammoth/mammoth.browser.js';
import {blankProject,addRecord,toggleTask,nextAction,dateStatus,supported,blankMilestones,validateMilestones,importMilestones,sourceGroups,validateProject} from './model.mjs';
import {readState,saveApproved,saveRecording,listDocuments,rememberFolder,recallFolder,resolveAttachment} from './storage.mjs';
const $=id=>document.getElementById(id);
let root=null,remembered=null,project=blankProject(),baseline=null,documents=[],proposal=null,editKind=null,editId=null,captureOrigin=false,busy=false,previewURL=null;
let recorder=null,stream=null,audioBlob=null,audioURL=null,audioSaved=false,recordTimer=null,noticeTimer=null;
const prompts={remember:'What is one thing that stayed with you from your reading? Capture it in your own words. Add a page reference if you have one.',stuck:'Make this small: name one thing you already know and one question you still have. That is enough to begin.',writing:'Choose one section. Can you name its point, a source that supports it, and how the evidence connects? If so, try a rough explanation in your own words.'};
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function notify(message,error=false){clearTimeout(noticeTimer);$('status').textContent=message;$('status').classList.toggle('error',error);noticeTimer=setTimeout(()=>$('status').textContent='',error?20000:7000);}
function fail(e){if(e.name==='AbortError')return;notify(e.message||'Something went wrong. Your original documents were not edited.',true);}
function dirty(){return !!$('quick-note').value.trim()||!!proposal||$('editor').open||(audioBlob&&!audioSaved)||recorder?.state==='recording';}
function canLeave(){return !dirty()||confirm('There is unsaved work in this session. Leave it behind and continue?');}
async function guarded(fn){if(busy)return;busy=true;try{await fn();}catch(e){fail(e);}finally{busy=false;}}
function resetSession(){proposal=null;$('quick-note').value='';$('editor').close();$('review').close();discardAudio();closePreview();}
async function loadFolder(handle){
  // Read first, so a rejected or malformed project cannot replace the current one.
  const loaded=await readState(handle);const listed=await listDocuments(handle);
  resetSession();root=handle;project=loaded.project;baseline=loaded.raw;documents=listed;
  $('welcome').hidden=true;$('workspace').hidden=false;
  try{await rememberFolder(handle);}catch{notify('Folder opened. This browser could not remember it; select it again next time.');}
  render();showView('desk');
}
async function choose(){if(!canLeave())return;if(!window.showDirectoryPicker)throw new Error('Open this app in desktop Chrome to select and save to a project folder.');const handle=await window.showDirectoryPicker({mode:'readwrite',id:'writing-room-project'});await loadFolder(handle);}
$('choose').onclick=()=>guarded(choose);$('switch').onclick=()=>guarded(choose);
$('reconnect').onclick=()=>guarded(async()=>{if(!remembered)return;if(await remembered.requestPermission({mode:'readwrite'})!=='granted')throw new Error('Folder access was not granted. You can choose the folder again.');await loadFolder(remembered);});
$('refresh').onclick=()=>guarded(async()=>{if(!canLeave())return;await loadFolder(root);notify('Files and saved project information refreshed.');});
recallFolder().then(handle=>{remembered=handle;if(handle){$('reconnect').hidden=false;$('reconnect').textContent=`Reopen ${handle.name}`;}}).catch(()=>{});
function showView(view){for(const name of ['desk','notes','outline','files'])$('view-'+name).hidden=name!==view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{$('guide').textContent=prompts[b.dataset.prompt];$('quick-note').focus();});
$('help').onclick=()=>$('about').showModal();
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('close-preview').onclick=closePreview;
function closePreview(){if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;$('preview').hidden=true;$('preview-content').replaceChildren();document.querySelector('.workspace-grid').classList.remove('has-preview');}
function render(){
  $('project-title').textContent=project.title||'My research project';$('folder-label').textContent=root.name.toUpperCase();$('next-action').textContent=nextAction(project);
  $('due-label').textContent=project.due?`${dateStatus(project.due)} · ${project.due}`:'No final deadline set';
  $('saved-label').textContent=project.updatedAt?`Saved ${new Date(project.updatedAt).toLocaleString()}`:'Nothing saved yet';
  renderMilestones();
  renderSources();
  renderRecords('outline',project.records.filter(r=>r.kind==='outline'),'Start with one point you want the reader to understand. You can add and reorder sections as your thinking develops.');
  const tasks=$('tasks');tasks.replaceChildren();const items=project.records.filter(r=>r.kind==='task');
  if(!items.length)tasks.append(node('div','Choose one small task for your next work session.','empty'));
  for(const r of items){const card=node('div',undefined,'card task'+(r.done?' done':''));const toggle=node('button',r.done?'✓':'');toggle.setAttribute('aria-label',`${r.done?'Reopen':'Complete'} task: ${r.title}`);toggle.onclick=()=>stage(toggleTask(project,r.id),[{label:r.title,before:r.done?'Completed':'Outstanding',after:r.done?'Outstanding':'Completed'}]);const body=node('div',undefined,'task-content');body.append(node('h3',r.title),node('small',[r.due?`${r.due} · ${dateStatus(r.due)}`:'No date set',r.body].filter(Boolean).join(' — ')));const edit=node('button','Edit','text-button');edit.onclick=()=>openEditor('task',r);card.append(toggle,body,edit);tasks.append(card);}
  const files=$('files');files.replaceChildren();if(!documents.length)files.append(node('div','Add .docx, PDF, .txt, or .md files to your project folder, then select Refresh files.','empty'));
  for(const doc of documents){const b=node('button',undefined,'file-button');const info=node('span',undefined,'file-info');info.append(node('strong',doc.name),node('small',doc.path));b.append(node('span',doc.name.split('.').pop().toUpperCase(),'file-type'),info,node('span','↗'));b.onclick=()=>guarded(()=>preview(doc));files.append(b);}
}
function renderMilestones(){
 const container=$('milestones');container.replaceChildren();
 for(const row of project.milestones||blankMilestones()){
  const details=node('details',undefined,'milestone');const summary=node('summary');summary.append(node('strong',row.label),node('span',row.due?`${row.due} · ${dateStatus(row.due)}`:'Date not set','milestone-date'));details.append(summary);
  const target=node('p',row.target||'Add your target for this stage.','milestone-target');details.append(target);
  const grid=node('div',undefined,'milestone-fields');for(const [key,label] of [['criteria','Specific criteria'],['evidence','Evidence'],['rationale','Rationale']]){const item=node('div');item.append(node('h3',label),node('p',row[key]||'Not filled in yet'));grid.append(item);}details.append(grid);container.append(details);
 }
}
$('edit-milestones').onclick=()=>openEditor('milestones');
$('import-milestones').onclick=()=>{if(proposal)return; $('milestone-file').value='';$('milestone-file').click();};
$('milestone-file').onchange=()=>guarded(async()=>{const file=$('milestone-file').files[0];if(!file)return;if(file.size>250000)throw new Error('Plan file is too large.');const rows=importMilestones(await file.text());stage({...project,milestones:rows},milestoneChanges(rows));});
function milestoneChanges(rows){const prior=project.milestones||blankMilestones();return rows.flatMap((row,i)=>['target','criteria','evidence','rationale','due'].filter(k=>row[k]!==prior[i][k]).map(k=>({label:row.label+' · '+({due:'Target completion date',criteria:'Specific criteria'}[k]||k),before:prior[i][k],after:row[k]})));}
function noteCard(record){
 const card=node('article',undefined,'card nested-note');card.dataset.noteId=record.id;
 const top=node('div',undefined,'section-heading');top.append(node('h3',record.title));const edit=node('button','Edit note','text-button');edit.onclick=()=>openEditor('note',record);top.append(edit);card.append(top,node('pre',record.body));
 if(record.locator||record.source)card.append(node('div',[record.locator&&`Location: ${record.locator}`,record.source&&`Source detail: ${record.source}`].filter(Boolean).join('\n'),'record-meta'));
 if(record.attachments?.length){const attachments=node('div',undefined,'note-attachments');attachments.append(node('span','ATTACHMENTS','kind'));for(const path of record.attachments){const button=node('button','▧ '+path,'attachment-button');button.onclick=()=>guarded(async()=>{try{await preview(await resolveAttachment(root,path));}catch(e){throw new Error('Attachment could not be opened: '+path+'. It may have moved or been removed. Edit this note to choose its new location.');}});attachments.append(button);}card.append(attachments);}
 return card;
}
function renderSources(){
 const container=$('notes');const expanded=new Set([...container.querySelectorAll('details[open]')].map(d=>d.dataset.sourceId));container.replaceChildren();const groups=sourceGroups(project);
 if(!groups.sources.length)container.append(node('div','Add a source, then collect multiple notes inside it. Existing notes can be linked using Edit note.','empty'));
 for(const {source,notes} of groups.sources){
  const group=node('details',undefined,'source-group');group.dataset.sourceId=source.id;group.open=expanded.has(source.id)||groups.sources.length===1;
  const summary=node('summary');summary.append(node('strong',source.title),node('span',`${notes.length} note${notes.length===1?'':'s'}`,'source-count'));group.append(summary);
  const body=node('div',undefined,'source-body');body.append(node('pre',source.body,'source-description'));if(source.source||source.locator)body.append(node('p',[source.source,source.locator].filter(Boolean).join(' · '),'record-meta'));
  const actions=node('div',undefined,'actions');const add=node('button','+ Add note to this source','primary');add.dataset.addNote=source.id;add.onclick=()=>openEditor('note',null,'',source.id);const edit=node('button','Edit source','text-button');edit.onclick=()=>openEditor('source',source);actions.append(add,edit);body.append(actions);
  if(!notes.length)body.append(node('p','No notes yet. Capture a passage, a question, or your interpretation.','muted'));
  for(const record of notes)body.append(noteCard(record));group.append(body);container.append(group);
 }
 if(groups.unassigned.length){const section=node('section',undefined,'unassigned-notes');section.append(node('h3','Notes not linked to a source'),node('p','Choose Edit note to connect these to a source. Your existing source details are preserved.','fine'));for(const record of groups.unassigned)section.append(noteCard(record));container.append(section);}
}
function sourceSelector(selected){
 const wrapper=node('div'),label=node('label','Belongs to source'),select=document.createElement('select');label.htmlFor='field-sourceId';select.id='field-sourceId';select.name='sourceId';const empty=node('option','Not linked yet');empty.value='';select.append(empty);
 for(const r of project.records.filter(r=>r.kind==='source')){const option=node('option',r.title);option.value=r.id;select.append(option);}select.value=selected||'';wrapper.append(label,select);return wrapper;
}
function attachmentSelector(existing=[]){
 const wrapper=node('fieldset',undefined,'attachment-picker');wrapper.append(node('legend','Images & documents'));
 wrapper.append(node('p','Select files already in your project folder. To add a new image or document, put it in that folder first. Only the link is saved; the file is not copied or uploaded.','fine'));
 const list=node('div',undefined,'attachment-options');
 function options(){list.replaceChildren();const paths=[...new Set([...documents.filter(d=>supported(d.name)).map(d=>d.path),...existing])];for(const path of paths){const label=node('label',undefined,'attachment-option'),input=document.createElement('input');input.type='checkbox';input.name='attachments';input.value=path;input.checked=existing.includes(path);label.append(input,node('span',path+(documents.some(d=>d.path===path)?'':' (not found — uncheck to remove)')));list.append(label);}if(!paths.length)list.append(node('p','No supported files found yet.','muted'));}
 options();const refresh=node('button','Refresh attachment choices','text-button');refresh.type='button';refresh.onclick=()=>guarded(async()=>{existing=[...list.querySelectorAll('input:checked')].map(i=>i.value);documents=await listDocuments(root);options();});wrapper.append(list,refresh);return wrapper;
}
function renderRecords(target,records,empty){const container=$(target);container.replaceChildren();if(!records.length)container.append(node('div',empty,'empty'));
  for(const r of records){const card=node('article',undefined,'card');const heading=node('div',undefined,'section-heading');heading.append(node('span',r.kind,'kind'));const edit=node('button','Edit','text-button');edit.onclick=()=>openEditor(r.kind,r);heading.append(edit);card.append(heading,node('h3',r.title),node('pre',r.body));if(r.source||r.locator)card.append(node('div',[r.source&&`Source: ${r.source}`,r.locator&&`Location: ${r.locator}`].filter(Boolean).join('\n'),'record-meta'));
    if(r.kind==='outline'){const order=node('div',undefined,'actions');for(const [label,delta] of [['Move up',-1],['Move down',1]]){const b=node('button',label,'text-button');const index=records.findIndex(x=>x.id===r.id);b.disabled=index+delta<0||index+delta>=records.length;b.onclick=()=>{const all=[...project.records],a=all.findIndex(x=>x.id===r.id),other=records[index+delta],z=all.findIndex(x=>x.id===other.id);[all[a],all[z]]=[all[z],all[a]];stage({...project,records:all},[{label:'Section order',before:records.map(x=>x.title).join('\n'),after:all.filter(x=>x.kind==='outline').map(x=>x.title).join('\n')}]);};order.append(b);}card.append(order);}container.append(card);
  }
}
async function preview(doc){closePreview();$('preview').hidden=false;document.querySelector('.workspace-grid').classList.add('has-preview');$('preview-title').textContent=doc.name;$('preview-meta').textContent='Reading local file…';
  try{const file=await doc.handle.getFile();if(file.size>25*1024*1024)throw new Error('This preview supports files up to 25 MB. Open larger files in their original application.');
    if(!supported(doc.name))throw new Error(doc.name.endsWith('.gdoc')?'This is a Google Docs shortcut. Export the document as .docx or PDF into this folder to preview it.':'Older .doc files are not supported. Save a .docx or PDF copy first.');
    $('preview-meta').textContent=`Read-only · ${Math.round(file.size/1024)} KB · Last modified ${new Date(file.lastModified).toLocaleString()}`;
    if(/\.(png|jpe?g|gif|webp)$/i.test(file.name)){const ext=file.name.split('.').pop().toLowerCase();const type=ext==='jpg'||ext==='jpeg'?'image/jpeg':'image/'+ext;previewURL=URL.createObjectURL(new Blob([await file.arrayBuffer()],{type}));const img=document.createElement('img');img.src=previewURL;img.alt=doc.name;img.className='attachment-image';img.onerror=()=>{$('preview-meta').textContent='This image could not be decoded. Try a PNG or JPEG copy.';};$('preview-content').append(img);}
    else if(/\.pdf$/i.test(file.name)){previewURL=URL.createObjectURL(new Blob([await file.arrayBuffer()],{type:'application/pdf'}));const frame=document.createElement('iframe');frame.title=`PDF preview of ${file.name}`;frame.src=previewURL;$('preview-content').append(frame);}
    else{let text;if(/\.docx$/i.test(file.name)){const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});text=result.value;$('preview-meta').textContent+=' · Text preview; layout and page numbers may differ';}else text=await file.text();if(text.length>250000){text=text.slice(0,250000);$('preview-meta').textContent+=' · Preview limited to first 250,000 characters';}$('preview-content').append(node('pre',text||'No readable text was found.'));}
  }catch(e){$('preview-meta').textContent='Preview unavailable';$('preview-content').append(node('p',e.message,'muted'));}
}
function field(name,label,value='',type='text'){const wrapper=node('div');const input=document.createElement(type==='textarea'?'textarea':'input');input.id='field-'+name;input.name=name;input.value=value;if(type!=='textarea')input.type=type;else input.rows=name==='body'?7:3;input.maxLength=name==='body'?50000:10000;if(name==='title')input.required=true;const l=node('label',label);l.htmlFor=input.id;wrapper.append(l,input);return wrapper;}
function openEditor(kind,record=null,body='',sourceId=''){
  if(proposal){notify('Finish or cancel the current review first.',true);return;}
  editKind=kind;editId=record?.id||null;captureOrigin=!!body;const fields=$('editor-fields');fields.replaceChildren();
  const names={note:'reading note',source:'source record',outline:'outline section',task:'task',plan:'project & plan'};
  $('editor-title').textContent=(record?'Edit ':'Add ')+names[kind];
  if(kind==='milestones'){
    $('editor-title').textContent='Research milestone plan';
    fields.append(node('p','Fill in what you know. Leave uncertain fields blank; no example requirements are added.','fine'));
    (project.milestones||blankMilestones()).forEach((row,i)=>{fields.append(node('h3',row.label,'milestone-editor-title'));for(const [key,label]of [['target','Target — what will I accomplish?'],['criteria','Specific criteria — what measurable requirements?'],['evidence','Evidence — what will I show?'],['rationale','Rationale — why this stage?'],['due','Target completion date']])fields.append(field('m'+i+'_'+key,label,row[key],key==='due'?'date':'textarea'));});
  }else if(kind==='plan'){
    $('editor-title').textContent='Project & plan';for(const [name,label,type]of [['title','Project title','text'],['assignment','Assignment requirements & AI-use rules','textarea'],['question','Research question','textarea'],['due','Final due date','date'],['next','One next step','textarea']])fields.append(field(name,label,project[name],type));
  }else{
    if(kind==='note')fields.append(sourceSelector(record?.sourceId||sourceId));
    fields.append(field('title',kind==='source'?'Source title':'Short title',record?.title||''));
    const labels={note:'Your notes / what I think it means',source:'Author, publication details, and what this source contributes',outline:'My point, how the evidence connects, and what is missing',task:'What finished looks like'};
    fields.append(field('body',labels[kind],record?.body||body,'textarea'));
    if(kind==='task')fields.append(field('due','Planned date',record?.due||'','date'));
    else{fields.append(field('source',kind==='source'?'Local filename or source URL':'Additional source details (optional)',record?.source||''));fields.append(field('locator','Page, chapter, or section (leave unknowns blank)',record?.locator||''));}
  }
  if(kind==='note')fields.append(attachmentSelector(record?.attachments||[]));
  $('editor').showModal();
}
$('edit-plan').onclick=()=>openEditor('plan');for(const kind of ['note','source','outline','task'])$('new-'+kind).onclick=()=>openEditor(kind);
$('capture-note').onclick=()=>{if(!$('quick-note').value.trim()){notify('Start with one rough thought.');$('quick-note').focus();return;}openEditor('note',null,$('quick-note').value);};
$('editor-form').onsubmit=e=>{e.preventDefault();const form=new FormData(e.currentTarget);const data=Object.fromEntries(form);let next,changes=[];
  try{if(editKind==='milestones'){
    const rows=validateMilestones(blankMilestones().map((row,i)=>({...row,...Object.fromEntries(['target','criteria','evidence','rationale','due'].map(k=>[k,data['m'+i+'_'+k]]))})));next={...project,milestones:rows};changes=milestoneChanges(rows);
  }else if(editKind==='plan'){next={...project,...data};for(const [key,label]of [['title','Project title'],['assignment','Assignment'],['question','Research question'],['due','Deadline'],['next','Next step']])if(project[key]!==data[key])changes.push({label,before:project[key],after:data[key]});}
    else{const record={kind:editKind,title:data.title,body:data.body,source:data.source||'',locator:data.locator||'',due:data.due||''};if(editKind==='note'){record.sourceId=data.sourceId||'';record.attachments=form.getAll('attachments');}const old=editId?project.records.find(r=>r.id===editId):null;next=old?{...project,records:project.records.map(r=>r.id===editId?{...r,...record}:r)}:addRecord(project,record);for(const [key,label]of [['title','Title'],['body','Content'],['source','Source'],['locator','Location'],['due','Planned date']])if((old?.[key]||'')!==record[key])changes.push({label,before:old?.[key]||'',after:record[key]});
      if(editKind==='note'){
        const sourceName=id=>project.records.find(r=>r.id===id)?.title||'Not linked';
        if((old?.sourceId||'')!==record.sourceId)changes.push({label:'Belongs to source',before:sourceName(old?.sourceId),after:sourceName(record.sourceId)});
        if(JSON.stringify(old?.attachments||[])!==JSON.stringify(record.attachments))changes.push({label:'Attachment links',before:(old?.attachments||[]).join('\n'),after:record.attachments.join('\n')});
      }
      validateProject(next);
    }
    if(!changes.length){notify('No changes to save.');return;}stage(next,changes,true);
  }catch(e){fail(e);}
};
function stage(next,changes,fromEditor=false){proposal={type:'project',next,changes,fromEditor};$('editor').close();$('review-destination').textContent=`Save to ${root.name}/Writing Room/project.json`;const content=$('review-content');content.replaceChildren();for(const c of changes){content.append(node('h3',c.label));if(c.before)content.append(node('p','Before: '+c.before,'muted'));content.append(node('p','After: '+(c.after||'(blank)')));}$('back-edit').hidden=!fromEditor;$('review').showModal();}
$('back-edit').onclick=()=>{proposal=null;$('review').close();$('editor').showModal();};
$('review').addEventListener('close',()=>{proposal=null;});
$('approve').onclick=()=>guarded(async()=>{if(!proposal)return;const pending=proposal;$('approve').disabled=true;try{
  if(await root.requestPermission({mode:'readwrite'})!=='granted')throw new Error('Write access was not granted. Your changes are still available for review.');
  if(pending.type==='audio'){const path=await saveRecording(root,audioBlob,true);audioSaved=true;$('save-audio').hidden=true;$('record-status').textContent=`Saved locally: ${path}`;notify('Recording saved and verified.');}
  else{
    const write=()=>saveApproved(root,baseline,pending.next,true);
    const saved=navigator.locks?await navigator.locks.request(`writing-room-${project.id}`,write):await write();
    project=saved.project;baseline=saved.raw;if(captureOrigin&&pending.fromEditor){$('quick-note').value='';captureOrigin=false;}render();notify('Saved locally. Your original documents are unchanged.');
  }
  $('review').close();
 }finally{$('approve').disabled=false;}
});
function cleanupStream(){clearTimeout(recordTimer);if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;}
function discardAudio(){if(recorder&&recorder.state==='recording'){recorder.onstop=null;recorder.stop();}cleanupStream();recorder=null;if(audioURL)URL.revokeObjectURL(audioURL);audioURL=null;audioBlob=null;audioSaved=false;$('playback').removeAttribute('src');$('playback').hidden=true;$('audio-panel').hidden=true;$('stop').hidden=true;$('record').disabled=false;}
$('record').onclick=()=>guarded(async()=>{
  if(audioBlob&&!audioSaved&&!confirm('Discard the unsaved recording and start a new one?'))return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Microphone recording is unavailable. Use Chrome and allow microphone access. You can still type notes.');
  discardAudio();try{stream=await navigator.mediaDevices.getUserMedia({audio:true});const type=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>{cleanupStream();$('record').disabled=false;notify('Recording stopped unexpectedly. Try again; no audio was uploaded.',true);};recorder.onstop=()=>{cleanupStream();audioBlob=new Blob(chunks,{type:recorder.mimeType});audioURL=URL.createObjectURL(audioBlob);$('playback').src=audioURL;$('playback').hidden=false;$('stop').hidden=true;$('save-audio').hidden=false;$('discard-audio').hidden=false;$('record').disabled=false;$('record-status').textContent='Recording ready to review. Not saved yet.';$('record-status').classList.remove('recording');};recorder.start(1000);$('audio-panel').hidden=false;$('stop').hidden=false;$('save-audio').hidden=true;$('discard-audio').hidden=true;$('record').disabled=true;$('record-status').textContent='Recording… speak freely. Stops automatically after 3 minutes.';$('record-status').classList.add('recording');recordTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},180000);
  }catch(e){cleanupStream();throw e;}
});
$('stop').onclick=()=>{if(recorder?.state==='recording')recorder.stop();};
$('discard-audio').onclick=()=>{if(audioSaved||confirm('Discard this unsaved recording?'))discardAudio();};
$('save-audio').onclick=()=>{proposal={type:'audio'};$('review-destination').textContent=`Save a new audio file in ${root.name}/Writing Room/recordings/`;$('review-content').replaceChildren(node('p',`Your recording (${Math.round(audioBlob.size/1024)} KB) will be saved as a new file. It will not be transcribed or sent to an AI service.`));$('back-edit').hidden=true;$('review').showModal();};
window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',cleanupStream);
if(!window.showDirectoryPicker){$('choose').disabled=true;notify('Use desktop Chrome to access a local project folder.',true);}
