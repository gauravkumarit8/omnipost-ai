import { CompanyProfile, DraftFormat, DraftMode } from '../hooks/useNewsStore';
import { Article } from './types';

export const LIMITS: Record<DraftFormat, number> = { linkedin: 3000, x: 280, blog: 100000, medium: 100000 };
export const SWEET_SPOT: Record<DraftFormat, [number, number]> = {
  linkedin: [1200, 1500], x: [70, 200], blog: [600, 1200], medium: [800, 1600],
};

const GENERIC_PHRASES = [
  "in today's fast-paced world", "in this day and age", "game changer", "game-changer",
  "it is important to note", "needless to say", "at the end of the day", "in conclusion",
  "unlock the power of", "take it to the next level", "in the ever-evolving", "paradigm shift",
  "synergy", "leverage the power of", "dive deep into", "let's dive in",
  "without further ado", "in a nutshell", "the future is here", "revolutionize the way",
  "disrupt the industry",
];

const BAIT_PHRASES = [
  'agree or disagree', 'like if you agree', 'comment if you disagree',
  'tag someone', 'rt if', 'retweet if',
];

function hashtagsFor(cat: string, max: number): string {
  const map: Record<string, string[]> = {
    AI: ['#AI', '#ArtificialIntelligence', '#MachineLearning'],
    Launch: ['#ProductLaunch', '#Tech', '#Innovation'],
    Funding: ['#Funding', '#Startups', '#VentureCapital'],
    Security: ['#Cybersecurity', '#InfoSec'],
    Product: ['#TechNews', '#ProductUpdate'],
    Other: ['#Tech', '#TechNews'],
  };
  return (map[cat] || map.Other).slice(0, max).join(' ');
}

function reasonFor(cat: string): string {
  return {
    AI: 'AI development keeps accelerating — worth tracking how this shapes the tools we use daily.',
    Launch: 'New launches like this shift what is possible for builders and users alike.',
    Funding: 'Funding signals where smart money thinks the next wave is heading.',
    Security: 'Security stories like this are a good reminder to revisit your own defenses.',
    Product: 'Incremental as it seems, updates like this compound into real shifts in what users expect.',
  }[cat] || 'Worth keeping an eye on as the space evolves.';
}

function firstTalkingPoint(profile: CompanyProfile): string | null {
  const lines = profile.talking.split('\n').map(s => s.trim()).filter(Boolean);
  return lines.length ? lines[Math.floor(Math.random() * lines.length)] : null;
}

// Rotates between different opening hooks so template regen feels fresh each click
const HOOK_INTROS = [
  '',                              // default — use description hook
  'The headline buries the lead: ',
  'Worth paying attention to: ',
  'This one caught my eye — ',
  "Here's why this matters: ",
  'Spotted this and had to share: ',
];
let _hookRotation = 0;
function getHookIntro(): string {
  const intro = HOOK_INTROS[_hookRotation % HOOK_INTROS.length];
  _hookRotation++;
  return intro;
}

