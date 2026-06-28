"use client";

import React from 'react';
import { Article } from '../../lib/types';
import { QueueItem } from '../../hooks/useNewsStore';

interface Props {
  articles: Article[];
  queue: QueueItem[];
  bookmarkCount: number;
  keywordCount: number;
  keywordHits: number;
}

const CAT_COLORS: Record<string, string> = {
  AI: 'bg-purple-500', Launch: 'bg-green-500', Funding: 'bg-amber-500',
  Product: 'bg-blue-500', Security: 'bg-red-500', Other: 'bg-slate-400',
};

const TRUST_SCORES: { name: string; score: number }[] = [
  { name: 'OpenAI Blog',     score: 99 }, { name: 'Anthropic Blog', score: 99 },
  { name: 'Krebs Security',  score: 99 }, { name: 'Ars Technica',   score: 98 },
  { name: 'MIT Tech Review', score: 97 }, { name: 'IEEE Spectrum',  score: 97 },
  { name: 'Bloomberg Tech',  score: 96 }, { name: 'Wired',          score: 94 },
  { name: 'The Verge',       score: 92 }, { name: 'TechCrunch',     score: 90 },
  { name: 'TechCrunch AI',   score: 89 }, { name: 'CNET',           score: 88 },
  { name: 'VentureBeat',     score: 85 }, { name: 'Hacker News',    score: 82 },
  { name: 'Mashable',        score: 80 },
];

const MIX_BUCKET: Record<string, 'curated' | 'original' | 'personal'> = {
  neutral: 'curated', thought: 'original', promo: 'personal',
};
const MIX_TARGET = { curated: 50, original: 30, personal: 20 };
const MIX_COLORS = { curated: 'bg-blue-500', original: 'bg-purple-500', personal: 'bg-green-500' };
const MIX_LABELS = { curated: 'Curated (Neutral)', original: 'Original (Thought-lead.)', personal: 'Personal (Promo)' };

function StatCard({ label, value, sub, color = 'text-slate-800' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard({ articles, queue, bookmarkCount, keywordCount, keywordHits }: Props) {
  const total = articles.length;
  const trendingCount = articles.filter(a => a.isTrending).length;
  const breakingCount = articles.filter(a => a.isBreaking).length;
  const postedItems = queue.filter(q => q.status === 'posted');

  // Category counts
  const CATS = ['AI', 'Launch', 'Funding', 'Security', 'Product', 'Other'];
  const catCounts = Object.fromEntries(CATS.map(c => [c, articles.filter(a => a.cat === c).length]));
  const maxCat = Math.max(...Object.values(catCounts), 1);

  // Source counts (top 7)
  const srcMap: Record<string, number> = {};
  articles.forEach(a => { srcMap[a.source] = (srcMap[a.source] || 0) + 1; });
  const srcTop = Object.entries(srcMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxSrc = Math.max(...srcTop.map(([, c]) => c), 1);

  // 5-3-2 mix
  const mixCounts = { curated: 0, original: 0, personal: 0 };
  postedItems.forEach(q => { const b = MIX_BUCKET[q.mode] || 'curated'; mixCounts[b]++; });
  const mixTotal = postedItems.length;
  const mixPct = (k: keyof typeof mixCounts) => mixTotal ? Math.round(mixCounts[k] / mixTotal * 100) : 0;

  // Mix advice
  let mixAdvice = '';
  if (mixTotal >= 3) {
    const worst = (Object.keys(MIX_TARGET) as (keyof typeof MIX_TARGET)[])
      .sort((a, b) => Math.abs(mixPct(b) - MIX_TARGET[b]) - Math.abs(mixPct(a) - MIX_TARGET[a]))[0];
    if (Math.abs(mixPct(worst) - MIX_TARGET[worst]) > 15) {
      const dir = mixPct(worst) > MIX_TARGET[worst] ? 'too much' : 'not enough';
      mixAdvice = `💡 You're posting ${dir} ${MIX_LABELS[worst]} content — aim for ${MIX_TARGET[worst]}% to balance your feed.`;
    }
  }

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total articles"   value={total}          sub={`from 15 sources`} />
        <StatCard label="🔥 Trending"       value={trendingCount}  color="text-amber-500"  sub={`${total ? Math.round(trendingCount/total*100) : 0}% of feed`} />
        <StatCard label="⚡ Breaking"       value={breakingCount}  color="text-red-500"    sub="last hour" />
        <StatCard label="🔖 Saved"          value={bookmarkCount}  color="text-blue-600" />
        {keywordCount > 0 && <StatCard label="🔔 Keyword alerts" value={keywordHits} sub={`across ${keywordCount} keyword${keywordCount > 1 ? "s" : ""}`} color="text-purple-600" />}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Category chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Articles by Category</h4>
          <div className="space-y-2.5">
            {CATS.filter(c => catCounts[c] > 0).map(c => (
              <div key={c} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-20 shrink-0">{c}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${CAT_COLORS[c]}`} style={{ width: `${Math.round(catCounts[c] / maxCat * 100)}%` }} />
                </div>
                <span className="text-xs text-slate-400 w-5 text-right">{catCounts[c]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Articles by Source</h4>
          <div className="space-y-2.5">
            {srcTop.map(([src, count]) => (
              <div key={src} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-28 shrink-0 truncate">{src}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round(count / maxSrc * 100)}%` }} />
                </div>
                <span className="text-xs text-slate-400 w-5 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5-3-2 content mix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">📐 Content Mix (5-3-2 Rule)</h4>
        <p className="text-xs text-slate-400 mb-4">
          Based on {mixTotal} posted item{mixTotal !== 1 ? 's' : ''} · Ideal: 50% curated / 30% original / 20% personal
        </p>
        {mixTotal === 0
          ? <p className="text-sm text-slate-400 text-center py-4">No posted content yet — mark drafts as "Posted" in the Queue to start tracking.</p>
          : <>
            <div className="flex h-6 rounded-lg overflow-hidden mb-3">
              {(['curated', 'original', 'personal'] as const).map(k => mixCounts[k] > 0 && (
                <div key={k} className={`${MIX_COLORS[k]} flex items-center justify-center text-white text-[10px] font-bold transition-all`} style={{ width: `${mixPct(k)}%` }}>
                  {mixPct(k)}%
                </div>
              ))}
            </div>
            <div className="flex gap-5 text-xs text-slate-500 mb-3">
              {(['curated', 'original', 'personal'] as const).map(k => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-sm ${MIX_COLORS[k]}`} />
                  {MIX_LABELS[k]} — {mixCounts[k]}
                </span>
              ))}
            </div>
            {mixAdvice && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">{mixAdvice}</p>}
          </>
        }
      </div>

      {/* Trust scores */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Source Trust Scores</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {TRUST_SCORES.map(s => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="text-xs text-slate-600 flex-1 truncate">{s.name}</span>
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.score >= 97 ? 'bg-green-500' : s.score >= 88 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${s.score}%` }} />
              </div>
              <span className="text-xs text-slate-400 w-8 text-right">{s.score}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
