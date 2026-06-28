"use client";

import React, { useState } from 'react';
import { FileSearch, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Article } from '../../lib/types';
import { ExtractedDrafts } from '../../app/api/extract/route';

interface Props {
  article: Article;
}

type ExtractState = 'idle' | 'fetching' | 'generating' | 'done' | 'error';

// Maps draft platform → the platform id the Repurpose editor tab uses
const FORMAT_MAP: Record<keyof Omit<ExtractedDrafts, 'summary'>, string> = {
  linkedin: 'linkedin',
  x:        'twitter',
  blog:     'medium',
  medium:   'medium',
};

export default function ArticleExtractor({ article }: Props) {
  const [state, setState] = useState<ExtractState>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const handleExtract = async () => {
    if (state === 'fetching' || state === 'generating') return;

    setState('fetching');
    setError('');
    setProgress('Fetching article…');

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: article.url,
          title: article.title,
          source: article.source,
        }),
      });

      setState('generating');
      setProgress('Generating drafts with AI…');

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      const drafts: ExtractedDrafts = data.drafts;

      // Build a rich content block to send to the Repurpose editor.
      // We send the LinkedIn draft as the "master content" since it's the most
      // detailed, and the editor will repurpose it to all other platforms.
      // The full article summary is prepended so the editor has full context.
      const masterContent = [
        `📰 Article: ${article.title}`,
        `Source: ${article.source} — ${article.url}`,
        '',
        `SUMMARY:`,
        drafts.summary,
        '',
        '---',
        '',
        `LINKEDIN DRAFT:`,
        drafts.linkedin,
        '',
        '---',
        '',
        `X / TWITTER DRAFT:`,
        drafts.x,
        '',
        '---',
        '',
        `BLOG DRAFT:`,
        drafts.blog,
      ].join('\n');

      // Write master content to clipboard
      await navigator.clipboard.writeText(masterContent);

      setState('done');
      setProgress('Done! Opening editor…');

      // Navigate to the Repurpose editor with source flag
      // The editor reads source=discover and auto-pastes from clipboard
      setTimeout(() => {
        window.location.href = '/?source=discover&format=linkedin&extracted=true';
      }, 700);

    } catch (err: any) {
      setState('error');
      setError(err.message || 'Something went wrong');
    }
  };

  // ── Button states ─────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={() => { setState('idle'); setError(''); }}
          className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition"
          title={error}
        >
          <AlertTriangle className="w-3 h-3" />
          Failed — retry
        </button>
        {error && (
          <p className="text-[10px] text-red-400 max-w-[160px] leading-tight">{error}</p>
        )}
      </div>
    );
  }

  if (state === 'done') {
    return (
      <button className="flex items-center gap-1 text-[11px] font-semibold text-green-600 px-2.5 py-1.5 rounded-lg bg-green-50 cursor-default">
        <CheckCircle className="w-3 h-3" />
        Opening editor…
      </button>
    );
  }

  if (state === 'fetching' || state === 'generating') {
    return (
      <div className="flex flex-col gap-0.5">
        <button
          disabled
          className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 px-2.5 py-1.5 rounded-lg bg-blue-50 cursor-not-allowed opacity-80"
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          {state === 'fetching' ? 'Fetching…' : 'Generating…'}
        </button>
        <p className="text-[9px] text-slate-400 px-1">{progress}</p>
      </div>
    );
  }

  // Idle state — default button
  return (
    <button
      onClick={handleExtract}
      title="Extract full article and generate AI drafts for all platforms"
      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition border border-emerald-200 hover:border-emerald-300"
    >
      <FileSearch className="w-3 h-3" />
      Extract &amp; Draft
    </button>
  );
}