export function generateDraft(article: Article, format: DraftFormat, mode: DraftMode, profile: CompanyProfile): string {
  const title = article.title.trim();
  const desc = (article.description || '').trim();
  const src = article.source;
  const link = article.url;
  const hookIntro = getHookIntro();
  const rawHook = desc ? desc.split(/(?<=[.!?])\s/)[0] : title;
  const hook = hookIntro ? hookIntro + rawHook.charAt(0).toLowerCase() + rawHook.slice(1) : rawHook;
  const reason = reasonFor(article.cat);
  const tp = firstTalkingPoint(profile);
  const { company, product, name } = profile;

  function midSection(): string {
    if (mode === 'promo') {
      if (!company) return `At [Your Company], this is exactly the kind of shift we think about when building [your product].`;
      return `At ${company}, this is the kind of shift we watch closely${product ? ` while building ${product}` : ''}.${tp ? ` ${tp}` : ''}`;
    }
    if (mode === 'neutral') return `For context: ${reason}`;
    return `Why this matters: ${reason}${tp ? `\n\nOne thing I keep coming back to: ${tp}` : ''}`;
  }

  const signOff = name ? `\n\n— ${name}${company ? `, ${company}` : ''}` : '';

  if (format === 'linkedin') {
    const tags = hashtagsFor(article.cat, 4);
    const cta = mode === 'promo'
      ? `Curious how this lines up with what you're seeing at your own company — happy to compare notes.`
      : mode === 'neutral' ? `Sharing in case it's useful context for your own week.`
      : `Genuinely curious how others are reading this — what am I missing?`;
    return `${title}\n\n${hook}\n\n${midSection()}\n\n${cta}${signOff}\n\n🔗 Full story linked in the first comment — keeping this post link-free for reach.\n\n${tags}`;
  }

  if (format === 'x') {
    const tags = hashtagsFor(article.cat, 1);
    const prefix = mode === 'promo' && company ? `${company} take: ` : '';
    const tail = mode === 'neutral' ? `(link below 👇)` : `What's the actual implication here?`;
    const room = 270 - prefix.length - tail.length - tags.length - 6;
    const short = title.length > room ? title.slice(0, room - 1) + '…' : title;
    return `${prefix}${short}\n\n${tail}\n\n${tags}\n\n[Reply with the source link after posting — keeps this post link-free for reach]`;
  }

  if (format === 'blog') {
    const whyBody = mode === 'promo'
      ? `${midSection()} ${tp ? '' : 'Add specifics on how this connects to your roadmap or customers.'}`
      : mode === 'neutral' ? `${reason} [Add supporting detail or data here.]`
      : `${reason} Add your own analysis and perspective here.`;
    return `# ${title}\n\n*Originally reported by [${src}](${link})*\n\n## What happened\n\n${desc || 'Summarize the key facts here.'}\n\n## Why it matters\n\n${whyBody}\n\n## My take\n\n${mode === 'promo' ? `[Tie this back to ${product || 'your product'} and what it means for your customers.]` : '[Add your opinion, prediction, or call-to-action here.]'}\n\n---\n*Read the original: ${link}*${signOff}`;
  }

  if (format === 'medium') {
    const angle3 = mode === 'promo'
      ? (product ? `How this affects roadmap decisions for ${product}` : 'What this means for our product roadmap')
      : mode === 'neutral' ? 'What happens next, based on available facts'
      : 'What you think happens next, and why';
    return `${title}\n${'─'.repeat(Math.min(title.length, 40))}\n\n${hook}\n\nI came across this on ${src} and it's worth more than a passing share — here's why.\n\n## The situation\n\n${desc}\n[Add 2-3 more sentences of real context — Medium rewards depth over quick takes.]\n\n## ${mode === 'promo' ? "Why we're watching this" : 'Why this matters more than it looks'}\n\n${midSection()}\n\n## What I think happens next\n\n- [Add your first observation, with reasoning]\n- [Add your second observation, with reasoning]\n- ${angle3} — [expand this into 2-3 sentences]\n\nOriginally covered by ${src} → ${link}${signOff}`;
  }
  return '';
}

// ── Voice-match checker ──────────────────────────────────────────────────
export interface VoiceFlag { type: 'warn' | 'good'; msg: string; }
export interface VoiceResult { score: number; flags: VoiceFlag[]; }

export function voiceMatchCheck(text: string, profile: CompanyProfile): VoiceResult {
  const flags: VoiceFlag[] = [];
  let score = 100;
  const lower = text.toLowerCase();

  const hits = GENERIC_PHRASES.filter(p => lower.includes(p));
  if (hits.length) {
    score -= hits.length * 12;
    flags.push({ type: 'warn', msg: `Generic phrase${hits.length > 1 ? 's' : ''} found: "${hits[0]}"${hits.length > 1 ? ` +${hits.length - 1} more` : ''}` });
  }

  const placeholders = text.match(/\[[^\]]+\]/g);
  if (placeholders?.length) {
    score -= placeholders.length * 15;
    flags.push({ type: 'warn', msg: `${placeholders.length} placeholder${placeholders.length > 1 ? 's' : ''} still unfilled — e.g. ${placeholders[0]}` });
  }

  const tp = profile.talking.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
  const usesTalkingPoint = tp.some(p => p.length > 6 && lower.includes(p.slice(0, Math.min(20, p.length))));
  const hasFirstPerson = /\b(i|i've|i'm|my|we've|our)\b/i.test(text);
  if (!usesTalkingPoint && !hasFirstPerson) {
    score -= 15;
    flags.push({ type: 'warn', msg: 'No personal voice or talking point — reads like a press summary' });
  } else if (usesTalkingPoint) {
    flags.push({ type: 'good', msg: 'Includes one of your saved talking points' });
  }

  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 3);
  if (sentences.length >= 3) {
    const lens = sentences.map(s => s.split(/\s+/).length);
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    const variance = lens.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lens.length;
    if (variance < 3) {
      score -= 8;
      flags.push({ type: 'warn', msg: 'Uniform sentence lengths — vary short and long for a more natural voice' });
    }
  }

  if (/\?/.test(text)) flags.push({ type: 'good', msg: 'Includes a question — tends to drive more comments' });

  return { score: Math.max(0, Math.min(100, score)), flags };
}

