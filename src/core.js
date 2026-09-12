export const emptyNotes = () => ({ decisions: [], actions: [], questions: [] });
export function createSession(context, mode = 'live') {
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), context,
    mode, status: 'ready', segments: [], notes: emptyNotes(), warning: '', analyzedThrough: 0 };
}
export function parseNotes(raw, segments) {
  const text = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid notes object');
  const ids = new Set(segments.map(s => s.id));
  const out = emptyNotes();
  for (const key of Object.keys(out)) {
    if (data[key] === undefined) continue;
    if (!Array.isArray(data[key]) || data[key].length > 20) throw Error('Invalid note list');
    out[key] = data[key].map(n => {
      if (!n || typeof n.text !== 'string' || !n.text.trim() || n.text.length > 800) throw Error('Invalid note text');
      if (!Array.isArray(n.evidence) || !n.evidence.length || n.evidence.length > 12 || n.evidence.some(id => !ids.has(id))) throw Error('Invalid note evidence');
      const optional = value => typeof value === 'string' && value.trim() ? value.trim().slice(0,120) : null;
      return { text: n.text.trim(), evidence: [...new Set(n.evidence)], owner: optional(n.owner), due: optional(n.due) };
    });
  }
  return out;
}
export function mergeNotes(previous, next) {
  return Object.fromEntries(Object.keys(emptyNotes()).map(key => {
    const map = new Map();
    for (const n of [...previous[key], ...next[key]]) {
      const id = n.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
      const existing = map.get(id);
      map.set(id, existing ? { ...n, evidence: [...new Set([...existing.evidence,...n.evidence])] } : n);
    }
    return [key, [...map.values()]];
  }));
}
export function timestamp(seconds) {
  return `${Math.floor(seconds / 60).toString().padStart(2,'0')}:${Math.floor(seconds % 60).toString().padStart(2,'0')}`;
}
export function markdown(s) {
  const lines = [`# ${s.context.title}`, '', s.mode === 'demo' ? 'Sample replay — fixture transcript and notes, no AI inference.' : 'Local inference — review notes against the transcript.', `Source: ${s.context.domain}`, `Created: ${s.createdAt}`, ''];
  for (const [key, title] of [['decisions','Decisions'],['actions','Action Items'],['questions','Open Questions']]) {
    lines.push(`## ${title}`);
    for (const n of s.notes[key]) lines.push(`- ${n.text}${key === 'actions' ? ` (Owner: ${n.owner ?? 'Unknown'}; Due: ${n.due ?? 'Unknown'})` : ''} [segments ${n.evidence.join(', ')}]`);
    if (!s.notes[key].length) lines.push('None captured.');
    lines.push('');
  }
  lines.push('## Transcript');
  for (const x of s.segments) lines.push(`[${timestamp(x.start)}] #${x.id} ${x.text}`);
  if (s.warning) lines.push('',`Capture note: ${s.warning}`);
  return lines.join('\n');
}
export class Chunker {
  constructor(size) { this.size = size; this.pending = new Float32Array(size); this.used = 0; }
  push(samples) {
    const chunks = []; let offset = 0;
    while (offset < samples.length) {
      const take = Math.min(this.size-this.used, samples.length-offset);
      this.pending.set(samples.subarray(offset,offset+take),this.used);
      offset += take; this.used += take;
      if (this.used === this.size) { chunks.push(this.pending); this.pending = new Float32Array(this.size); this.used = 0; }
    }
    return chunks;
  }
  flush() { if (!this.used) return null; const tail=this.pending.slice(0,this.used); this.used=0; return tail; }
}
