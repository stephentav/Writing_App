export const FORMAT = 'writing-room-project';
export const KINDS = ['note', 'source', 'outline', 'task'];
export function blankProject(id = crypto.randomUUID()) {
  return { format: FORMAT, version: 1, id, title: 'My research project', assignment: '', question: '', due: '', next: '', updatedAt: null, records: [] };
}
export function validateProject(value) {
  if (!value || value.format !== FORMAT || value.version !== 1 || typeof value.id !== 'string' || !Array.isArray(value.records)) throw new Error('This is not a supported Writing Room project. Nothing was changed.');
  for (const field of ['title','assignment','question','due','next']) if (typeof value[field] !== 'string') throw new Error('Project data is incomplete. Restore a valid copy before saving.');
  if(value.records.length>2000) throw new Error('This project exceeds the prototype record limit.');
  const ids=new Set();
  for(const r of value.records) {
    if(!r || !KINDS.includes(r.kind) || typeof r.id!=='string' || ids.has(r.id) || typeof r.title!=='string' || typeof r.body!=='string' || typeof r.done!=='boolean') throw new Error('A project record is invalid. Nothing was changed.');
    for(const f of ['source','locator','due']) if(typeof r[f]!=='string') throw new Error('A project record is incomplete.');
    ids.add(r.id);
  }
  return value;
}
export function addRecord(project, record) {
  if (!KINDS.includes(record.kind) || !record.title?.trim()) throw new Error('Give this item a short title.');
  return validateProject({...project, records:[...project.records, {...record, title:record.title.trim(), id:crypto.randomUUID(), done:false}]});
}
export function toggleTask(project, id) {
  return {...project, records:project.records.map(r=>r.id===id && r.kind==='task'?{...r,done:!r.done}:r)};
}
export function nextAction(project) {
  return project.next || project.records.find(r=>r.kind==='task'&&!r.done)?.title || 'Capture one idea from your most recent reading.';
}
export function dateStatus(iso, today = new Date()) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y,m,d]=iso.split('-').map(Number);
  const days=Math.round((Date.UTC(y,m-1,d)-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);
  return days<0?`${Math.abs(days)} day${days===-1?'':'s'} overdue`:days===0?'Due today':`${days} day${days===1?'':'s'} remaining`;
}
export function supported(name) { return /\.(txt|md|pdf|docx)$/i.test(name); }
export function snapshot(project, now=new Date()) {
  validateProject(project);
  return JSON.stringify({...project,updatedAt:now.toISOString()}, null, 2)+'\n';
}