// ── Pre-post checklist ───────────────────────────────────────────────────
export interface CheckItem { pass: boolean; label: string; }

export function runChecklist(text: string, format: DraftFormat): CheckItem[] {
  const len = text.length;
  const hasLink = /https?:\/\//.test(
    text.replace(/\[Reply with the source link[^\]]*\]/i, '').replace(/🔗.*comment/i, '')
  );
  const hashtagCount = (text.match(/#\w+/g) || []).length;
  const hasBait = BAIT_PHRASES.some(p => text.toLowerCase().includes(p));
  const hasQuestion = /\?/.test(text);

  if (format === 'linkedin') {
    const [lo, hi] = SWEET_SPOT.linkedin;
    return [
      { pass: !hasLink, label: hasLink ? 'Link in post body — move it to the first comment (reduces reach)' : 'No link in post body ✓ — put it in the first comment' },
      { pass: len >= lo && len <= hi, label: len < lo ? `Too short (${len} chars) — aim for ${lo}–${hi}` : len > hi ? `Too long (${len} chars) — trim toward ${lo}–${hi}` : `Length ${len} chars is in the sweet spot ✓` },
      { pass: hashtagCount >= 1 && hashtagCount <= 5, label: hashtagCount > 5 ? `${hashtagCount} hashtags — trim to 3-5` : hashtagCount === 0 ? 'No hashtags — add 3-5 for topic categorization' : `${hashtagCount} hashtags is within the 3-5 range ✓` },
      { pass: !hasBait, label: hasBait ? 'Engagement-bait phrasing detected — actively suppressed by LinkedIn' : 'No engagement-bait phrasing ✓' },
      { pass: hasQuestion, label: hasQuestion ? 'Has a genuine question ✓ — drives real comments' : 'No question — add one to invite replies' },
    ];
  }

  if (format === 'x') {
    return [
      { pass: !hasLink, label: hasLink ? 'Link in main post — move to a reply (30-50% reach loss)' : 'No link in main post ✓ — post it as a reply' },
      { pass: hashtagCount <= 2, label: hashtagCount > 2 ? `${hashtagCount} hashtags — trim to 1-2 (X penalizes 3+)` : `${hashtagCount} hashtag(s) within safe range ✓` },
      { pass: !hasBait, label: hasBait ? 'Engagement-bait — flagged by spam filters' : 'No engagement-bait ✓' },
      { pass: hasQuestion, label: hasQuestion ? 'Has a question ✓ — replies are weighted ~27x more than likes' : 'No question — replies rank far better than passive posts' },
    ];
  }

  if (format === 'medium') {
    const wordCount = text.split(/\s+/).length;
    const placeholders = (text.match(/\[[^\]]+\]/g) || []).length;
    return [
      { pass: wordCount >= 300, label: wordCount < 300 ? `Only ~${wordCount} words — Medium favors depth; thin summaries underperform` : `~${wordCount} words — enough depth for distribution ✓` },
      { pass: placeholders <= 1, label: placeholders > 1 ? `${placeholders} unfilled sections — fill these in before publishing` : 'Placeholders mostly filled ✓' },
    ];
  }

  // blog
  const wordCount = text.split(/\s+/).length;
  return [
    { pass: wordCount >= 150, label: wordCount < 150 ? `Short at ~${wordCount} words — add more substance` : `~${wordCount} words ✓` },
  ];
}

// ── Competitor detection ─────────────────────────────────────────────────
export function findCompetitorMentions(text: string, competitors: string): string[] {
  const list = competitors.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const lower = (' ' + text + ' ').toLowerCase();
  return list.filter(c => c && lower.includes(c));
}