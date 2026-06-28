"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  X, RotateCcw, ClipboardCopy, CalendarPlus,
  Check, AlertTriangle, Sparkles, Loader2, ExternalLink,
} from 'lucide-react';
import { Article } from '../../lib/types';
import { CompanyProfile, DraftFormat, DraftMode, QueueItem } from '../../hooks/useNewsStore';
import { generateDraft, voiceMatchCheck, runChecklist, findCompetitorMentions, LIMITS } from '../../lib/draftEngine';

interface Props {
  article: Article;
  profile: CompanyProfile;
  onClose: () => void;
  onAddToQueue: (item: Omit<QueueItem, 'id' | 'createdAt' | 'status'>) => void;
}

const FORMAT_LABELS: Record<DraftFormat, string> = {
  linkedin: '💼 LinkedIn', x: '𝕏 X / Twitter', blog: '📝 Blog', medium: 'Ⓜ️ Medium',
};
const MODE_LABELS: Record<DraftMode, string> = {
  thought: '🧠 Thought-leadership', promo: '📣 Company-promotional', neutral: '🗒 Neutral',
};
const MIX_BUCKET: Record<DraftMode, string> = {
  thought: 'Original (30% target)', neutral: 'Curated (50% target)', promo: 'Personal (20% target)',
};

// ── Platform constraints used in AI prompt ────────────────────────────────
const FORMAT_RULES: Record<DraftFormat, string> = {
  linkedin: `LinkedIn best practices (June 2026):
- DO NOT include any raw URL/link in the post body — tell the user to put it in the first comment
- Length: 1,200–1,500 characters sweet spot
- Use 3–5 hashtags at the end
- End with a genuine open question (not "agree or disagree?" bait — that is penalised)
- Write in first-person professional voice`,

  x: `X / Twitter best practices (June 2026):
- DO NOT include any URL/link in the tweet body — add a note to post the link as the first reply
- Max 280 characters for the main tweet
- Use 1–2 hashtags only (3+ are penalised)
- End with a short genuine question
- Keep it punchy and direct`,

  blog: `Blog post best practices:
- Include the source link (links in blog posts are fine)
- Use markdown headers: # Title, ## Section
- Sections: What happened / Why it matters / My take
- 400–800 words of real substance
- End with a clear call to action or prediction`,

  medium: `Medium article best practices (June 2026):
- Medium rewards original, in-depth analysis — NOT thin curated summaries
- 600+ words minimum for distribution
- Use markdown headers
- Sections: The situation / Why this matters more than it looks / What I think happens next
- Include the source link at the bottom
- Write in a personal, analytical voice`,
};

