"use client";

import React from 'react';
import { ClipboardCopy, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { QueueItem, QueueStatus } from '../../hooks/useNewsStore';

interface Props {
  queue: QueueItem[];
  competitors: string;
  onSetStatus: (id: string, status: QueueStatus) => void;
  onRemove: (id: string) => void;
  onEdit: (item: QueueItem) => void;
}

const COLS: { key: QueueStatus; label: string; color: string }[] = [
  { key: 'pending',  label: '⏳ Pending review', color: 'border-t-amber-400' },
  { key: 'approved', label: '✅ Approved',        color: 'border-t-green-400' },
  { key: 'posted',   label: '📤 Posted',          color: 'border-t-blue-400' },
  { key: 'rejected', label: '🚫 Rejected',        color: 'border-t-red-400' },
];

const FORMAT_LABELS: Record<string, string> = { linkedin: '💼 LI', x: '𝕏', blog: '📝 Blog', medium: 'Ⓜ️' };
const MODE_LABELS:   Record<string, string> = { thought: '🧠', promo: '📣', neutral: '🗒' };

function findCompetitors(text: string, competitors: string): string[] {
  const list = competitors.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const lower = (' ' + text + ' ').toLowerCase();
  return list.filter(c => c && lower.includes(c));
}

function timeAgo(ts: number): string {
  const ms = Date.now() - ts;
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return Math.floor(ms / 60000) + 'm ago';
  if (ms < 86400000) return Math.floor(ms / 3600000) + 'h ago';
  return Math.floor(ms / 86400000) + 'd ago';
}

function QueueCard({ item, competitors, onSetStatus, onRemove, onEdit }: {
  item: QueueItem; competitors: string;
  onSetStatus: (id: string, s: QueueStatus) => void;
  onRemove: (id: string) => void;
  onEdit: (i: QueueItem) => void;
}) {
  const flags = item.status === 'pending' ? findCompetitors(item.text, competitors) : [];
  const isFlagged = flags.length > 0;

  const copy = async () => { try { await navigator.clipboard.writeText(item.text); } catch {} };

  return (
    <div className={`bg-white rounded-xl border p-3 text-xs space-y-2 ${isFlagged ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
      {isFlagged && (
        <div className="flex items-center gap-1 text-red-600 font-semibold">
          <AlertTriangle className="w-3 h-3" />
          Mentions: {flags.join(', ')}
        </div>
      )}

      <p className="font-semibold text-slate-700 line-clamp-2">{item.title}</p>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">{FORMAT_LABELS[item.format] || item.format}</span>
        <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold">{MODE_LABELS[item.mode] || item.mode}</span>
        <span className="text-slate-400">{item.source}</span>
        <span className="text-slate-400">{timeAgo(item.createdAt)}</span>
      </div>

      {isFlagged && <p className="text-red-500 italic">Review competitor mentions before approving.</p>}

      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <button onClick={() => onEdit(item)} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center gap-1 transition">
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button onClick={copy} className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center gap-1 transition">
          <ClipboardCopy className="w-3 h-3" /> Copy
        </button>
        {item.status === 'pending' && (<>
          <button onClick={() => onSetStatus(item.id, 'approved')} className="px-2 py-1 rounded-lg bg-green-100 text-green-700 font-semibold hover:bg-green-200 transition">✅ Approve</button>
          <button onClick={() => onSetStatus(item.id, 'rejected')} className="px-2 py-1 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition">🚫 Reject</button>
        </>)}
        {item.status === 'approved' && (<>
          <button onClick={() => onSetStatus(item.id, 'posted')} className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition">📤 Posted</button>
          <button onClick={() => onSetStatus(item.id, 'pending')} className="px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition">↺ Back</button>
        </>)}
        {item.status === 'posted' && (
          <button onClick={() => onSetStatus(item.id, 'approved')} className="px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition">↺ Move back</button>
        )}
        {item.status === 'rejected' && (
          <button onClick={() => onSetStatus(item.id, 'pending')} className="px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition">↺ Re-review</button>
        )}
        <button onClick={() => onRemove(item.id)} className="ml-auto px-2 py-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function ContentQueue({ queue, competitors, onSetStatus, onRemove, onEdit }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLS.map(col => {
        const items = queue.filter(q => q.status === col.key);
        return (
          <div key={col.key} className={`bg-slate-50 rounded-2xl border-t-4 ${col.color} border border-slate-200 p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{col.label}</span>
              <span className="ml-auto text-xs bg-white border border-slate-200 text-slate-500 rounded-full px-2 py-0.5 font-semibold">{items.length}</span>
            </div>
            {items.length === 0
              ? <p className="text-xs text-slate-400 text-center py-6">{col.key === 'pending' ? 'Click ✍️ on any article to draft' : 'Nothing here yet'}</p>
              : <div className="space-y-3">{items.map(item => (
                  <QueueCard key={item.id} item={item} competitors={competitors} onSetStatus={onSetStatus} onRemove={onRemove} onEdit={onEdit} />
                ))}</div>
            }
          </div>
        );
      })}
    </div>
  );
}
