import test from 'node:test';import assert from 'node:assert/strict';
import {blankProject,validateProject,addRecord,toggleTask,dateStatus,nextAction} from '../src/model.mjs';
import {saveApproved,readState,saveRecording} from '../src/storage.mjs';
class Directory {
 constructor(){this.children=new Map();}
 async getDirectoryHandle(name,{create=false}={}){if(!this.children.has(name)){if(!create)throw Object.assign(new Error('Missing'),{name:'NotFoundError'});this.children.set(name,new Directory());}return this.children.get(name);}
 async getFileHandle(name,{create=false}={}){if(!this.children.has(name)){if(!create)throw Object.assign(new Error('Missing'),{name:'NotFoundError'});this.children.set(name,new FileHandle());}return this.children.get(name);}
}
class FileHandle{data='';async getFile(){return new Blob([this.data]);}async createWritable(){let staged;return {write:async v=>{staged=v;},close:async()=>{this.data=staged;},abort:async()=>{}};}}
const record={kind:'note',title:'Observation',body:'My own idea',source:'Book',locator:'p. 7',due:''};
test('notes retain student text without changing the prior state',()=>{const p=blankProject();const n=addRecord(p,record);assert.equal(p.records.length,0);assert.equal(n.records[0].body,record.body);});
test('unknown or malformed project format is rejected',()=>{assert.throws(()=>validateProject({records:[]}));assert.throws(()=>validateProject({...blankProject(),records:[{kind:'draft'}]}));});
test('only tasks can be marked complete',()=>{const p=addRecord(blankProject(),record);assert.equal(toggleTask(p,p.records[0].id).records[0].done,false);});
test('next step uses explicit plan, then unfinished task',()=>{const p=addRecord(blankProject(),{...record,kind:'task'});assert.equal(nextAction(p),'Observation');assert.equal(nextAction({...p,next:'Compare passages'}),'Compare passages');});
test('dates compare calendar days without DST drift',()=>{assert.equal(dateStatus('2026-11-06',new Date(2026,10,6,23)),'Due today');assert.equal(dateStatus('2026-11-05',new Date(2026,10,6)),'1 day overdue');});
test('save requires approval and creates no files when declined',async()=>{const root=new Directory();await assert.rejects(saveApproved(root,null,blankProject()),/approve/i);assert.equal(root.children.size,0);});
test('approved save verifies exact content and roundtrips',async()=>{const root=new Directory();const p=addRecord(blankProject(),record);const s=await saveApproved(root,null,p,true);assert.deepEqual((await readState(root)).project,s.project);assert.equal(root.children.size,1);assert.equal(root.children.get('Writing Room').children.size,1);});
test('conflicting external change is preserved',async()=>{const root=new Directory();const first=await saveApproved(root,null,blankProject(),true);const newer=await saveApproved(root,first.raw,{...first.project,next:'External update'},true);await assert.rejects(saveApproved(root,first.raw,{...first.project,next:'Stale'},true),/changed outside/);assert.equal((await readState(root)).raw,newer.raw);});
test('prior snapshot is backed up before replacement',async()=>{const root=new Directory();const first=await saveApproved(root,null,blankProject(),true);await saveApproved(root,first.raw,{...first.project,next:'New task'},true);const history=root.children.get('Writing Room').children.get('history');assert.equal(history.children.size,1);assert.equal(await (await [...history.children.values()][0].getFile()).text(),first.raw);});
test('audio requires separate approval and never writes a draft',async()=>{const root=new Directory();const blob=new Blob(['audio'],{type:'audio/webm'});await assert.rejects(saveRecording(root,blob),/Approve/);const path=await saveRecording(root,blob,true);assert.match(path,/^Writing Room\/recordings\/idea-.*\.webm$/);assert.equal(root.children.size,1);});

import {blankMilestones,importMilestones} from '../src/model.mjs';
test('milestone import preserves supplied text and leaves unknowns blank',()=>{const rows=blankMilestones();rows[0].target='Student wording';const result=importMilestones(JSON.stringify({milestones:rows}));assert.equal(result[0].target,'Student wording');assert.equal(result[1].criteria,'');assert.equal(result[0].due,'');});
test('legacy projects remain valid; malformed milestone data cannot be saved',()=>{assert.doesNotThrow(()=>validateProject(blankProject()));assert.throws(()=>validateProject({...blankProject(),milestones:[{}]}));});

import {sourceGroups,validateAttachmentPath} from '../src/model.mjs';
import {resolveAttachment} from '../src/storage.mjs';
test('multiple notes share a stable source link across source renaming',()=>{
 let p=addRecord(blankProject(),{...record,kind:'source',title:'Book'});const sourceId=p.records[0].id;
 p=addRecord(p,{...record,sourceId,attachments:['images/page.png']});p=addRecord(p,{...record,title:'Second note',sourceId});p=addRecord(p,{...record,title:'Legacy free note'});
 p.records[0].title='Renamed book';const groups=sourceGroups(validateProject(p));assert.equal(groups.sources[0].notes.length,2);assert.equal(groups.sources[0].source.title,'Renamed book');assert.equal(groups.unassigned.length,1);
});
test('dangling source IDs and unsafe attachment paths are rejected',()=>{
 assert.throws(()=>addRecord(blankProject(),{...record,sourceId:'missing'}));
 for(const path of ['../secret.txt','/outside.png','Writing Room/project.json','images/../../x.png','image.svg','a\\b.png','https://example.com/pic.png'])assert.throws(()=>validateAttachmentPath(path));
 assert.equal(validateAttachmentPath('reading/chapter 1.pdf'),'reading/chapter 1.pdf');
});
test('attachment links roundtrip without copying or modifying the target file',async()=>{
 const root=new Directory();const images=await root.getDirectoryHandle('images',{create:true});const file=await images.getFileHandle('page.png',{create:true});file.data='original image';
 const p=addRecord(blankProject(),{...record,attachments:['images/page.png']});const saved=await saveApproved(root,null,p,true);
 assert.equal(saved.project.records[0].attachments[0],'images/page.png');assert.equal(file.data,'original image');assert.equal((await resolveAttachment(root,'images/page.png')).handle,file);
 await assert.rejects(resolveAttachment(root,'images/missing.png'));await assert.rejects(resolveAttachment(root,'../outside.png'));
});