// ── AI regeneration via Anthropic API ────────────────────────────────────
async function generateWithAI(
  article: Article,
  format: DraftFormat,
  mode: DraftMode,
  profile: CompanyProfile,
  currentDraft: string,
): Promise<string> {
  const modeInstructions: Record<DraftMode, string> = {
    thought: 'Write as a thought-leader sharing a genuine personal opinion and insight. Include a bold take or prediction.',
    promo: `Write as ${profile.name || 'a CEO'} at ${profile.company || 'their company'}. Naturally tie the news back to ${profile.product || 'your product/company'} without being salesy.${profile.talking ? `\n\nPersonal talking points to weave in naturally (pick the most relevant one):\n${profile.talking}` : ''}`,
    neutral: 'Write as an informed professional sharing useful context. Neutral tone — no strong opinion, just useful framing.',
  };

  const systemPrompt = `You are an expert social media ghostwriter for C-level executives. You write posts that sound genuinely human, not AI-generated.

CRITICAL RULES:
1. Never use clichés like "game-changer", "in today's fast-paced world", "paradigm shift", "unlock the power of", "dive deep", "revolutionize"
2. Never use engagement bait like "agree or disagree?", "like if you agree", "tag someone"
3. Vary sentence lengths — short punchy sentences mixed with longer analytical ones
4. Write in first person where appropriate
5. ${FORMAT_RULES[format]}

VOICE MODE: ${modeInstructions[mode]}

Return ONLY the post text. No explanations, no preamble, no markdown code blocks.`;

  const userPrompt = `Article to write about:
Title: ${article.title}
Source: ${article.source}
Summary: ${article.description}
URL: ${article.url}
Category: ${article.cat}

${currentDraft ? `Here is the current template draft (rewrite it significantly — don't just rephrase):\n${currentDraft}` : 'Write a fresh post about this article.'}

Write a ${format} post in ${mode} mode. Follow all platform rules exactly.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text;
  if (!content) throw new Error('Empty response from AI');
  return content.trim();
}

// ── Component ─────────────────────────────────────────────────────────────
export default function DraftModal({ article, profile, onClose, onAddToQueue }: Props) {
  const [format, setFormat] = useState<DraftFormat>('linkedin');
  const [mode, setMode] = useState<DraftMode>('thought');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [repurposeSent, setRepurposeSent] = useState(false);
  // Track generation count so plain regen always produces a different result
  const regenCountRef = useRef(0);

  // Generate template draft whenever format/mode changes
  useEffect(() => {
    setText(generateDraft(article, format, mode, profile));
    setAiError('');
  }, [article, format, mode, profile]);

  // ── Template regenerate (rotates hooks / talking points) ──────────────
  const templateRegen = () => {
    regenCountRef.current += 1;
    // Temporarily override firstTalkingPoint randomness by calling generateDraft again
    // (it picks a random talking point each call, so it'll differ on re-call)
    const newText = generateDraft(article, format, mode, profile);
    setText(newText);
    setAiError('');
  };

  // ── AI regenerate ──────────────────────────────────────────────────────
  const aiRegen = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const result = await generateWithAI(article, format, mode, profile, text);
      setText(result);
    } catch (err: any) {
      setAiError(err.message || 'AI regeneration failed — try again');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Send to Repurpose editor ───────────────────────────────────────────
  const sendToRepurpose = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setRepurposeSent(true);
      // Small delay so the user sees the confirmation before navigating
      setTimeout(() => {
        window.location.href = '/?source=discover&format=' + format;
      }, 800);
    } catch {
      // Clipboard failed — navigate anyway, editor will show empty
      window.location.href = '/?source=discover&format=' + format;
    }
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ── Add to queue ──────────────────────────────────────────────────────
  const addToQueue = () => {
    onAddToQueue({
      articleId: article.id, title: article.title,
      link: article.url, source: article.source,
      format, mode, text,
    });
    onClose();
  };

  // ── Derived values ────────────────────────────────────────────────────
  const voice = voiceMatchCheck(text, profile);
  const checklist = runChecklist(text, format);
  const competitorHits = findCompetitorMentions(text, profile.competitors);
  const charCount = text.length;
  const overLimit = format === 'x' && charCount > LIMITS.x;
  const checksPassed = checklist.filter(c => c.pass).length;

  const voiceColor = voice.score >= 75 ? 'bg-green-500' : voice.score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const voiceTextColor = voice.score >= 75 ? 'text-green-600' : voice.score >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreColor = checksPassed === checklist.length
    ? 'text-green-600' : checksPassed >= checklist.length / 2 ? 'text-amber-600' : 'text-red-600';

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-bold text-slate-800">✍️ Draft a post</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
              {article.source} · {article.title.slice(0, 60)}{article.title.length > 60 ? '…' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Format tabs ── */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Platform</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(FORMAT_LABELS) as DraftFormat[]).map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition
                    ${format === f ? 'bg-blue-50 text-blue-600 border-blue-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* ── Mode tabs ── */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Voice mode</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(MODE_LABELS) as DraftMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition
                    ${mode === m ? 'bg-purple-50 text-purple-600 border-purple-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              📐 Counts as "{MIX_BUCKET[mode]}" in your 5-3-2 content mix
            </p>
          </div>

          {/* ── Competitor warning ── */}
          {competitorHits.length > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Competitor mention{competitorHits.length > 1 ? 's' : ''}:</strong>{' '}
                {competitorHits.join(', ')} — review wording before approving
              </span>
            </div>
          )}

          {/* ── Textarea ── */}
          <div className="relative">
            {aiLoading && (
              <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI is writing…
                </div>
              </div>
            )}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={10}
              disabled={aiLoading}
              className="w-full text-sm border border-slate-200 rounded-xl p-3 font-mono resize-y focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50 disabled:opacity-60"
            />
          </div>

          {/* ── Char count + AI error ── */}
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>{charCount} characters</span>
            {overLimit && (
              <span className="text-red-500 font-semibold">⚠ {charCount - LIMITS.x} over X's 280 limit</span>
            )}
          </div>
          {aiError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
              ⚠ {aiError}
            </div>
          )}

          {/* ── Regenerate buttons ── */}
          <div className="flex gap-2">
            <button
              onClick={templateRegen}
              disabled={aiLoading}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Regenerate (template)
            </button>
            <button
              onClick={aiRegen}
              disabled={aiLoading}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition font-semibold disabled:opacity-40"
            >
              {aiLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing…</>
                : <><Sparkles className="w-3.5 h-3.5" /> Rewrite with AI</>}
            </button>
          </div>

          {/* ── Voice-match meter ── */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">🎙 Sounds like you</span>
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${voiceColor}`}
                  style={{ width: `${voice.score}%` }}
                />
              </div>
              <span className={`text-xs font-bold w-9 text-right ${voiceTextColor}`}>{voice.score}%</span>
            </div>
            <div className="space-y-1">
              {voice.flags.map((f, i) => (
                <div key={i} className={`flex items-start gap-1.5 text-xs ${f.type === 'good' ? 'text-green-600' : 'text-amber-600'}`}>
                  <span className="mt-0.5 flex-shrink-0">{f.type === 'good' ? '✓' : '⚠'}</span>
                  <span>{f.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Pre-post checklist ── */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">✅ Pre-post checklist</span>
              <span className={`text-xs font-bold ${scoreColor}`}>{checksPassed}/{checklist.length}</span>
            </div>
            <div className="space-y-1.5">
              {checklist.map((c, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs ${c.pass ? 'text-slate-600' : 'text-amber-700'}`}>
                  <span className={`flex-shrink-0 mt-0.5 ${c.pass ? 'text-green-500' : 'text-amber-500'}`}>
                    {c.pass ? '✓' : '⚠'}
                  </span>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="border-t pt-4 space-y-2">
            {/* Primary row */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={addToQueue}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                <CalendarPlus className="w-3.5 h-3.5" /> Add to Queue
              </button>
              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold transition
                  ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                  : <><ClipboardCopy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>

            {/* Repurpose editor CTA */}
            <button
              onClick={sendToRepurpose}
              className={`w-full flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold border-2 transition
                ${repurposeSent
                  ? 'bg-green-50 border-green-400 text-green-700'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent hover:opacity-90'}`}
            >
              {repurposeSent
                ? <><Check className="w-4 h-4" /> Copied! Opening editor…</>
                : <><ExternalLink className="w-4 h-4" /> Open in Repurpose Editor</>}
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              Copies this draft to clipboard and opens your editor — paste it in to refine further
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}